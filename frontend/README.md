# CSRMS Frontend - User Guide

## 📋 Overview

This is a complete frontend for the Crown Stores Retail Management System (CSRMS), built with:
- **HTML5** - Semantic markup
- **Bootstrap 5** - Responsive UI framework  
- **JavaScript (Vanilla)** - Client-side logic
- **CSS3** - Custom styling

## 📁 Project Structure

```
frontend/
├── index.html                 # Login page
├── css/
│   └── style.css             # Custom styles
├── js/
│   ├── api.js                # API client wrapper
│   ├── auth.js               # Authentication manager
│   └── utils.js              # Utility functions
└── pages/
    ├── dashboard-director.html    # Director dashboard
    ├── categories.html            # Category management
    ├── products.html              # Product management
    ├── users.html                 # User management
    ├── branches.html              # Branch management
    ├── inventory.html             # Inventory stub
    ├── sales.html                 # Sales stub
    ├── reports.html               # Reports stub
    └── audit-logs.html            # Audit logs
```

## 🚀 Getting Started

### Prerequisites
- Backend API running on `http://localhost:5000`
- Database seeded with test data
- Modern web browser

### Starting the Frontend

**Option 1: Using Live Server (Recommended)**
1. Install VS Code extension "Live Server"
2. Right-click `index.html` → "Open with Live Server"
3. Automatically opens at `http://localhost:5500`

**Option 2: Using Python HTTP Server**
```bash
cd frontend
python -m http.server 8000
# Then visit http://localhost:8000
```

**Option 3: Using Node.js http-server**
```bash
npm install -g http-server
cd frontend
http-server
```

## 🔐 Authentication

### Login Credentials

Test accounts are pre-configured:

| Role | Username | Password | Role ID |
|------|----------|----------|---------|
| Director | `director` | `Director@123` | director |
| Manager | `manager1` | `Manager@123` | manager |
| Sales Agent | `agent1` | `Agent@123` | sales_agent |

### How Authentication Works

1. **Login Page** (`index.html`)
   - Enter username and password
   - JWT token and user data stored in `localStorage`
   - Automatic redirect to role-appropriate dashboard

2. **Token Storage**
   - `localStorage.token` - JWT token
   - `localStorage.user` - User profile JSON

3. **Protected Pages**
   - Call `requireAuth()` to protect pages
   - Automatic redirect to login if not authenticated
   - Role-based access checks

## 📊 Pages Overview

### 1. **Login Page** (`index.html`)
- Username/password authentication
- Demo credentials displayed
- Auto-redirect to dashboard on success
- Persistent session using localStorage

### 2. **Director Dashboard** (`pages/dashboard-director.html`)
- **Statistics**
  - Total Sales (company-wide)
  - Inventory Value
  - Active Branches
  - Pending Procurements
  
- **Data Tables**
  - Top 10 Products by sales
  - 7-day sales trends
  
- **Quick Actions**
  - Add Product, Category, User, Branch
  - Export Reports

### 3. **Categories** (`pages/categories.html`)
- **CRUD Operations**: Create, Read, Update, Delete
- **Search**: Real-time filtering
- **Features**:
  - View all categories
  - Add new categories
  - Edit category details
  - Delete inactive categories
  - Status management (Active/Inactive)

### 4. **Products** (`pages/products.html`)
- **CRUD Operations**: Full product management
- **Filtering**: By name or category
- **Features**:
  - Product name, price, quantity
  - Category association
  - Reorder level setting
  - Status tracking

### 5. **Users** (`pages/users.html`)
- **User Management**
  - Create users with roles
  - Assign to branches
  - Status management
  
- **Features**
  - Filter by role (Director/Manager/Agent)
  - Password reset functionality
  - Edit user details
  - Branch assignment

### 6. **Branches** (`pages/branches.html`)
- **Branch Operations**
  - Create/Update branches
  - Location tracking
  - Staff and product counts
  
- **Features**
  - Search branches
  - View statistics
  - Activate/Deactivate branches

### 7. **Inventory, Sales, Reports** (Stub Pages)
- Framework pages ready for expansion
- Same navigation structure
- Ready for feature implementation

## 🛠️ JavaScript Architecture

### API Client (`js/api.js`)
Centralized API wrapper:
```javascript
// Usage
const response = await api.getProducts();
const result = await api.createProduct({ name: 'Item', category_id: 1, price: 100 });
```

**Key Methods:**
- `login(username, password)`
- `getCategories() / createCategory(data) / updateCategory(id, data)`
- `getProducts() / createProduct(data) / updateProduct(id, data)`
- `getUsers() / createUser(data) / updateUser(id, data)`
- `getBranches() / createBranch(data) / updateBranch(id, data)`
- `getDirectorDashboard() / getManagerDashboard() / getAgentDashboard()`

### Authentication Manager (`js/auth.js`)
Session management:
```javascript
// Login
await auth.login(username, password);

// Check authentication
if (auth.isAuthenticated()) { ... }

// Get current user
const user = auth.getCurrentUser();

// Check role
if (auth.hasRole('director')) { ... }

// Logout
await auth.logout();

// Protect pages
requireAuth();
```

