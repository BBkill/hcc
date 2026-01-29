const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, requireRoles } = require('../middleware/auth');

router.use(authMiddleware);
router.use(requireRoles('REPORT_ADMIN', 'ADMIN'));

// GET /api/v1/reports/summary?from=&to=&agency_id=&service_id=
router.get('/summary', async (req, res, next) => {
  try {
    const from = req.query.from || new Date().toISOString().slice(0, 10);
    const to = req.query.to || new Date().toISOString().slice(0, 10);
    const agencyId = req.query.agency_id;
    const serviceId = req.query.service_id;

    let where = 'd.deleted_at IS NULL AND d.submitted_at >= ? AND d.submitted_at <= ?';
    const params = [from, to + ' 23:59:59'];
    if (agencyId) {
      where += ' AND d.agency_id = ?';
      params.push(agencyId);
    }
    if (serviceId) {
      where += ' AND d.service_id = ?';
      params.push(serviceId);
    }

    const [rows] = await db.query(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN ds.status_code = 'SUBMITTED' THEN 1 ELSE 0 END) as submitted,
        SUM(CASE WHEN ds.status_code = 'RECEIVED' THEN 1 ELSE 0 END) as received,
        SUM(CASE WHEN ds.status_code = 'PROCESSING' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN ds.status_code = 'SUPPLEMENT_REQUIRED' THEN 1 ELSE 0 END) as supplement_required,
        SUM(CASE WHEN ds.status_code = 'REJECTED' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN ds.status_code = 'COMPLETED' OR ds.status_code = 'RETURNED' THEN 1 ELSE 0 END) as completed
       FROM dossiers d
       JOIN dossier_statuses ds ON ds.id = d.current_status_id
       WHERE ${where}`,
      params
    );
    const r = rows[0];
    const total = Number(r.total) || 0;
    const completed = Number(r.completed) || 0;
    const rejected = Number(r.rejected) || 0;

    let onTimeRate = 0;
    let avgProcessingHours = 0;
    if (completed > 0) {
      const [avgRows] = await db.query(
        `SELECT
          AVG(TIMESTAMPDIFF(HOUR, d.submitted_at, d.completed_at)) as avg_hours,
          SUM(CASE WHEN d.completed_at <= d.due_at THEN 1 ELSE 0 END) as on_time
         FROM dossiers d
         JOIN dossier_statuses ds ON ds.id = d.current_status_id
         WHERE d.deleted_at IS NULL AND d.submitted_at >= ? AND d.submitted_at <= ?
           AND (ds.status_code = 'COMPLETED' OR ds.status_code = 'RETURNED')
           AND d.completed_at IS NOT NULL AND d.due_at IS NOT NULL
           ${agencyId ? ' AND d.agency_id = ?' : ''}
           ${serviceId ? ' AND d.service_id = ?' : ''}`,
        [from, to + ' 23:59:59', ...(agencyId ? [agencyId] : []), ...(serviceId ? [serviceId] : [])]
      );
      const a = avgRows[0];
      if (a) {
        onTimeRate = a.on_time ? (Number(a.on_time) / completed) : 0;
        avgProcessingHours = Number(a.avg_hours) || 0;
      }
    }

    res.json({
      from,
      to,
      agency_id: agencyId ? parseInt(agencyId, 10) : null,
      service_id: serviceId ? parseInt(serviceId, 10) : null,
      metrics: {
        submitted: Number(r.submitted) || 0,
        received: Number(r.received) || 0,
        processing: Number(r.processing) || 0,
        supplement_required: Number(r.supplement_required) || 0,
        rejected: Number(r.rejected) || 0,
        completed,
        on_time_rate: Math.round(onTimeRate * 100) / 100,
        avg_processing_hours: Math.round(avgProcessingHours * 10) / 10
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
