const AuditLog = require('../models/AuditLog');
const localDb = require('./localDb');

/**
 * Log audit events asynchronously without blocking request handling
 */
const logAudit = async (action, data = {}, req = null) => {
  try {
    const logEntry = {
      action,
      userId: data.userId || (req?.user?.id || req?.user?._id),
      pharmacyId: data.pharmacyId,
      targetModel: data.targetModel,
      targetId: data.targetId,
      details: data.details || {},
      ipAddress: req?.ip || req?.connection?.remoteAddress || '127.0.0.1',
      userAgent: req?.headers ? req.headers['user-agent'] : 'System'
    };

    if (localDb.isUsingMongo()) {
      await AuditLog.create(logEntry);
    }
  } catch (err) {
    console.error('[AuditLogger Error]:', err.message);
  }
};

module.exports = { logAudit };
