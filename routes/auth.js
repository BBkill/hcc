const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { authMiddleware, signToken } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

// POST /api/v1/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Thiếu tên đăng nhập hoặc mật khẩu', details: [] }
      });
    }
    const [users] = await db.query(
      'SELECT id, username, password_hash, role, is_active FROM users WHERE username = ? AND deleted_at IS NULL',
      [username.trim()]
    );
    if (!users.length) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Tên đăng nhập hoặc mật khẩu không đúng' }
      });
    }
    const user = users[0];
    if (!user.is_active) {
      return res.status(403).json({
        error: { code: 'ACCOUNT_PENDING', message: 'Tài khoản đang chờ duyệt. Vui lòng liên hệ quản trị viên.' }
      });
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Tên đăng nhập hoặc mật khẩu không đúng' }
      });
    }
    await db.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);
    const token = signToken({ userId: user.id, role: user.role });
    auditLog(req, 'AUTH_LOGIN', 'USER', user.id, null, { username: user.username });
    res.json({
      access_token: token,
      token_type: 'Bearer',
      expires_in: 7 * 24 * 3600,
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/register - Chỉ đăng ký role CITIZEN, trạng thái chờ duyệt (is_active=0)
router.post('/register', async (req, res, next) => {
  try {
    const { username, password, full_name, national_id, phone, email } = req.body;
    if (!username || !password || !full_name || !national_id) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Thiếu thông tin bắt buộc: username, password, full_name, national_id',
          details: []
        }
      });
    }
    if (password.length < 6) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Mật khẩu tối thiểu 6 ký tự', details: [] }
      });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [userInsert] = await conn.query(
        'INSERT INTO users (username, password_hash, role, is_active) VALUES (?, ?, ?, 0)',
        [username.trim(), password_hash, 'CITIZEN']
      );
      const userId = userInsert.insertId;
      await conn.query(
        `INSERT INTO citizens (user_id, full_name, national_id, email, phone) VALUES (?, ?, ?, ?, ?)`,
        [userId, full_name.trim(), national_id.trim(), email ? email.trim() : null, phone ? phone.trim() : null]
      );
      await conn.commit();
      res.status(201).json({
        message: 'Đăng ký thành công. Tài khoản của bạn đang chờ quản trị viên duyệt.',
        user: { id: userId, username: username.trim(), role: 'CITIZEN' }
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
        error: { code: 'CONFLICT', message: 'Tên đăng nhập hoặc số CCCD đã tồn tại' }
      });
    }
    next(err);
  }
});

// GET /api/v1/auth/me - Thông tin user đang đăng nhập
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
