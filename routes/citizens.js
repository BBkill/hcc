const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, requireRoles } = require('../middleware/auth');

router.use(authMiddleware);
router.use(requireRoles('CITIZEN'));

// GET /api/v1/citizens/me
router.get('/me', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT c.id, c.full_name, c.date_of_birth, c.gender, c.national_id, c.email, c.phone,
              c.permanent_address, c.current_address
       FROM citizens c
       WHERE c.user_id = ? AND c.deleted_at IS NULL`,
      [req.user.id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy hồ sơ công dân' } });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/citizens/me
router.put('/me', async (req, res, next) => {
  try {
    const { phone, email, current_address, permanent_address } = req.body;
    const [result] = await db.query(
      `UPDATE citizens SET
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        current_address = COALESCE(?, current_address),
        permanent_address = COALESCE(?, permanent_address),
        updated_at = NOW()
       WHERE user_id = ? AND deleted_at IS NULL`,
      [phone, email, current_address, permanent_address, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy hồ sơ công dân' } });
    }
    const [rows] = await db.query(
      `SELECT id, full_name, national_id, email, phone, permanent_address, current_address
       FROM citizens WHERE user_id = ?`,
      [req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
