const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, requireRoles } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

router.use(authMiddleware);
router.use(requireRoles('OFFICIAL'));

// Lấy official (agency_id) của cán bộ
async function getOfficialAgency(userId) {
  const [rows] = await db.query(
    'SELECT id, agency_id FROM officials WHERE user_id = ? AND deleted_at IS NULL',
    [userId]
  );
  return rows.length ? rows[0] : null;
}

// GET /api/v1/official/dossiers?status=&agency_id=&page=&page_size=
router.get('/dossiers', async (req, res, next) => {
  try {
    const official = await getOfficialAgency(req.user.id);
    if (!official) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Không tìm thấy thông tin cán bộ' }
      });
    }
    const status = req.query.status;
    const agencyId = req.query.agency_id || official.agency_id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.page_size, 10) || 50));
    const offset = (page - 1) * pageSize;

    let where = 'd.deleted_at IS NULL AND d.agency_id = ?';
    const params = [agencyId];
    if (status) {
      where += ' AND ds.status_code = ?';
      params.push(status);
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
      `SELECT d.id, d.dossier_code, d.subject, d.submitted_at, d.received_at, d.due_at,
              ds.status_code as current_status, ds.name as status_name,
              s.name as service_name,
              c.full_name as citizen_name, c.national_id as citizen_national_id
       FROM dossiers d
       JOIN dossier_statuses ds ON ds.id = d.current_status_id
       JOIN administrative_services s ON s.id = d.service_id
       JOIN citizens c ON c.id = d.citizen_id AND c.deleted_at IS NULL
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

// PATCH /api/v1/official/dossiers/:code/receive - Tiếp nhận hồ sơ
router.patch('/dossiers/:code/receive', async (req, res, next) => {
  try {
    const official = await getOfficialAgency(req.user.id);
    if (!official) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Không tìm thấy thông tin cán bộ' } });
    }
    const { note } = req.body || {};
    const [statusRows] = await db.query(
      "SELECT id FROM dossier_statuses WHERE status_code IN ('SUBMITTED','RECEIVED') ORDER BY status_code"
    );
    const submittedId = statusRows.find(s => s.status_code === 'SUBMITTED')?.id || statusRows[0]?.id;
    const [receivedRows] = await db.query("SELECT id FROM dossier_statuses WHERE status_code = 'RECEIVED' LIMIT 1");
    const receivedId = receivedRows[0]?.id;
    if (!receivedId) {
      return res.status(500).json({ error: { code: 'CONFIG_ERROR', message: 'Thiếu trạng thái RECEIVED' } });
    }

    const [dossiers] = await db.query(
      'SELECT id, current_status_id FROM dossiers WHERE dossier_code = ? AND agency_id = ? AND deleted_at IS NULL',
      [req.params.code, official.agency_id]
    );
    if (!dossiers.length) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy hồ sơ' } });
    }
    const d = dossiers[0];
    if (d.current_status_id != submittedId) {
      return res.status(409).json({
        error: { code: 'CONFLICT', message: 'Hồ sơ không ở trạng thái chờ tiếp nhận' }
      });
    }

    const [services] = await db.query(
      'SELECT processing_days FROM administrative_services WHERE id = (SELECT service_id FROM dossiers WHERE id = ?)',
      [d.id]
    );
    const processingDays = (services[0] && services[0].processing_days) || 7;
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + processingDays);
    const receivedAt = new Date();

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        'UPDATE dossiers SET current_status_id = ?, received_at = ?, due_at = ?, updated_at = NOW() WHERE id = ?',
        [receivedId, receivedAt, dueAt, d.id]
      );
      await conn.query(
        `INSERT INTO dossier_histories (dossier_id, actor_user_id, action, from_status_id, to_status_id, note)
         VALUES (?, ?, 'RECEIVE', ?, ?, ?)`,
        [d.id, req.user.id, submittedId, receivedId, note || 'Tiếp nhận hồ sơ']
      );
      await conn.commit();
      auditLog(req, 'DOSSIER_RECEIVE', 'DOSSIER', d.id, d.id, { dossier_code: req.params.code });
      res.json({
        dossier_code: req.params.code,
        current_status: 'RECEIVED',
        received_at: receivedAt,
        due_at: dueAt
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

// PATCH /api/v1/official/dossiers/:code/request-supplement - Yêu cầu bổ sung
router.patch('/dossiers/:code/request-supplement', async (req, res, next) => {
  try {
    const official = await getOfficialAgency(req.user.id);
    if (!official) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Không tìm thấy thông tin cán bộ' } });
    }
    const { note, due_at } = req.body || {};
    const [suppRows] = await db.query(
      "SELECT id FROM dossier_statuses WHERE status_code = 'SUPPLEMENT_REQUIRED' LIMIT 1"
    );
    const supplementStatusId = suppRows[0]?.id;
    if (!supplementStatusId) {
      return res.status(500).json({ error: { code: 'CONFIG_ERROR', message: 'Thiếu trạng thái SUPPLEMENT_REQUIRED' } });
    }

    const [dossiers] = await db.query(
      'SELECT id, current_status_id FROM dossiers WHERE dossier_code = ? AND agency_id = ? AND deleted_at IS NULL',
      [req.params.code, official.agency_id]
    );
    if (!dossiers.length) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy hồ sơ' } });
    }
    const d = dossiers[0];
    const [statusRows] = await db.query('SELECT id, status_code FROM dossier_statuses');
    const statusMap = {};
    statusRows.forEach(r => { statusMap[r.status_code] = r.id; });
    if (d.current_status_id !== statusMap.RECEIVED && d.current_status_id !== statusMap.PROCESSING) {
      return res.status(409).json({
        error: { code: 'CONFLICT', message: 'Chỉ được yêu cầu bổ sung khi hồ sơ đã tiếp nhận hoặc đang xử lý' }
      });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        'UPDATE dossiers SET current_status_id = ?, due_at = COALESCE(?, due_at), updated_at = NOW() WHERE id = ?',
        [supplementStatusId, due_at || null, d.id]
      );
      await conn.query(
        `INSERT INTO dossier_histories (dossier_id, actor_user_id, action, from_status_id, to_status_id, note)
         VALUES (?, ?, 'REQUEST_SUPPLEMENT', ?, ?, ?)`,
        [d.id, req.user.id, d.current_status_id, supplementStatusId, note || 'Yêu cầu bổ sung hồ sơ']
      );
      await conn.commit();
      auditLog(req, 'DOSSIER_REQUEST_SUPPLEMENT', 'DOSSIER', d.id, d.id);
      res.json({ dossier_code: req.params.code, current_status: 'SUPPLEMENT_REQUIRED' });
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

// PATCH /api/v1/official/dossiers/:code/complete - Hoàn tất & trả kết quả
router.patch('/dossiers/:code/complete', async (req, res, next) => {
  try {
    const official = await getOfficialAgency(req.user.id);
    if (!official) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Không tìm thấy thông tin cán bộ' } });
    }
    const { note, result } = req.body || {};
    const [compRows] = await db.query(
      "SELECT id FROM dossier_statuses WHERE status_code = 'COMPLETED' LIMIT 1"
    );
    const completedStatusId = compRows[0]?.id;
    if (!completedStatusId) {
      return res.status(500).json({ error: { code: 'CONFIG_ERROR', message: 'Thiếu trạng thái COMPLETED' } });
    }

    const [dossiers] = await db.query(
      'SELECT id, current_status_id FROM dossiers WHERE dossier_code = ? AND agency_id = ? AND deleted_at IS NULL',
      [req.params.code, official.agency_id]
    );
    if (!dossiers.length) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy hồ sơ' } });
    }
    const d = dossiers[0];
    const [statusRows] = await db.query('SELECT id, status_code FROM dossier_statuses');
    const statusMap = {};
    statusRows.forEach(r => { statusMap[r.status_code] = r.id; });
    if (d.current_status_id !== statusMap.RECEIVED && d.current_status_id !== statusMap.PROCESSING) {
      return res.status(409).json({
        error: { code: 'CONFLICT', message: 'Chỉ được hoàn tất khi hồ sơ đã tiếp nhận hoặc đang xử lý' }
      });
    }

    const completedAt = new Date();
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        'UPDATE dossiers SET current_status_id = ?, completed_at = ?, updated_at = NOW() WHERE id = ?',
        [completedStatusId, completedAt, d.id]
      );
      await conn.query(
        `INSERT INTO dossier_histories (dossier_id, actor_user_id, action, from_status_id, to_status_id, note, meta_json)
         VALUES (?, ?, 'COMPLETE', ?, ?, ?, ?)`,
        [
          d.id,
          req.user.id,
          d.current_status_id,
          completedStatusId,
          note || 'Hoàn tất xử lý hồ sơ',
          result ? JSON.stringify(result) : null
        ]
      );
      await conn.commit();
      auditLog(req, 'DOSSIER_COMPLETE', 'DOSSIER', d.id, d.id);
      res.json({
        dossier_code: req.params.code,
        current_status: 'COMPLETED',
        completed_at: completedAt
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

module.exports = router;
