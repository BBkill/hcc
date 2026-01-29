const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, requireRoles } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

router.use(authMiddleware);

// Lấy citizen_id từ user (CITIZEN)
async function getCitizenId(userId) {
  const [rows] = await db.query(
    'SELECT id FROM citizens WHERE user_id = ? AND deleted_at IS NULL',
    [userId]
  );
  return rows.length ? rows[0].id : null;
}

// POST /api/v1/dossiers - Nộp hồ sơ (chỉ CITIZEN)
router.post('/', requireRoles('CITIZEN'), async (req, res, next) => {
  try {
    const citizenId = await getCitizenId(req.user.id);
    if (!citizenId) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Không tìm thấy hồ sơ công dân' }
      });
    }
    const { service_id, subject, form_data } = req.body;
    if (!service_id) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Thiếu service_id', details: [] }
      });
    }

    const [services] = await db.query(
      'SELECT id, agency_id FROM administrative_services WHERE id = ? AND deleted_at IS NULL AND is_active = 1',
      [service_id]
    );
    if (!services.length) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Không tìm thấy dịch vụ' }
      });
    }
    const service = services[0];

    const [statusRows] = await db.query(
      "SELECT id FROM dossier_statuses WHERE status_code = 'SUBMITTED' LIMIT 1"
    );
    const statusId = statusRows.length ? statusRows[0].id : 1;

    const [maxCode] = await db.query(
      "SELECT dossier_code FROM dossiers WHERE dossier_code LIKE CONCAT('HS-', YEAR(NOW()), '-%') ORDER BY id DESC LIMIT 1"
    );
    let nextNum = 1;
    if (maxCode.length) {
      const last = maxCode[0].dossier_code;
      const num = parseInt(last.split('-').pop(), 10);
      if (!isNaN(num)) nextNum = num + 1;
    }
    const dossierCode = `HS-${new Date().getFullYear()}-${String(nextNum).padStart(8, '0')}`;
    const submittedAt = new Date();

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [ins] = await conn.query(
        `INSERT INTO dossiers (dossier_code, citizen_id, service_id, agency_id, current_status_id, subject, form_data_json, submitted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dossierCode,
          citizenId,
          service_id,
          service.agency_id,
          statusId,
          subject || null,
          form_data ? JSON.stringify(form_data) : null,
          submittedAt
        ]
      );
      const dossierId = ins.insertId;
      await conn.query(
        `INSERT INTO dossier_histories (dossier_id, actor_user_id, action, to_status_id, note) VALUES (?, ?, 'SUBMIT', ?, 'Công dân nộp hồ sơ')`,
        [dossierId, req.user.id, statusId]
      );
      await conn.commit();
      auditLog(req, 'DOSSIER_SUBMIT', 'DOSSIER', dossierId, dossierId, { dossier_code: dossierCode });
      res.status(201).json({
        dossier: {
          id: dossierId,
          dossier_code: dossierCode,
          service_id: Number(service_id),
          current_status: 'SUBMITTED',
          submitted_at: submittedAt
        }
      });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/dossiers - Danh sách hồ sơ của tôi (CITIZEN)
router.get('/', requireRoles('CITIZEN'), async (req, res, next) => {
  try {
    const citizenId = await getCitizenId(req.user.id);
    if (!citizenId) {
      return res.json({ items: [], page: 1, page_size: 20, total: 0 });
    }
    const status = req.query.status;
    const from = req.query.from;
    const to = req.query.to;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.page_size, 10) || 20));
    const offset = (page - 1) * pageSize;

    let where = 'd.citizen_id = ? AND d.deleted_at IS NULL';
    const params = [citizenId];
    if (status) {
      where += ' AND ds.status_code = ?';
      params.push(status);
    }
    if (from) {
      where += ' AND d.submitted_at >= ?';
      params.push(from);
    }
    if (to) {
      where += ' AND d.submitted_at <= ?';
      params.push(to + ' 23:59:59');
    }

    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM dossiers d
       JOIN dossier_statuses ds ON ds.id = d.current_status_id
       WHERE ${where}`,
      params
    );
    const total = countResult[0].total;
    params.push(pageSize, offset);

    const [rows] = await db.query(
      `SELECT d.dossier_code, d.subject, d.submitted_at, d.updated_at,
              ds.status_code as current_status, ds.name as status_name,
              s.name as service_name
       FROM dossiers d
       JOIN dossier_statuses ds ON ds.id = d.current_status_id
       JOIN administrative_services s ON s.id = d.service_id
       WHERE ${where}
       ORDER BY d.submitted_at DESC
       LIMIT ? OFFSET ?`,
      params
    );

    res.json({ items: rows, page, page_size: pageSize, total });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/dossiers/:code - Chi tiết hồ sơ theo mã (CITIZEN: chỉ hồ sơ của mình)
