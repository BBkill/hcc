const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { authMiddleware, requireRoles, signToken } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

router.use(authMiddleware);
router.use(requireRoles('ADMIN'));

// GET /api/v1/admin/pending-accounts - Danh sách tài khoản công dân chờ duyệt
router.get('/pending-accounts', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.username, u.created_at, c.full_name, c.national_id, c.email, c.phone
       FROM users u
       INNER JOIN citizens c ON c.user_id = u.id
       WHERE u.role = 'CITIZEN' AND u.is_active = 0 AND u.deleted_at IS NULL
       ORDER BY u.created_at DESC`
    );
    res.json({ items: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/admin/pending-accounts/:id/approve
router.post('/pending-accounts/:id/approve', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [users] = await db.query(
      "SELECT id FROM users WHERE id = ? AND role = 'CITIZEN' AND is_active = 0 AND deleted_at IS NULL",
      [id]
    );
    if (!users.length) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Không tìm thấy tài khoản chờ duyệt' }
      });
    }
    await db.query('UPDATE users SET is_active = 1 WHERE id = ?', [id]);
    auditLog(req, 'ACCOUNT_APPROVED', 'USER', id);
    res.json({ message: 'Đã duyệt tài khoản', user_id: id });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/admin/pending-accounts/:id/reject
router.post('/pending-accounts/:id/reject', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [users] = await db.query(
      "SELECT id FROM users WHERE id = ? AND role = 'CITIZEN' AND is_active = 0 AND deleted_at IS NULL",
      [id]
    );
    if (!users.length) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Không tìm thấy tài khoản chờ duyệt' }
      });
    }
    await db.query('UPDATE users SET deleted_at = NOW() WHERE id = ?', [id]);
    await db.query('UPDATE citizens SET deleted_at = NOW() WHERE user_id = ?', [id]);
    auditLog(req, 'ACCOUNT_REJECTED', 'USER', id);
    res.json({ message: 'Đã từ chối tài khoản', user_id: id });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/admin/users - Tạo tài khoản OFFICIAL hoặc REPORT_ADMIN (chỉ admin)
router.post('/users', async (req, res, next) => {
  try {
    const { username, password, role, full_name, agency_id, department_id, employee_code, position_title } = req.body;
    if (!username || !password || !role || !full_name) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Thiếu username, password, role hoặc full_name',
          details: []
        }
      });
    }
    if (!['OFFICIAL', 'REPORT_ADMIN'].includes(role)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'role phải là OFFICIAL hoặc REPORT_ADMIN', details: [] }
      });
    }
    if (password.length < 6) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Mật khẩu tối thiểu 6 ký tự', details: [] }
      });
    }
    if (role === 'OFFICIAL' && !agency_id) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Cán bộ cần chọn agency_id', details: [] }
      });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [userInsert] = await conn.query(
        'INSERT INTO users (username, password_hash, role, is_active) VALUES (?, ?, ?, 1)',
        [username.trim(), password_hash, role]
      );
      const userId = userInsert.insertId;
      if (role === 'OFFICIAL') {
        await conn.query(
          `INSERT INTO officials (user_id, agency_id, department_id, full_name, employee_code, position_title)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [userId, agency_id, department_id || null, full_name.trim(), employee_code || null, position_title || null]
        );
      }
      await conn.commit();
      auditLog(req, 'USER_CREATED', 'USER', userId, null, { role, username: username.trim() });
      res.status(201).json({
        user: { id: userId, username: username.trim(), role },
        message: 'Tạo tài khoản thành công'
      });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: { code: 'CONFLICT', message: 'Tên đăng nhập đã tồn tại' }
      });
    }
    next(err);
  }
});

// GET /api/v1/admin/agencies - Danh sách cơ quan (cho form tạo cán bộ)
router.get('/agencies', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT id, agency_code, name, level FROM agencies WHERE deleted_at IS NULL ORDER BY name'
    );
    res.json({ items: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/admin/departments?agency_id=
router.get('/departments', async (req, res, next) => {
  try {
    const agencyId = req.query.agency_id;
    if (!agencyId) {
      return res.json({ items: [] });
    }
    const [rows] = await db.query(
      'SELECT id, dept_code, name FROM departments WHERE agency_id = ? AND deleted_at IS NULL ORDER BY name',
      [agencyId]
    );
    res.json({ items: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
