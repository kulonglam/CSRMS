// Utility Functions

function formatDate(dateString) {
  if (!dateString) return '-';
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  const formatted = new Date(dateString).toLocaleDateString('en-US', options);
  return formatted === 'Invalid Date' ? '-' : formatted;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

function getStatusBadge(status) {
  const badges = {
    active: '<span class="badge bg-success">Active</span>',
    inactive: '<span class="badge bg-danger">Inactive</span>',
    pending: '<span class="badge bg-warning">Pending</span>',
    completed: '<span class="badge bg-success">Completed</span>',
    cancelled: '<span class="badge bg-danger">Cancelled</span>',
  };
  return badges[status] || `<span class="badge bg-secondary">${status}</span>`;
}

function getRoleBadge(role) {
  const badges = {
    director: '<span class="badge bg-primary">Director</span>',
    manager: '<span class="badge bg-info">Manager</span>',
    sales_agent: '<span class="badge bg-success">Sales Agent</span>',
  };
  return badges[role] || `<span class="badge bg-secondary">${role}</span>`;
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
