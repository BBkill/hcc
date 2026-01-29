const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'dvc-secret-key-change-in-production';

function signToken(payload, expiresIn = '7d') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.cookies?.token;
  if (!token) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Chưa đăng nhập' }
    });
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({
      error: { code: 'INVALID_TOKEN', message: 'Token không hợp lệ hoặc đã hết hạn' }
    });
  }
  const [rows] = await db.query(
    'SELECT id, username, role, is_active, deleted_at FROM users WHERE id = ?',
    [decoded.userId]
  );
  if (!rows.length || rows[0].deleted_at || !rows[0].is_active) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Tài khoản không tồn tại hoặc đã bị khóa' }
    });
  }
  req.user = rows[0];
  next();
}

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Chưa đăng nhập' } });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Không có quyền thực hiện thao tác này' }
      });
    }
    next();
  };
}

module.exports = {
  JWT_SECRET,
  signToken,
  verifyToken,
  authMiddleware,
  requireRoles
};
