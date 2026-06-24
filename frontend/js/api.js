// API Configuration — same-origin when frontend is served by Express
const API_BASE_URL = `${window.location.origin}/api`;

class APIClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  getAuthHeader() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async request(method, endpoint, data = null) {
    const url = `${this.baseURL}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
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

  async downloadFile(endpoint, filename) {
    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, { headers: { ...this.getAuthHeader() } });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.message || `HTTP ${response.status}`);
    }
    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  }

  // Authentication
  async login(username, password) {
    return this.request('POST', '/auth/login', { username, password });
  }

  async logout() {
    return this.request('POST', '/auth/logout');
  }

  async getCurrentUser() {
    return this.request('GET', '/auth/me');
  }

  async changePassword(current_password, new_password) {
    return this.request('POST', '/auth/change-password', { current_password, new_password });
  }

  async forgotPassword(username) {
    return this.request('POST', '/auth/forgot-password', { username });
  }

  async resetPassword(token, new_password) {
    return this.request('POST', '/auth/reset-password', { token, new_password });
  }

  // Categories
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

  // Products
  async getProducts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/products${query ? '?' + query : ''}`);
  }

  async getProduct(id) {
    return this.request('GET', `/products/${id}`);
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

  async updateProductPrice(id, prices) {
    return this.request('PATCH', `/products/${id}/price`, prices);
  }

  async getProductBarcodes(productId) {
    return this.request('GET', `/products/${productId}/barcodes`);
  }

  async addProductBarcode(productId, barcode_number) {
    return this.request('POST', `/products/${productId}/barcodes`, { barcode_number });
  }

  async updateBarcode(id, data) {
    return this.request('PUT', `/barcodes/${id}`, data);
  }

  async deleteBarcode(id) {
    return this.request('DELETE', `/barcodes/${id}`);
  }

  async lookupBarcode(barcode) {
    return this.request('GET', `/barcodes/lookup/${encodeURIComponent(barcode)}`);
  }

  // Users
  async getUsers() {
    return this.request('GET', '/users');
  }

  async createUser(data) {
    return this.request('POST', '/users', data);
  }

  async updateUser(id, data) {
    return this.request('PUT', `/users/${id}`, data);
  }

  async resetUserPassword(id, new_password) {
    return this.request('POST', `/users/${id}/reset-password`, { new_password });
  }

  async deleteUser(id) {
    return this.request('DELETE', `/users/${id}`);
  }

  // Branches
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

  // Inventory
  async getInventory(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/inventory${query ? '?' + query : ''}`);
  }

  async adjustStock(data) {
    return this.request('POST', '/inventory/adjust', data);
  }

  async getStockAdjustments() {
    return this.request('GET', '/inventory/adjustments');
  }

  // Procurement
  async getProcurements(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/procurements${query ? '?' + query : ''}`);
  }

  async createProcurement(data) {
    return this.request('POST', '/procurements', data);
  }

  async updateProcurement(id, data) {
    return this.request('PUT', `/procurements/${id}`, data);
  }

  async deleteProcurement(id) {
    return this.request('DELETE', `/procurements/${id}`);
  }

  // Sales
  async getSales(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/sales${query ? '?' + query : ''}`);
  }

  async getSale(id) {
    return this.request('GET', `/sales/${id}`);
  }

  async createSale(data) {
    return this.request('POST', '/sales', data);
  }

  async voidSale(id) {
    return this.request('PATCH', `/sales/${id}/void`);
  }

  // Cashier balancing
  async getCashierBalances(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/cashier-balancing${query ? '?' + query : ''}`);
  }

  async getAgentDailySummary(agentId, date) {
    return this.request('GET', `/cashier-balancing/agent/${agentId}/summary?date=${date}`);
  }

  async submitCashierBalance(data) {
    return this.request('POST', '/cashier-balancing', data);
  }

  async getMyCashierSummary(date) {
    return this.request('GET', `/cashier-balancing/my-summary?date=${date}`);
  }

  async submitMyCashierBalance(data) {
    return this.request('POST', '/cashier-balancing/submit', data);
  }

  async approveCashierBalance(id) {
    return this.request('PATCH', `/cashier-balancing/${id}/approve`);
  }

  async rejectCashierBalance(id, reason) {
    return this.request('PATCH', `/cashier-balancing/${id}/reject`, { reason });
  }

  // Receipts
  async downloadReceiptPDF(saleId) {
    return this.downloadFile(`/receipts/${saleId}/pdf`, `receipt-${saleId}.pdf`);
  }

  // Notifications
  async getNotifications(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/notifications${query ? '?' + query : ''}`);
  }

  async getUnreadNotificationCount() {
    return this.request('GET', '/notifications/unread-count');
  }

  async markNotificationRead(id) {
    return this.request('PATCH', `/notifications/${id}/read`);
  }

  async markAllNotificationsRead() {
    return this.request('PATCH', '/notifications/read-all');
  }

  // Dashboards
  async getDirectorDashboard() {
    return this.request('GET', '/dashboard/director');
  }

  async getManagerDashboard() {
    return this.request('GET', '/dashboard/manager');
  }

  async getAgentDashboard() {
    return this.request('GET', '/dashboard/agent');
  }

  // Reports
  async getDailySalesReport(date, branchId = null) {
    let url = `/reports/sales/daily?date=${date}`;
    if (branchId) url += `&branch_id=${branchId}`;
    return this.request('GET', url);
  }

  async getSalesTrends(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/reports/sales/trends${query ? '?' + query : ''}`);
  }

  async getInventoryReport(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/reports/inventory${query ? '?' + query : ''}`);
  }

  async getProcurementReport(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/reports/procurement${query ? '?' + query : ''}`);
  }

  async getCashierBalancingReport(date) {
    return this.request('GET', `/reports/cashier-balancing?date=${date}`);
  }

  async getCompanyPerformanceReport(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/reports/company/performance${query ? '?' + query : ''}`);
  }

  // Audit logs
  async getAuditLogs(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/audit-logs${query ? '?' + query : ''}`);
  }

  async downloadAuditLogsCsv(params = {}) {
    const query = new URLSearchParams(params).toString();
    const stamp = new Date().toISOString().slice(0, 10);
    return this.downloadFile(`/audit-logs/export${query ? '?' + query : ''}`, `audit-logs-${stamp}.csv`);
  }
}

const api = new APIClient();
window.api = api;
