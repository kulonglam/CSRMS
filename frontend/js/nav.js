// Shared navigation and role helpers
const SIDEBARS = {
  director: [
    { href: 'dashboard-director.html', icon: 'fa-th', label: 'Dashboard', page: 'dashboard' },
    { href: 'categories.html', icon: 'fa-list', label: 'Categories', page: 'categories' },
    { href: 'products.html', icon: 'fa-box', label: 'Products', page: 'products' },
    { href: 'branches.html', icon: 'fa-sitemap', label: 'Branches', page: 'branches' },
    { href: 'users.html', icon: 'fa-users', label: 'Users', page: 'users' },
    { href: 'inventory.html', icon: 'fa-warehouse', label: 'Inventory', page: 'inventory' },
    { href: 'procurement.html', icon: 'fa-truck', label: 'Procurement', page: 'procurement' },
    { href: 'sales.html', icon: 'fa-shopping-cart', label: 'Sales', page: 'sales' },
    { href: 'reports.html', icon: 'fa-chart-line', label: 'Reports', page: 'reports' },
    { href: 'audit-logs.html', icon: 'fa-history', label: 'Audit Logs', page: 'audit-logs' },
  ],
  manager: [
    { href: 'dashboard-manager.html', icon: 'fa-th', label: 'Dashboard', page: 'dashboard' },
    { href: 'categories.html', icon: 'fa-list', label: 'Categories', page: 'categories' },
    { href: 'products.html', icon: 'fa-box', label: 'Products', page: 'products' },
    { href: 'procurement.html', icon: 'fa-truck', label: 'Procurement', page: 'procurement' },
    { href: 'inventory.html', icon: 'fa-warehouse', label: 'Inventory', page: 'inventory' },
    { href: 'sales.html', icon: 'fa-shopping-cart', label: 'Sales', page: 'sales' },
    { href: 'cashier-balancing.html', icon: 'fa-calculator', label: 'Cashier Balancing', page: 'cashier-balancing' },
    { href: 'notifications.html', icon: 'fa-bell', label: 'Notifications', page: 'notifications' },
    { href: 'reports.html', icon: 'fa-chart-line', label: 'Reports', page: 'reports' },
    { href: 'audit-logs.html', icon: 'fa-history', label: 'Audit Logs', page: 'audit-logs' },
  ],
  sales_agent: [
    { href: 'dashboard-agent.html', icon: 'fa-th', label: 'Dashboard', page: 'dashboard' },
    { href: 'products.html', icon: 'fa-box', label: 'Available Products', page: 'products' },
    { href: 'sales.html', icon: 'fa-shopping-cart', label: 'My Sales', page: 'sales' },
    { href: 'audit-logs.html', icon: 'fa-history', label: 'Activity Log', page: 'audit-logs' },
  ],
};

const ROLE_LABELS = {
  director: 'Director',
  manager: 'Manager',
  sales_agent: 'Sales Agent',
};

function getUserRole() {
  return auth.getCurrentUser()?.role;
}

function isDirector() {
  return getUserRole() === 'director';
}

function isManager() {
  return getUserRole() === 'manager';
}

function isAgent() {
  return getUserRole() === 'sales_agent';
}

/** SRS 3.2 — Branch Manager: categories, products, barcodes, prices, procurement, inventory. */
function canManageCatalog() {
  return isManager();
}

/** SRS 3.2 — stock adjustments and procurement recording. */
function canModifyInventory() {
  return isManager();
}

/** SRS 3.3 — Sales Agent: process cash sales; SRS 3.1 — Director shall not record sales. */
function canRecordSales() {
  return isAgent();
}

/** SRS 3.1 / 3.2 — company-wide vs branch management reports. */
function canAccessReports() {
  return isDirector() || isManager();
}

function renderSidebar(activePage) {
  const el = document.getElementById('sidebarMenu');
  if (!el) return;
  const items = SIDEBARS[getUserRole()] || SIDEBARS.director;
  el.innerHTML = `
    <li class="sidebar-section-label" aria-hidden="true">Menu</li>
    ${items.map(item => `
    <li><a href="${item.href}"${item.page === activePage ? ' class="active" aria-current="page"' : ''}>
      <i class="fas ${item.icon}" aria-hidden="true"></i><span>${item.label}</span>
    </a></li>
  `).join('')}`;
}

function renderNavbar(options = {}) {
  const mount = document.getElementById('appNavbar');
  if (!mount) return;
  const logoutClass = options.logoutClass ? ` ${options.logoutClass}` : '';
  const showBranch = options.showBranch !== false;
  const role = getUserRole();
  const roleLabel = ROLE_LABELS[role] || 'User';

  mount.innerHTML = `
    <a href="#main-content" class="skip-link">Skip to content</a>
    <nav class="navbar navbar-custom" aria-label="Main navigation">
      <div class="container-fluid">
        <div class="d-flex align-items-center gap-2">
          <button type="button" class="sidebar-toggle d-lg-none" id="sidebarToggle" aria-label="Open navigation menu" aria-expanded="false" aria-controls="appSidebar">
            <i class="fas fa-bars" aria-hidden="true"></i>
          </button>
          <a class="navbar-brand" href="#" aria-label="CSRMS home">
            <span class="brand-icon" aria-hidden="true"><i class="fas fa-store"></i></span>
            <span>CSRMS</span>
          </a>
        </div>
        <div class="d-flex align-items-center gap-2 ms-auto">
          <div class="nav-user d-none d-sm-flex" aria-label="Signed in user">
            <span class="nav-user-avatar" aria-hidden="true"><i class="fas fa-user"></i></span>
            <div>
              <div class="nav-user-name"><span id="navUserName">User</span></div>
              ${showBranch ? '<div class="nav-user-meta" id="branchName"></div>' : ''}
            </div>
            <span class="role-badge">${roleLabel}</span>
          </div>
          <button type="button" class="btn btn-logout btn-sm${logoutClass}" id="navLogoutBtn">Logout</button>
        </div>
      </div>
    </nav>
  `;
}

