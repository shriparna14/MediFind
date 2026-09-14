const mongoose = require('mongoose');
const Order = require('../models/Order');
const Medicine = require('../models/Medicine');
const User = require('../models/User');
const Notification = require('../models/Notification');
const localDb = require('../utils/localDb');
const { logAudit } = require('../utils/auditLogger');

/**
 * @desc    Create new multi-item order with MongoDB transaction
 * @route   POST /api/orders
 * @access  Private (Customer)
 */
const createOrder = async (req, res, next) => {
  let session = null;
  if (localDb.isUsingMongo()) {
    try {
      session = await mongoose.startSession();
      session.startTransaction();
    } catch (sessionErr) {
      session = null; // Fallback for MongoDB setups without replica sets
    }
  }

  try {
    const {
      pharmacyId,
      items,
      deliveryAddress,
      deliveryPhone,
      deliveryType = 'standard',
      paymentMethod = 'cod',
      notes = ''
    } = req.body;

    const userId = req.user.id || req.user._id;

    if (!pharmacyId || !items || !Array.isArray(items) || items.length === 0) {
      if (session) await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Invalid order parameters.' });
    }

    let calculatedTotal = 0;
    const processedItems = [];

    // Verify stock and calculate price atomically
    for (const item of items) {
      const requestedQty = Number(item.quantity);
      if (!Number.isInteger(requestedQty) || requestedQty <= 0) {
        if (session) await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: 'Item quantity must be a positive integer.'
        });
      }

      let med = null;
      if (localDb.isUsingMongo()) {
        med = session
          ? await Medicine.findById(item.medicineId).session(session)
          : await Medicine.findById(item.medicineId);
      } else {
        med = await localDb.Medicine.findById(item.medicineId);
      }

      if (!med) {
        if (session) await session.abortTransaction();
        return res.status(404).json({ success: false, message: `Medicine ${item.medicineId} not found.` });
      }

      if (med.isExpired) {
        if (session) await session.abortTransaction();
        return res.status(400).json({ success: false, message: `Cannot order expired medicine: ${med.name}` });
      }

      if (med.stock < requestedQty) {
        if (session) await session.abortTransaction();
        return res.status(409).json({
          success: false,
          status: 409,
          message: `Insufficient stock for ${med.name}. Available: ${med.stock}, requested: ${requestedQty}.`
        });
      }

      // Decrement stock
      med.stock -= requestedQty;
      if (session) {
        await med.save({ session });
      } else if (localDb.isUsingMongo()) {
        await med.save();
      }

      const effectivePrice = Number(med.price) * (1 - (Number(med.discount || 0) / 100));
      calculatedTotal += effectivePrice * requestedQty;

      processedItems.push({
        medicineId: med._id || med.id,
        name: med.name,
        quantity: requestedQty,
        price: Number(effectivePrice.toFixed(2))
      });
    }

    // Add Emergency Dispatch Fee if selected
    if (deliveryType === 'emergency') {
      calculatedTotal += 50;
    }

    const orderData = {
      userId,
      pharmacyId,
      items: processedItems,
      totalAmount: Number(calculatedTotal.toFixed(2)),
      deliveryType,
      paymentMethod,
      paymentStatus: paymentMethod === 'test_payment' ? 'paid' : 'pending',
      deliveryAddress,
      deliveryPhone,
      notes,
      status: 'PLACED',
      timeline: [{
        status: 'PLACED',
        timestamp: new Date(),
        note: `Order placed (${deliveryType === 'emergency' ? 'Priority Emergency' : 'Standard Delivery'})`
      }]
    };

    let order = null;
    if (localDb.isUsingMongo()) {
      if (session) {
        const created = await Order.create([orderData], { session });
        order = created[0];
        await session.commitTransaction();
      } else {
        order = await Order.create(orderData);
      }
    } else {
      order = await localDb.Order.create(orderData);
    }

    // Populate pharmacy for complete response
    const populatedOrder = await Order.findById(order._id || order.id)
      .populate('pharmacyId', 'shopName address phone')
      .populate('userId', 'name email phone');

    // Create Notification & Broadcast via Socket.IO
    const io = req.app.get('socketio');
    if (io) {
      io.to(String(pharmacyId)).emit('new_order', populatedOrder || order);
      if (deliveryType === 'emergency') {
        io.emit('global_emergency_order', populatedOrder || order);
      }
    }

    if (localDb.isUsingMongo()) {
      await Notification.create({
        userId: pharmacyId,
        title: deliveryType === 'emergency' ? '🚨 Priority Emergency Order' : '📦 New Order Received',
        message: `Order #${String(order._id).slice(-6)} placed with ${processedItems.length} items. Total: ₹${calculatedTotal.toFixed(2)}`,
        type: deliveryType === 'emergency' ? 'EMERGENCY' : 'ORDER',
        referenceId: order._id,
        referenceModel: 'Order'
      });
    }

    await logAudit('ORDER_CREATED', {
      userId,
      pharmacyId,
      targetId: order._id || order.id,
      targetModel: 'Order',
      details: { totalAmount: calculatedTotal, deliveryType, itemsCount: processedItems.length }
    }, req);

    res.status(201).json({
      success: true,
      message: deliveryType === 'emergency'
        ? 'Emergency order dispatched! Priority rider is being assigned.'
        : 'Order placed successfully!',
      data: populatedOrder || order
    });
  } catch (err) {
    if (session) {
      try {
        if (session.inTransaction()) {
          await session.abortTransaction();
        }
      } catch (abortErr) {
        // ignore abort error
      }
    }

    if (
      err.name === 'VersionError' ||
      err.code === 112 ||
      (err.errorLabels && (err.errorLabels.includes('TransientTransactionError') || err.errorLabels.includes('UnknownTransactionCommitResult')))
    ) {
      return res.status(409).json({
        success: false,
        status: 409,
        message: 'One or more items experienced stock contention. Please refresh cart.'
      });
    }

    next(err);
  } finally {
    if (session) {
      try {
        await session.endSession();
      } catch (e) {}
    }
  }
};

