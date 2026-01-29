const db = require('../config/db');

async function auditLog(req, eventType, entityType = null, entityId = null, dossierId = null, detail = null) {
  try {
    await db.query(
      `INSERT INTO audit_logs (actor_user_id, event_type, entity_type, entity_id, dossier_id, ip_address, user_agent, detail_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user ? req.user.id : null,
        eventType,
        entityType,
        entityId,
        dossierId,
        req.ip || req.connection?.remoteAddress,
        req.get('User-Agent') || null,
        detail ? JSON.stringify(detail) : null
      ]
    );
  } catch (e) {
    console.error('Audit log error:', e);
  }
}

module.exports = { auditLog };