### Utilities (`js/utils.js`)
Helper functions:
```javascript
// Formatting
formatCurrency(100)        // ₦100.00
formatDate(date)           // Jun 10, 2026
formatNumber(1000)         // 1,000

// UI Helpers
getStatusBadge('active')   // <span class="badge bg-success">Active</span>
getRoleBadge('director')   // <span class="badge bg-primary">Director</span>
createAvatar(name)         // Avatar with initials

// Notifications
showSuccess('Success!')
showError('Error!')
showWarning('Warning!')

// Storage
Storage.set(key, value)
Storage.get(key)
```

## 🎨 Styling

### Color Scheme
- **Primary**: `#2c3e50` (Dark blue-gray)
- **Secondary**: `#3498db` (Sky blue)
- **Success**: `#27ae60` (Green)
- **Danger**: `#e74c3c` (Red)
- **Warning**: `#f39c12` (Orange)

### Responsive Design
- Mobile-first approach
- Breakpoints at 768px (tablet) and 1024px (desktop)
- Sidebar collapses on mobile
- Touch-friendly buttons

### CSS Classes
```html
<!-- Card with shadow -->
<div class="table-container">...</div>

<!-- Status badge -->
<span class="badge bg-success">Active</span>

<!-- Stat card -->
<div class="stat-card success">
  <div class="stat-value">₦100,000</div>
  <div class="stat-label">Total Sales</div>
</div>

<!-- Button group -->
<div class="action-buttons">
  <button class="btn btn-sm btn-warning">Edit</button>
  <button class="btn btn-sm btn-danger">Delete</button>
</div>
```

## 📡 API Integration

### Request Flow
1. **Form Submission** → 2. **API Call** → 3. **Response** → 4. **UI Update** → 5. **Notification**

### Example: Create Category
```javascript
async function saveCategory(event) {
  event.preventDefault();
  
  const data = {
    name: document.getElementById('categoryName').value,
    status: 'active'
  };

  try {
    const response = await api.createCategory(data);
    if (response.success) {
      showSuccess('Category created');
      // Reload list
      loadCategories();
    }
  } catch (error) {
    showError(error.message);
  }
}
```

### Error Handling
- API errors automatically show as notifications
- Validation errors displayed on form
- Network errors caught and user-friendly message shown

## 🔄 Common Workflows

### Add a New Product
1. Go to **Products** page
2. Click **"Add Product"** button
3. Fill form:
   - Product Name
   - Category (dropdown)
   - Price
   - Reorder Level
4. Click **Save**
5. See success message
6. Table auto-refreshes

### Create a User
1. Go to **Users** page
2. Click **"Add User"** button
3. Fill form:
   - Full Name
   - Username (unique)
   - Password (min 8 chars)
   - Role (Director/Manager/Sales Agent)
   - Branch (optional)
4. Click **Save**
5. User can login with credentials

### View Director Dashboard
1. Login with `director` account
2. Automatically redirected to director dashboard
3. See:
   - Company-wide statistics
   - Top products
   - Sales trends
   - Quick action buttons

## ⚙️ Configuration

### API Base URL
Located in `js/api.js`:
```javascript
const API_BASE_URL = 'http://localhost:5000/api';
```

Change if your API runs on different host/port.

### Session Storage
- `localStorage` used for persistent login
- Auto-restores session on page refresh
- Logout clears all session data

## 🐛 Troubleshooting

### Login Not Working
- ❌ Check if backend running on port 5000
- ❌ Verify database has seed data (`node sql/seed.js`)
- ❌ Check browser console for errors (F12)
- ❌ Verify CORS enabled on backend

### Page Redirects to Login
- ✅ Check localStorage for token
- ✅ Token may have expired (7 days)
- ✅ User may be inactive in database

### Form Not Submitting
- ✅ Check browser console for errors
- ✅ Verify all required fields filled
- ✅ Check API response in Network tab
- ✅ Verify form validation rules

### Table Not Updating
- ✅ Refresh page manually
- ✅ Check browser console
- ✅ Verify API endpoint working
- ✅ Check Network tab for failed requests

## 📋 Features Checklist

### Implemented ✅
- [x] Login/Logout
- [x] Dashboard (Director)
- [x] Categories CRUD
- [x] Products CRUD
- [x] Users CRUD
- [x] Branches CRUD
- [x] Search & Filter
- [x] Role-based access
- [x] Responsive design
- [x] API integration

### Coming Soon ⏳
- [ ] Sales management
- [ ] Inventory tracking
- [ ] Reports generation
- [ ] Audit log viewer
- [ ] Manager dashboard
- [ ] Sales agent dashboard
- [ ] PDF export
- [ ] Data charts/graphs

## 📝 Notes

- Session stored in browser localStorage
- Clear browser data to reset session
- Backend API must be running
- Test data populated via `sql/seed.js`
- Password reset available in Users page
- All timestamps in UTC

## 💡 Tips

1. **Keyboard Shortcuts**
   - `Enter` to submit forms
   - `Ctrl+K` to search (if implemented)

2. **Search Tips**
   - Search is case-insensitive
   - Search as you type
   - Filters apply immediately

3. **Mobile**
   - Sidebar auto-hides on mobile
   - Tables are scrollable on small screens
   - Touch-optimized buttons

4. **Performance**
   - API calls cached where appropriate
   - Minimal page reloads
   - Lazy loading for large lists

## 🤝 Support

For issues or questions:
1. Check browser console (F12)
2. Verify backend API running
3. Check Network tab for failed requests
4. Review API response in Dev Tools

---

**Version**: 1.0.0  
**Last Updated**: June 2026  
**Built with**: Bootstrap 5, Vanilla JS, HTML5