router.get('/:code', requireRoles('CITIZEN'), async (req, res, next) => {
  try {
    const citizenId = await getCitizenId(req.user.id);
    if (!citizenId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Không tìm thấy hồ sơ công dân' } });
    }
    const [rows] = await db.query(
      `SELECT d.dossier_code, d.subject, d.form_data_json, d.submitted_at, d.received_at, d.due_at, d.completed_at,
              ds.status_code as current_status, ds.name as status_name,
              s.id as service_id, s.name as service_name,
              a.id as agency_id, a.name as agency_name
       FROM dossiers d
       JOIN dossier_statuses ds ON ds.id = d.current_status_id
       JOIN administrative_services s ON s.id = d.service_id
       JOIN agencies a ON a.id = d.agency_id
       WHERE d.dossier_code = ? AND d.citizen_id = ? AND d.deleted_at IS NULL`,
      [req.params.code, citizenId]
    );
    if (!rows.length) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy hồ sơ' } });
    }
    const row = rows[0];
    const result = {
      dossier_code: row.dossier_code,
      service: { id: row.service_id, name: row.service_name },
      agency: { id: row.agency_id, name: row.agency_name },
      current_status: row.current_status,
      status_name: row.status_name,
      subject: row.subject,
      submitted_at: row.submitted_at,
      received_at: row.received_at,
      due_at: row.due_at,
      completed_at: row.completed_at,
      form_data: row.form_data_json ? (typeof row.form_data_json === 'string' ? JSON.parse(row.form_data_json) : row.form_data_json) : null,
      attachments: []
    };
    const [attachments] = await db.query(
      'SELECT id, file_name, created_at FROM attachments WHERE dossier_id = (SELECT id FROM dossiers WHERE dossier_code = ?) AND is_deleted = 0',
      [req.params.code]
    );
    result.attachments = attachments;
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/dossiers/:code/histories - Lịch sử xử lý (CITIZEN)
router.get('/:code/histories', requireRoles('CITIZEN'), async (req, res, next) => {
  try {
    const citizenId = await getCitizenId(req.user.id);
    if (!citizenId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Không tìm thấy hồ sơ công dân' } });
    }
    const [dossiers] = await db.query(
      'SELECT id FROM dossiers WHERE dossier_code = ? AND citizen_id = ? AND deleted_at IS NULL',
      [req.params.code, citizenId]
    );
    if (!dossiers.length) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy hồ sơ' } });
    }
    const dossierId = dossiers[0].id;
    const [rows] = await db.query(
      `SELECT dh.action, dh.note, dh.created_at,
              fs.status_code as from_status, ts.status_code as to_status
       FROM dossier_histories dh
       LEFT JOIN dossier_statuses fs ON fs.id = dh.from_status_id
       LEFT JOIN dossier_statuses ts ON ts.id = dh.to_status_id
       WHERE dh.dossier_id = ?
       ORDER BY dh.created_at ASC`,
      [dossierId]
    );
    res.json({
      dossier_code: req.params.code,
      histories: rows.map(r => ({
        action: r.action,
        from_status: r.from_status,
        to_status: r.to_status,
        note: r.note,
        created_at: r.created_at
      }))
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
