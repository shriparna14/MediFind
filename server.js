const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const errorHandler = require('./middleware/errorHandler');
const { checkAndReleaseExpiredReservations } = require('./utils/expiryWorker');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Allowed Origins for CORS
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173'
];

// Socket.IO Setup
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

app.set('socketio', io);

// Socket.io Real-time connection handler
io.on('connection', (socket) => {
  // Join personal user / pharmacy room
  socket.on('join_user_room', (userId) => {
    if (userId) {
      socket.join(String(userId));
    }
  });

  // Direct chat messaging between customer and pharmacy
  socket.on('send_message', (data) => {
    const { receiverId, senderId, message, senderName } = data;
    const payload = {
      senderId,
      senderName,
      receiverId,
      message,
      timestamp: new Date().toISOString()
    };
    if (receiverId) {
      io.to(String(receiverId)).emit('receive_message', payload);
    }
    socket.emit('receive_message', payload);
  });

  socket.on('disconnect', () => {});
});

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Connection
const localDb = require('./utils/localDb');
const connectDB = require('./config/db');

if (process.env.MONGODB_URI) {
  connectDB();
} else {
  console.log('[Database]: Using High-Performance JSON Storage Mode.');
}

// Ensure Uploads Directory Exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/medicines', require('./routes/medicines'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/reservations', require('./routes/reservations'));
app.use('/api/prescriptions', require('./routes/prescriptions'));
app.use('/api/pharmacies', require('./routes/pharmacies'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/docs', require('./routes/docs'));
app.use('/docs', require('./routes/docs'));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'MediFind 2.0 API',
    timestamp: new Date().toISOString(),
    database: localDb.isUsingMongo() ? 'MongoDB' : 'Local JSON DB'
  });
});

// Periodic Expiry Worker: Runs every 60 seconds to release expired 30-min holds
setInterval(() => {
  checkAndReleaseExpiredReservations(io);
}, 60 * 1000);

// Global Error Handler Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 MediFind 2.0 API Server running on port ${PORT}`);
  console.log(`📚 Interactive API Documentation: http://localhost:${PORT}/docs`);
});
