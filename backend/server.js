const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB } = require('./config/db');

// Load env vars
dotenv.config();

const app = express();
const server = http.createServer(app);
let io = { emit: () => {}, on: () => {} };
try {
  const socketIo = require('socket.io');
  io = socketIo(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
  });
} catch (e) {
  console.log('Socket.io loaded in fallback mode');
}

// Connect to Database (falls back to local JSON files if Mongo isn't running)
connectDB();

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Socket.io injection middleware so controllers can emit events
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Socket.io rooms join configurations
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('join', (data) => {
    if (data.userId) {
      socket.join(`user_${data.userId}`);
      console.log(`👤 User joined room: user_${data.userId}`);
    }
    if (data.role) {
      socket.join(`role_${data.role}`);
      console.log(`🔑 Role joined room: role_${data.role}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Import Routes
const authRoutes = require('./routes/auth');
const marksRoutes = require('./routes/marks');
const notificationRoutes = require('./routes/notifications');
const studentRoutes = require('./routes/students');
const gtuRoutes = require('./routes/gtu');

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/marks', marksRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/gtu', gtuRoutes);

// Health check endpoint (used by keep-alive pinger)
app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

// Serve static frontend in production / Render
const path = require('path');
const fs = require('fs');
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  // Simple Health Check
  app.get('/', (req, res) => {
    res.json({ message: 'College Department Management System API running.' });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.message);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server listening on port ${PORT}`);

    // ── Keep-alive: ping self every 14 min to prevent Render free tier sleep ──
    const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
    if (RENDER_URL) {
      const pingInterval = 14 * 60 * 1000; // 14 minutes
      setInterval(() => {
        const https = require('https');
        const http = require('http');
        const mod = RENDER_URL.startsWith('https') ? https : http;
        mod.get(`${RENDER_URL}/api/health`, (res) => {
          console.log(`🏓 Keep-alive ping → ${res.statusCode}`);
        }).on('error', (err) => {
          console.log(`⚠️  Keep-alive ping failed: ${err.message}`);
        });
      }, pingInterval);
      console.log(`🔄 Keep-alive pings scheduled every 14 min → ${RENDER_URL}`);
    }
  });
}

module.exports = app;
