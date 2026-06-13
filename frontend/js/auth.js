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

  // Verify session
  async verifySession() {
    if (!this.isAuthenticated()) return false;
    try {
      const response = await api.getCurrentUser();
      if (response.success) {
        this.user = response.data;
        localStorage.setItem('user', JSON.stringify(this.user));
        return true;
      }
      return false;
    } catch {
      this.clearSession();
      return false;
    }
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

// Protect pages - redirect to login if not authenticated
function requireAuth() {
  if (!auth.isAuthenticated()) {
    window.location.href = '../index.html';
  }
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

// Show warning notification
function showWarning(message) {
  showNotification(message, 'warning');
}