function setupNavbar() {
  document.body.classList.add('app-body');
  const user = auth.getCurrentUser();
  const nameEl = document.getElementById('navUserName');
  if (nameEl) nameEl.textContent = user?.full_name || 'User';
  const branchEl = document.getElementById('branchName');
  if (branchEl) {
    branchEl.textContent = user?.branch_name ? user.branch_name : '';
  }
  injectNavExtras();
  bindMobileSidebar();
  bindLogoutButton();
}

function bindLogoutButton() {
  const logoutBtn = document.getElementById('navLogoutBtn');
  if (!logoutBtn || logoutBtn.dataset.bound) return;
  logoutBtn.dataset.bound = '1';
  logoutBtn.addEventListener('click', () => {
    if (typeof window.handleLogout === 'function') window.handleLogout();
  });
}

function injectNavExtras() {
  const nav = document.querySelector('.navbar-custom .d-flex.ms-auto');
  if (!nav) return;
  const logoutBtn = nav.querySelector('.btn-logout, #navLogoutBtn');
  if (!logoutBtn) return;
  const onChangePassword = /change-password\.html$/i.test(window.location.pathname);
  if (!onChangePassword && !nav.querySelector('.nav-password')) {
    logoutBtn.insertAdjacentHTML('beforebegin', `
      <a href="change-password.html" class="btn btn-outline-light btn-sm nav-password" title="Change Password" aria-label="Change password">
        <i class="fas fa-key" aria-hidden="true"></i>
      </a>
    `);
  }
  if (isManager() && !nav.querySelector('.nav-notifications')) {
    logoutBtn.insertAdjacentHTML('beforebegin', `
      <a href="notifications.html" class="btn btn-outline-light btn-sm position-relative nav-notifications" title="Notifications" aria-label="Notifications">
        <i class="fas fa-bell" aria-hidden="true"></i>
        <span id="notificationBadge" class="badge bg-danger position-absolute top-0 start-100 translate-middle" style="display:none">0</span>
      </a>
    `);
  }
}

function ensureSidebarBackdrop() {
  if (document.getElementById('sidebarBackdrop')) return;
  document.body.insertAdjacentHTML('beforeend', '<div id="sidebarBackdrop" class="sidebar-backdrop" aria-hidden="true"></div>');
}

function bindMobileSidebar() {
  ensureSidebarBackdrop();
  const toggle = document.getElementById('sidebarToggle');
  const sidebar = document.querySelector('.sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (!toggle || !sidebar || !backdrop) return;

  if (sidebar.id !== 'appSidebar') sidebar.id = 'appSidebar';

  const close = () => {
    sidebar.classList.remove('open');
    backdrop.classList.remove('show');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation menu');
  };

  const open = () => {
    sidebar.classList.add('open');
    backdrop.classList.add('show');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close navigation menu');
  };

  if (!toggle.dataset.bound) {
    toggle.dataset.bound = '1';
    toggle.addEventListener('click', () => {
      if (sidebar.classList.contains('open')) close();
      else open();
    });
    backdrop.addEventListener('click', close);
    sidebar.querySelectorAll('a').forEach(link => link.addEventListener('click', close));
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 992) close();
    });
  }
}

function enhanceAppShell() {
  document.body.classList.add('app-body');
  const mainCol = document.querySelector('.container-fluid .col-md-10');
  if (mainCol && !mainCol.id) {
    mainCol.id = 'main-content';
    mainCol.setAttribute('role', 'main');
    mainCol.classList.add('app-main');
  }
  document.querySelectorAll('[style*="background: white"][style*="padding: 20px"]').forEach(el => {
    el.classList.add('quick-actions-panel');
    el.removeAttribute('style');
  });
}

function applyRoleRestrictions() {
  document.querySelectorAll('[data-manager-only]').forEach(el => {
    el.style.display = canManageCatalog() ? '' : 'none';
  });
  document.querySelectorAll('[data-director-hide]').forEach(el => {
    el.style.display = isDirector() ? 'none' : '';
  });
}

async function loadNotificationBadge() {
  const badge = document.getElementById('notificationBadge');
  if (!badge || !isManager()) return;
  try {
    const res = await api.getUnreadNotificationCount();
    const count = res.data?.count || 0;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-block' : 'none';
  } catch {
    badge.style.display = 'none';
  }
}

function initPage(activePage, options = {}) {
  renderNavbar(options);
  setupNavbar();
  if (options.navbarOnly) return;
  renderSidebar(activePage);
  enhanceAppShell();
  applyRoleRestrictions();
  loadNotificationBadge();
}
