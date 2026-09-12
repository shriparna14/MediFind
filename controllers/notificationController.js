const Notification = require('../models/Notification');
const localDb = require('../utils/localDb');

/**
 * @desc    Get current user notifications
 * @route   GET /api/notifications
 * @access  Private
 */
const getMyNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;

    if (localDb.isUsingMongo()) {
      const notifications = await Notification.find({ userId })
        .sort({ createdAt: -1 })
        .limit(30);

      res.json({ success: true, data: notifications });
    } else {
      const notifs = (await localDb.Notification?.find({ userId })) || [];
      res.json({ success: true, data: notifs });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Mark all user notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
const markAllRead = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;

    if (localDb.isUsingMongo()) {
      await Notification.updateMany({ userId, read: false }, { read: true });
    }
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyNotifications,
  markAllRead
};
