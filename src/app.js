require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const { errorHandler, notFound } = require('./middleware/errorHandler');
const { globalLimiter, authLimiter } = require('./middleware/rateLimit');

// Routes
const authRoutes             = require('./routes/auth');
const branchRoutes           = require('./routes/branches');
const userRoutes             = require('./routes/users');
const categoryRoutes         = require('./routes/categories');
const productRoutes          = require('./routes/product');
const barcodeRoutes          = require('./routes/barcodes');
const procurementRoutes      = require('./routes/procurement');
const inventoryRoutes        = require('./routes/inventory');
const salesRoutes            = require('./routes/sales');
const cashierBalancingRoutes = require('./routes/cashierBranching');
const reportsRoutes          = require('./routes/reports');
const notificationsRoutes    = require('./routes/notifications');
const auditLogRoutes         = require('./routes/auditLog');
const dashboardRoutes        = require('./routes/dashboard');
const receiptRoutes          = require('./routes/receipts');

const app = express();
const FRONTEND_DIR = path.join(__dirname, '../frontend');

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ── Security & Parsing ──────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com', 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://cdnjs.cloudflare.com', 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      // Allow inline onclick handlers used across legacy page scripts.
      scriptSrcAttr: ["'unsafe-inline'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

const allowedOrigins = (process.env.CORS_ORIGIN || '*').split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV === 'development') return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    callback(new Error('CORS not allowed'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(globalLimiter);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Health Check ────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'CSRMS API is running.',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
  });
});

// ── API Routes ──────────────────────────────────────────────────
const API = '/api';

app.use(`${API}/auth`, authLimiter, authRoutes);
app.use(`${API}/dashboard`,         dashboardRoutes);
app.use(`${API}/branches`,          branchRoutes);
app.use(`${API}/users`,             userRoutes);
app.use(`${API}/categories`,        categoryRoutes);
app.use(`${API}/products`,          productRoutes);
app.use(`${API}/barcodes`,          barcodeRoutes);
app.use(`${API}/procurements`,      procurementRoutes);
app.use(`${API}/inventory`,         inventoryRoutes);
app.use(`${API}/sales`,             salesRoutes);
app.use(`${API}/receipts`,          receiptRoutes);
app.use(`${API}/cashier-balancing`, cashierBalancingRoutes);
app.use(`${API}/reports`,           reportsRoutes);
app.use(`${API}/notifications`,     notificationsRoutes);
app.use(`${API}/audit-logs`,        auditLogRoutes);

// ── Static Frontend (single-origin deployment) ───────────────────
app.use(express.static(FRONTEND_DIR, { index: false }));
app.get('/', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// ── Error Handling ──────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start Server ────────────────────────────────────────────────
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(`\n🚀 CSRMS running on http://localhost:${PORT}`);
    console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
    console.log(`   API         : http://localhost:${PORT}/api`);
    console.log(`   Health      : http://localhost:${PORT}/health\n`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${PORT} is already in use. Stop the other process or set PORT in .env\n`);
    } else {
      console.error('\n❌ Server failed to start:', err.message, '\n');
    }
    process.exit(1);
  });
}

module.exports = app;