/**
 * @desc    Get orders for currently authenticated customer
 * @route   GET /api/orders/my
 * @access  Private (Customer)
 */
const getMyOrders = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    if (localDb.isUsingMongo()) {
      const total = await Order.countDocuments({ userId });
      const orders = await Order.find({ userId })
        .populate('pharmacyId', 'shopName address phone rating')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);

      res.json({
        success: true,
        count: orders.length,
        pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) },
        data: orders
      });
    } else {
      const orders = (await localDb.Order.find({ userId })) || [];
      res.json({ success: true, count: orders.length, data: orders });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get pharmacy order requests
 * @route   GET /api/orders/pharmacy
 * @access  Private (Pharmacy)
 */
const getPharmacyOrders = async (req, res, next) => {
  try {
    const pharmacyId = req.user.id || req.user._id;
    const { status, page = 1, limit = 50 } = req.query;

    const query = { pharmacyId };
    if (status && status !== 'all') {
      query.status = status.toUpperCase();
    }

    if (localDb.isUsingMongo()) {
      const orders = await Order.find(query)
        .populate('userId', 'name phone email address')
        .sort({ createdAt: -1 })
        .limit(Number(limit));

      res.json({ success: true, count: orders.length, data: orders });
    } else {
      const orders = (await localDb.Order.find({ pharmacyId })) || [];
      res.json({ success: true, count: orders.length, data: orders });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update order status in lifecycle
 * @route   PUT /api/orders/:id/status
 * @access  Private (Pharmacy / Admin)
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const validStatuses = ['PLACED', 'PHARMACY_ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid order status specified.' });
    }

    let order = null;
    if (localDb.isUsingMongo()) {
      order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found.' });
      }

      order.status = status;
      order.timeline.push({
        status,
        timestamp: new Date(),
        note: note || `Order marked as ${status}`
      });

      if (status === 'DELIVERED') {
        order.paymentStatus = 'paid';
      }

      await order.save();
    } else {
      order = await localDb.Order.findById(id);
      if (order) {
        order.status = status;
      }
    }

    const populated = await Order.findById(id)
      .populate('pharmacyId', 'shopName address phone')
      .populate('userId', 'name phone email');

    // Broadcast update to user
    const io = req.app.get('socketio');
    if (io) {
      io.to(String(order.userId)).emit('order_status', {
        orderId: order._id,
        status,
        order: populated || order
      });
    }

    await logAudit('ORDER_STATUS_CHANGED', {
      targetId: order._id,
      targetModel: 'Order',
      details: { newStatus: status }
    }, req);

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      data: populated || order
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getPharmacyOrders,
  updateOrderStatus
};
