const Order = require('../models/Order');
const Medicine = require('../models/Medicine');
const User = require('../models/User');

// @desc    Create a new order (Emergency Delivery)
// @route   POST /api/orders
// @access  Private (Customer only)
exports.createOrder = async (req, res) => {
  try {
    const { pharmacyId, items, deliveryAddress, deliveryPhone, deliveryType } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No items in order' });
    }

    // Verify stock availability and deduct
    let totalAmount = 0;
    const itemDetails = [];

    for (const item of items) {
      const med = await Medicine.findById(item.medicineId);
      if (!med) {
        return res.status(404).json({ success: false, message: `Medicine ${item.name} not found` });
      }
      if (med.stock < item.quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for ${med.name}` });
      }

      totalAmount += med.price * item.quantity;
      itemDetails.push({
        medicineId: item.medicineId,
        name: med.name,
        quantity: item.quantity,
        price: med.price
      });
    }

    // Deduct stock for all items
    for (const item of itemDetails) {
      const med = await Medicine.findById(item.medicineId);
      const newStock = med.stock - item.quantity;
      await Medicine.findByIdAndUpdate(item.medicineId, { stock: newStock });

      // Socket update stock
      const io = req.app.get('socketio');
      if (io) {
        io.emit('stock_update', {
          medicineId: med._id,
          medicineName: med.name,
          pharmacyId: med.pharmacyId,
          stock: newStock
        });
      }
    }

    // Create the order
    const order = await Order.create({
      userId: req.user.id,
      pharmacyId,
      items: itemDetails,
      totalAmount,
      deliveryType: deliveryType || 'emergency',
      status: 'pending',
      deliveryAddress,
      deliveryPhone,
      paymentStatus: 'pending'
    });

    // Populate user & pharmacy details for full object
    const user = await User.findById(req.user.id);
    const pharmacy = await User.findById(pharmacyId);
    const orderData = typeof order.toObject === 'function' ? order.toObject() : order;
    const orderObj = {
      ...orderData,
      id: orderData.id || orderData._id,
      customer: {
        name: user.name,
        phone: user.phone,
        email: user.email
      },
      pharmacy: {
        shopName: pharmacy.shopName,
        address: pharmacy.address,
        phone: pharmacy.phone
      }
    };

    // Socket notify pharmacy about new delivery/order request
    const io = req.app.get('socketio');
    if (io) {
      io.emit(`new_order_pharmacy_${pharmacyId}`, orderObj);
    }

    res.status(201).json({ success: true, data: orderObj });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, message: 'Server error creating order' });
  }
};

// @desc    Get customer's orders
// @route   GET /api/orders/my
// @access  Private (Customer only)
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id });

    const enriched = await Promise.all(
      orders.map(async (ord) => {
        const pharmacy = await User.findById(ord.pharmacyId);
        const ordObj = { ...ord };
        if (pharmacy) {
          ordObj.pharmacy = {
            shopName: pharmacy.shopName,
            address: pharmacy.address,
            phone: pharmacy.phone
          };
        }
        return ordObj;
      })
    );

    // Sort by newest
    enriched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (error) {
    console.error('Get my orders error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving orders' });
  }
};

// @desc    Get pharmacy's orders / delivery requests
// @route   GET /api/orders/pharmacy
// @access  Private (Pharmacy only)
exports.getPharmacyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ pharmacyId: req.user.id });

    const enriched = await Promise.all(
      orders.map(async (ord) => {
        const customer = await User.findById(ord.userId);
        const ordObj = { ...ord };
        if (customer) {
          ordObj.customer = {
            name: customer.name,
            phone: customer.phone,
            email: customer.email
          };
        }
        return ordObj;
      })
    );

    // Sort by newest
    enriched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (error) {
    console.error('Get pharmacy orders error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving orders' });
  }
};

// @desc    Update order/delivery status
// @route   PUT /api/orders/:id/status
// @access  Private (Pharmacy/Admin)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Role check
    if (req.user.role === 'pharmacy' && String(order.pharmacyId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to modify this order' });
    }

    const oldStatus = order.status;

    if (oldStatus === 'cancelled' || oldStatus === 'delivered') {
      return res.status(400).json({ success: false, message: `Order is already ${oldStatus}` });
    }

    // If cancelled, restore medicine stock
    if (status === 'cancelled') {
      for (const item of order.items) {
        const med = await Medicine.findById(item.medicineId);
        if (med) {
          const restoredStock = med.stock + item.quantity;
          await Medicine.findByIdAndUpdate(item.medicineId, { stock: restoredStock });

          // Stock update socket broadcast
          const io = req.app.get('socketio');
          if (io) {
            io.emit('stock_update', {
              medicineId: med._id,
              medicineName: med.name,
              pharmacyId: med.pharmacyId,
              stock: restoredStock
            });
          }
        }
      }
    }

    const updates = {};
    if (status) updates.status = status;
    if (paymentStatus) updates.paymentStatus = paymentStatus;

    const updatedOrder = await Order.findByIdAndUpdate(req.params.id, updates, { new: true });

    // Socket notification to customer & pharmacy about order updates
    const io = req.app.get('socketio');
    if (io) {
      // Notify customer
      io.emit(`order_status_user_${order.userId}`, {
        orderId: order._id || order.id,
        status: status || order.status,
        paymentStatus: paymentStatus || order.paymentStatus
      });
      // Notify pharmacy (e.g. for dual screen sync)
      io.emit(`order_status_pharmacy_${order.pharmacyId}`, {
        orderId: order._id || order.id,
        status: status || order.status,
        paymentStatus: paymentStatus || order.paymentStatus
      });
    }

    res.json({ success: true, data: updatedOrder });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: 'Server error updating order' });
  }
};
