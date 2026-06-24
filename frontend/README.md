# CSRMS Frontend

The frontend is served by the Express app at **http://localhost:5000** (same origin as the API).

## Structure

```
frontend/
├── index.html          # Login page
├── css/style.css       # Global styles
├── js/
│   ├── layout.js       # Shared script/CSS loader
│   ├── api.js          # API client (uses /api on same origin)
│   ├── auth.js         # Authentication & session
│   ├── nav.js          # Navbar, sidebar, role helpers
│   └── utils.js        # Formatting helpers
└── pages/              # Role-based app pages
```

## Development

1. Start the backend (serves frontend automatically):

```bash
npm run dev
```

2. Open **http://localhost:5000**

No separate Live Server or port 5500/6000 is needed.

## Page initialization

App pages use the shared layout loader:

```html
<script src="../js/layout.js"></script>
<script>
CSRMSLayout.boot(async () => {
  requireAuth();
  initPage('products');
  // page-specific logic...
}, {});
</script>
```

`nav.js` renders the navbar (`#appNavbar`) and sidebar (`#sidebarMenu`) dynamically per role.

## Demo credentials

| Role | Username | Password |
|------|----------|----------|
| Director | `director` | `Director@123` |
| Manager | `manager1` | `Manager@123` |
| Sales Agent | `agent1` | `Agent@123` |
