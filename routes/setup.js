const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');

// GET /api/v1/setup/check - Kiểm tra đã có admin chưa (không cần auth)
router.get('/check', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      "SELECT 1 FROM users WHERE role = 'ADMIN' AND (deleted_at IS NULL) LIMIT 1"
    );
    res.json({ hasAdmin: rows.length > 0 });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/setup/create-admin - Tạo tài khoản admin lần đầu (chỉ khi chưa có admin)
router.post('/create-admin', async (req, res, next) => {
  try {
    const [existing] = await db.query(
      "SELECT id FROM users WHERE role = 'ADMIN' AND (deleted_at IS NULL) LIMIT 1"
    );
    if (existing.length > 0) {
      return res.status(403).json({
        error: { code: 'ADMIN_EXISTS', message: 'Đã tồn tại tài khoản quản trị' }
      });
    }
    const { username, password, full_name } = req.body;
    if (!username || !password || !full_name) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Thiếu username, password hoặc full_name',
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
    const [result] = await db.query(
      'INSERT INTO users (username, password_hash, role, is_active) VALUES (?, ?, ?, 1)',
      [username.trim(), password_hash, 'ADMIN']
    );
    res.status(201).json({
      user: {
        id: result.insertId,
        username: username.trim(),
        role: 'ADMIN',
        full_name: full_name.trim()
      }
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: { code: 'CONFLICT', message: 'Tên đăng nhập đã tồn tại' }
      });
    }
    next(err);
  }
});

module.exports = router;
