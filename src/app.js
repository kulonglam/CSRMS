require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const { errorHandler, notFound } = require('./middleware/errorHandler');

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

// ── Security & Parsing ──────────────────────────────────────────
app.use(helmet());

// CORS Configuration - Allow multiple origins in development
const allowedOrigins = (process.env.CORS_ORIGIN || '*').split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    // In development, allow all origins
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    // In production, check against allowed list
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    callback(new Error('CORS not allowed'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── Logging ─────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Health Check ────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'CSRMS API is running.',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ── API Routes ──────────────────────────────────────────────────
const API = '/api';

app.use(`${API}/auth`,              authRoutes);
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

// ── Error Handling ──────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start Server ────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 CSRMS API running on port ${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Health check: http://localhost:${PORT}/health\n`);
});

module.exports = app;