# CSRMS - Database Setup & Testing Guide

## Database Setup

### Prerequisites
- PostgreSQL installed and running
- Node.js >= 14
- Environment variables configured in `.env` file

### 1. Run Database Migrations

Migrations create all necessary tables and schema:

```bash
node sql/migrate.js
```

Expected output:
```
🔄 Starting database migrations...

✓ Database schema created successfully
✓ All migrations completed

📊 Created Tables:
   ✓ branches
   ✓ users
   ✓ categories
   ✓ products
   ✓ product_barcodes
   ✓ inventory
   ✓ procurements
   ✓ sales
   ✓ sale_items
   ✓ cashier_balancing
   ✓ stock_adjustments
   ✓ audit_logs
   ✓ notifications

✅ Migration completed successfully!
```

### 2. Seed Database with Sample Data

Populate the database with initial data:

```bash
node sql/seed.js
```

Expected output:
```
🌱 Starting database seed...

📍 Creating branches...
✓ Created 4 branches

👥 Creating users...
✓ Created 6 users

📦 Creating categories...
✓ Created 6 categories

🛍️ Creating products...
✓ Created 12 products

Creating product barcodes...
 Created 12 barcodes

 Creating inventory...
 Created 48 inventory records

✅ Database seeded successfully!

📋 Seed Summary:
   ✓ 4 branches
   ✓ 6 users
   ✓ 6 categories
   ✓ 12 products
   ✓ 12 barcodes
   ✓ 48 inventory records

🔑 Default Login Credentials:
   Admin:   admin / admin@123
   Manager: manager1 / manager@123
   Agent:   agent1 / agent@123
```

## Running Tests

### Unit Tests

Run all unit tests:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

### Test Files

Business logic tests are located in:
- `src/__tests__/unit/sales.controller.test.js` - Sales transaction logic
- `src/__tests__/unit/inventory.controller.test.js` - Inventory management
- `src/__tests__/unit/cashierBalancing.test.js` - Cashier reconciliation

### Test Coverage

Current test coverage includes:

#### Sales Controller
- Sale amount validation
- Change calculation
- Inventory stock validation
- Receipt number generation
- Multi-item sales processing
- Void sale logic

#### Inventory Controller
- Stock status determination (out-of-stock, low-stock, in-stock)
- Stock adjustment validation
- Inventory valuation
- Procurement impact on inventory
- Low stock alert triggering

#### Cashier Balancing
- Amount reconciliation
- Balance status determination (approved, pending, flagged)
- Daily sales calculation
- Variance analysis
- Threshold acceptance

## Starting the Server

```bash
npm start
# or
node src/app.js
```

Server runs on: `http://localhost:5000`
Health check: `http://localhost:5000/health`

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/change-password` - Change password

### Dashboards
- `GET /api/dashboard/director` - Director dashboard
- `GET /api/dashboard/manager` - Manager dashboard
- `GET /api/dashboard/agent` - Sales agent dashboard

### Products & Categories
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `GET /api/barcodes` - List barcodes
- `POST /api/barcodes` - Add barcode

### Inventory
- `GET /api/inventory` - List inventory
- `POST /api/inventory/adjust` - Adjust stock
- `GET /api/inventory/adjustments` - View adjustments

### Sales
- `GET /api/sales` - List sales
- `POST /api/sales` - Create sale
- `POST /api/sales/:id/void` - Void sale
- `GET /api/receipts/:id/pdf` - Download receipt PDF

### Procurement
- `GET /api/procurements` - List procurements
- `POST /api/procurements` - Record procurement

### Cashier Balancing
- `GET /api/cashier-balancing` - List balances
- `POST /api/cashier-balancing` - Balance cashier

### Reports
- `GET /api/reports/sales` - Sales report
- `GET /api/reports/inventory` - Inventory report
- `GET /api/reports/procurement` - Procurement report

## Environment Variables

Required `.env` configuration:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/csrms_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=csrms_db
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d

PORT=5000
NODE_ENV=development

CORS_ORIGIN=http://localhost:3000

EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

## Troubleshooting

### Database Connection Error
- Verify PostgreSQL is running
- Check credentials in `.env` file
- Ensure database exists: `createdb csrms_db`

### Migration Failed
- Drop existing tables: `psql -U postgres -d csrms_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"`
- Re-run migration: `node sql/migrate.js`

### Email Notifications Not Working
- Configure Gmail app password
- Enable "Less secure app access" if using Gmail
- Check EMAIL_SERVICE and EMAIL_PASSWORD in `.env`

## Additional Commands

```bash
# Start server
npm start

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Reset database (careful!)
node sql/migrate.js
node sql/seed.js
```
