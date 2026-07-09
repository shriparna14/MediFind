require('dotenv').config();
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const connectDB = require('./config/db');
const seedData = require('./utils/seeder');

// Route files
const authRoutes = require('./routes/auth');
const medicineRoutes = require('./routes/medicines');
const pharmacyRoutes = require('./routes/pharmacies');
const reservationRoutes = require('./routes/reservations');
const orderRoutes = require('./routes/orders');
const prescriptionRoutes = require('./routes/prescriptions');
const adminRoutes = require('./routes/admin');

// Initialize express app
const app = express();
const server = http.createServer(app);

// Enable CORS
app.use(cors({
  origin: '*', // In development, allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

// Express body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve local uploads folder statically
const UPLOADS_PATH = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_PATH)) {
  fs.mkdirSync(UPLOADS_PATH, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_PATH));

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/pharmacies', pharmacyRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/admin', adminRoutes);

// Base route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the Medicine Availability & Emergency Pharmacy Finder API',
    status: 'Running'
  });
});

// Configure Socket.IO
const io = socketio(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Attach Socket.IO to application settings for access in controllers
app.set('socketio', io);

// Socket.IO event handler
io.on('connection', (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);

  // Basic real-time communication support (room subscriptions, notifications)
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`👥 Client ${socket.id} joined room: ${roomId}`);
  });

  // Real-time chat messaging event between pharmacy & customer
  socket.on('send_message', (data) => {
    const { senderId, receiverId, message, senderName, timestamp } = data;
    io.to(receiverId).emit('receive_message', data);
    io.to(senderId).emit('receive_message', data);
    console.log(`💬 Message from ${senderName} to room ${receiverId}: ${message}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Connect to Database & Start Server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect to Database (MongoDB or fallback local file database)
  await connectDB();

  // Run database seeder if applicable
  await seedData();

  server.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
};

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
