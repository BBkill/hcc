const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/v1/services?keyword=&agency_id=&page=1&page_size=20
router.get('/', async (req, res, next) => {
  try {
    const keyword = (req.query.keyword || '').trim();
    const agencyId = req.query.agency_id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.page_size, 10) || 20));
    const offset = (page - 1) * pageSize;

    let where = 's.deleted_at IS NULL AND s.is_active = 1';
    const params = [];
    if (keyword) {
      where += ' AND (s.name LIKE ? OR s.service_code LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (agencyId) {
      where += ' AND s.agency_id = ?';
      params.push(agencyId);
    }

    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM administrative_services s WHERE ${where}`,
      params
    );
    const total = countResult[0].total;

    params.push(pageSize, offset);
    const [rows] = await db.query(
      `SELECT s.id, s.service_code, s.name, s.description, s.processing_days, s.fee_amount, s.agency_id,
              a.name as agency_name
       FROM administrative_services s
       LEFT JOIN agencies a ON a.id = s.agency_id AND a.deleted_at IS NULL
       WHERE ${where}
       ORDER BY s.name
       LIMIT ? OFFSET ?`,
      params
    );

    res.json({ items: rows, page, page_size: pageSize, total });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/services/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await db.query(
      `SELECT s.id, s.service_code, s.name, s.description, s.processing_days, s.fee_amount, s.agency_id,
              a.name as agency_name, a.address as agency_address, a.phone as agency_phone
       FROM administrative_services s
       LEFT JOIN agencies a ON a.id = s.agency_id AND a.deleted_at IS NULL
       WHERE s.id = ? AND s.deleted_at IS NULL`,
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy dịch vụ' } });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
