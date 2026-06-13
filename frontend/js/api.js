// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// API Helper Class
class APIClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Get authorization header
  getAuthHeader() {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  // Generic fetch wrapper
  async request(method, endpoint, data = null) {
    const url = `${this.baseURL}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error(`API Error [${method} ${endpoint}]:`, error);
      throw error;
    }
  }

  // Authentication APIs
  async login(username, password) {
    return this.request('POST', '/auth/login', { username, password });
  }

  async logout() {
    return this.request('POST', '/auth/logout');
  }

  async getCurrentUser() {
    return this.request('GET', '/auth/me');
  }

  // Categories APIs
  async getCategories() {
    return this.request('GET', '/categories');
  }

  async createCategory(data) {
    return this.request('POST', '/categories', data);
  }

  async updateCategory(id, data) {
    return this.request('PUT', `/categories/${id}`, data);
  }

  async deleteCategory(id) {
    return this.request('DELETE', `/categories/${id}`);
  }

  // Products APIs
  async getProducts() {
    return this.request('GET', '/products');
  }

  async createProduct(data) {
    return this.request('POST', '/products', data);
  }

  async updateProduct(id, data) {
    return this.request('PUT', `/products/${id}`, data);
  }

  async deleteProduct(id) {
    return this.request('DELETE', `/products/${id}`);
  }

  async updateProductPrice(id, price) {
    return this.request('PUT', `/products/${id}/price`, { price });
  }

  // Users APIs
  async getUsers() {
    return this.request('GET', '/users');
  }

  async createUser(data) {
    return this.request('POST', '/users', data);
  }

  async updateUser(id, data) {
    return this.request('PUT', `/users/${id}`, data);
  }

  async resetUserPassword(id, password) {
    return this.request('POST', `/users/${id}/reset-password`, { password });
  }

  // Branches APIs
  async getBranches() {
    return this.request('GET', '/branches');
  }

  async createBranch(data) {
    return this.request('POST', '/branches', data);
  }

  async updateBranch(id, data) {
    return this.request('PUT', `/branches/${id}`, data);
  }

  async deleteBranch(id) {
    return this.request('DELETE', `/branches/${id}`);
  }

  // Inventory APIs
  async getInventory() {
    return this.request('GET', '/inventory');
  }

  async updateInventory(id, data) {
    return this.request('PUT', `/inventory/${id}`, data);
  }

  // Sales APIs
  async getSales() {
    return this.request('GET', '/sales');
  }

  async createSale(data) {
    return this.request('POST', '/sales', data);
  }

  async updateSale(id, data) {
    return this.request('PUT', `/sales/${id}`, data);
  }

  // Dashboard APIs
  async getDirectorDashboard() {
    return this.request('GET', '/dashboard/director');
  }

  async getManagerDashboard() {
    return this.request('GET', '/dashboard/manager');
  }

  async getAgentDashboard() {
    return this.request('GET', '/dashboard/agent');
  }

  // Reports APIs
  async getReports() {
    return this.request('GET', '/reports');
  }

  // Audit Logs APIs
  async getAuditLogs() {
    return this.request('GET', '/audit-logs');
  }
}

// Create global API instance
const api = new APIClient();
