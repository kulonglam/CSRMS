// Authentication Manager
class AuthManager {
  constructor() {
    this.token = localStorage.getItem('token');
    this.user = JSON.parse(localStorage.getItem('user') || 'null');
  }

  // Login
  async login(username, password) {
    try {
      const response = await api.login(username, password);
      if (response.success) {
        this.setSession(response.data.token, response.data.user);
        return response;
      }
      throw new Error(response.message);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Set session data
  setSession(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('loginTime', Date.now().toString());
    localStorage.setItem('lastActivity', Date.now().toString());
  }

  // Logout
  async logout() {
    try {
      await api.logout();
    } catch (error) {
      console.warn('Logout error:', error);
    } finally {
      this.clearSession();
    }
  }

  // Clear session
  clearSession() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('loginTime');
    localStorage.removeItem('lastActivity');
  }

  // Check if authenticated
  isAuthenticated() {
    return !!this.token && !!this.user;
  }

  // Get current user
  getCurrentUser() {
    return this.user;
  }

  // Get user role
  getUserRole() {
    return this.user?.role;
  }

  // Check if user has role
  hasRole(role) {
    if (Array.isArray(role)) {
      return role.includes(this.user?.role);
    }
    return this.user?.role === role;
  }

  // Redirect based on role
  redirectToDashboard() {
    const role = this.getUserRole();
    const isInPages = window.location.pathname.includes('/pages/');
    const basePath = isInPages ? '..' : '.';
    
    switch (role) {
      case 'director':
        window.location.href = `${basePath}/pages/dashboard-director.html`;
        break;
      case 'manager':
        window.location.href = `${basePath}/pages/dashboard-manager.html`;
        break;
      case 'sales_agent':
        window.location.href = `${basePath}/pages/dashboard-agent.html`;
        break;
      default:
        window.location.href = `${basePath}/index.html`;
    }
  }
}

// Create global auth instance
const auth = new AuthManager();
window.auth = auth;

// Protect pages - redirect to login if not authenticated
function requireAuth() {
  if (!auth.isAuthenticated()) {
    window.location.href = '../index.html';
    return;
  }
  checkSessionTimeout();
}

const SESSION_IDLE_MS = 30 * 60 * 1000; // 30 minutes idle timeout
let lastActivityTouch = 0;

function touchActivity() {
  const now = Date.now();
  if (now - lastActivityTouch > 5000) {
    lastActivityTouch = now;
    localStorage.setItem('lastActivity', now.toString());
  }
}

function bindActivityTracking() {
  if (window._csrmsActivityBound) return;
  window._csrmsActivityBound = true;
  ['click', 'keydown', 'scroll', 'mousemove'].forEach(evt => {
    document.addEventListener(evt, touchActivity, { passive: true });
  });
}

function getLoginPath() {
  return window.location.pathname.includes('/pages/') ? '../index.html' : 'index.html';
}

function ensureSessionExpiredModal() {
  if (document.getElementById('sessionExpiredModal')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal fade" id="sessionExpiredModal" tabindex="-1" aria-labelledby="sessionExpiredTitle" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="sessionExpiredTitle">
              <i class="fas fa-clock me-2 text-warning" aria-hidden="true"></i>Session expired
            </h5>
          </div>
          <div class="modal-body">
            <p class="mb-0">Your session expired due to inactivity. Please sign in again to continue.</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary" id="sessionExpiredBtn">Sign in</button>
          </div>
        </div>
      </div>
    </div>
  `);
}

function showSessionExpiredModal() {
  if (typeof bootstrap === 'undefined') {
    window.location.href = getLoginPath();
    return;
  }
  ensureSessionExpiredModal();
  const modalEl = document.getElementById('sessionExpiredModal');
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  document.getElementById('sessionExpiredBtn').onclick = () => {
    modal.hide();
    window.location.href = getLoginPath();
  };
  modal.show();
}

function checkSessionTimeout() {
  const loginTime = parseInt(localStorage.getItem('loginTime') || '0', 10);
  const lastActivity = parseInt(localStorage.getItem('lastActivity') || loginTime.toString(), 10);
  const now = Date.now();

  if (loginTime && now - lastActivity > SESSION_IDLE_MS) {
    auth.clearSession();
    showSessionExpiredModal();
    return;
  }

  localStorage.setItem('lastActivity', now.toString());
  bindActivityTracking();
}

// Show notifications
function showNotification(message, type = 'info', duration = 3000) {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x`;
  alertDiv.style.zIndex = '9999';
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  document.body.appendChild(alertDiv);

  setTimeout(() => {
    alertDiv.remove();
  }, duration);
}

// Show error notification
function showError(message) {
  showNotification(message, 'danger');
}

// Show success notification
function showSuccess(message) {
  showNotification(message, 'success');
}

function ensureLogoutModal() {
  if (document.getElementById('logoutConfirmModal')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal fade" id="logoutConfirmModal" tabindex="-1" aria-labelledby="logoutConfirmTitle" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="logoutConfirmTitle">
              <i class="fas fa-sign-out-alt me-2 text-danger" aria-hidden="true"></i>Sign out
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p class="mb-0">Are you sure you want to logout? You will need to sign in again to continue.</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-danger" id="logoutConfirmBtn">Logout</button>
          </div>
        </div>
      </div>
    </div>
  `);
}

function confirmLogout() {
  return new Promise((resolve) => {
    if (typeof bootstrap === 'undefined') {
      resolve(window.confirm('Are you sure you want to logout?'));
      return;
    }

    ensureLogoutModal();
    const modalEl = document.getElementById('logoutConfirmModal');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    const confirmBtn = document.getElementById('logoutConfirmBtn');
    let confirmed = false;

    const onConfirm = () => {
      confirmed = true;
      modal.hide();
    };

    const onHidden = () => {
      confirmBtn.removeEventListener('click', onConfirm);
      modalEl.removeEventListener('hidden.bs.modal', onHidden);
      resolve(confirmed);
    };

    confirmBtn.addEventListener('click', onConfirm);
    modalEl.addEventListener('hidden.bs.modal', onHidden);
    modal.show();
  });
}

async function handleLogout() {
  const confirmed = await confirmLogout();
  if (!confirmed) return;
  try {
    await auth.logout();
    showSuccess('Logged out successfully');
    setTimeout(() => {
      window.location.href = '/';
    }, 500);
  } catch {
    showError('Logout failed');
  }
}

window.handleLogout = handleLogout;
