// Shared navigation and role helpers
const SIDEBARS = {
  director: [
    { href: 'dashboard-director.html', icon: 'fa-chart-line', label: 'Dashboard', page: 'dashboard' },
    { href: 'categories.html', icon: 'fa-list', label: 'Categories', page: 'categories' },
    { href: 'products.html', icon: 'fa-box', label: 'Products', page: 'products' },
    { href: 'branches.html', icon: 'fa-sitemap', label: 'Branches', page: 'branches' },
    { href: 'users.html', icon: 'fa-users', label: 'Users', page: 'users' },
    { href: 'inventory.html', icon: 'fa-warehouse', label: 'Inventory', page: 'inventory' },
    { href: 'procurement.html', icon: 'fa-truck', label: 'Procurement', page: 'procurement' },
    { href: 'sales.html', icon: 'fa-shopping-cart', label: 'Sales', page: 'sales' },
    { href: 'reports.html', icon: 'fa-file-chart-line', label: 'Reports', page: 'reports' },
    { href: 'audit-logs.html', icon: 'fa-history', label: 'Audit Logs', page: 'audit-logs' },
  ],
  manager: [
    { href: 'dashboard-manager.html', icon: 'fa-chart-line', label: 'Dashboard', page: 'dashboard' },
    { href: 'products.html', icon: 'fa-box', label: 'Products', page: 'products' },
    { href: 'procurement.html', icon: 'fa-truck', label: 'Procurement', page: 'procurement' },
    { href: 'inventory.html', icon: 'fa-warehouse', label: 'Inventory', page: 'inventory' },
    { href: 'sales.html', icon: 'fa-shopping-cart', label: 'Sales', page: 'sales' },
    { href: 'cashier-balancing.html', icon: 'fa-cash-register', label: 'Cashier Balancing', page: 'cashier-balancing' },
    { href: 'notifications.html', icon: 'fa-bell', label: 'Notifications', page: 'notifications' },
    { href: 'reports.html', icon: 'fa-file-chart-line', label: 'Reports', page: 'reports' },
    { href: 'audit-logs.html', icon: 'fa-history', label: 'Audit Logs', page: 'audit-logs' },
  ],
  sales_agent: [
    { href: 'dashboard-agent.html', icon: 'fa-chart-line', label: 'Dashboard', page: 'dashboard' },
    { href: 'products.html', icon: 'fa-box', label: 'Available Products', page: 'products' },
    { href: 'sales.html', icon: 'fa-shopping-cart', label: 'My Sales', page: 'sales' },
    { href: 'audit-logs.html', icon: 'fa-history', label: 'Activity Log', page: 'audit-logs' },
  ],
};

function getUserRole() {
  return auth.getCurrentUser()?.role;
}

function canManage() {
  return getUserRole() === 'manager';
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

function renderSidebar(activePage) {
  const el = document.getElementById('sidebarMenu');
  if (!el) return;
  const items = SIDEBARS[getUserRole()] || SIDEBARS.director;
  el.innerHTML = items.map(item => `
    <li><a href="${item.href}"${item.page === activePage ? ' class="active"' : ''}>
      <i class="fas ${item.icon} me-2"></i>${item.label}
    </a></li>
  `).join('');
}

function setupNavbar() {
  const user = auth.getCurrentUser();
  const nameEl = document.getElementById('navUserName') || document.getElementById('userName');
  if (nameEl) nameEl.textContent = user?.full_name || 'User';
  const branchEl = document.getElementById('branchName');
  if (branchEl && user?.branch_name) {
    branchEl.textContent = `(${user.branch_name})`;
  }
  injectNavExtras();
}

function injectNavExtras() {
  const nav = document.querySelector('.navbar-custom .d-flex');
  if (!nav) return;
  const logoutBtn = nav.querySelector('[onclick*="handleLogout"]');
  if (!logoutBtn) return;
  if (!nav.querySelector('.nav-password')) {
    logoutBtn.insertAdjacentHTML('beforebegin', `
      <a href="change-password.html" class="btn btn-outline-light btn-sm nav-password" title="Change Password"><i class="fas fa-key"></i></a>
    `);
  }
  if (isManager() && !nav.querySelector('.nav-notifications')) {
    logoutBtn.insertAdjacentHTML('beforebegin', `
      <a href="notifications.html" class="btn btn-outline-light btn-sm position-relative nav-notifications" title="Notifications">
        <i class="fas fa-bell"></i>
        <span id="notificationBadge" class="badge bg-danger position-absolute top-0 start-100 translate-middle" style="display:none">0</span>
      </a>
    `);
  }
}

function applyRoleRestrictions() {
  document.querySelectorAll('[data-manager-only]').forEach(el => {
    el.style.display = canManage() ? '' : 'none';
  });
  document.querySelectorAll('[data-director-hide]').forEach(el => {
    el.style.display = isDirector() ? 'none' : '';
  });
}

async function loadNotificationBadge() {
  const badge = document.getElementById('notificationBadge');
  if (!badge || !canManage()) return;
  try {
    const res = await api.getUnreadNotificationCount();
    const count = res.data?.count || 0;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-block' : 'none';
  } catch {
    badge.style.display = 'none';
  }
}

function initPage(activePage) {
  setupNavbar();
  renderSidebar(activePage);
  applyRoleRestrictions();
  loadNotificationBadge();
}
