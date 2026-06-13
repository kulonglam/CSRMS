// Utility Functions

// Format date
function formatDate(dateString) {
  if (!dateString) return '-';
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  const formatted = new Date(dateString).toLocaleDateString('en-US', options);
  return formatted === 'Invalid Date' ? '-' : formatted;
}

// Format currency (Ugandan Shilling)
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

// Format number with commas
function formatNumber(num) {
  return num.toLocaleString('en-UG');
}

// Get status badge HTML
function getStatusBadge(status) {
  const badges = {
    'active': '<span class="badge bg-success">Active</span>',
    'inactive': '<span class="badge bg-danger">Inactive</span>',
    'pending': '<span class="badge bg-warning">Pending</span>',
    'completed': '<span class="badge bg-success">Completed</span>',
    'cancelled': '<span class="badge bg-danger">Cancelled</span>',
  };
  return badges[status] || `<span class="badge bg-secondary">${status}</span>`;
}

// Get role badge HTML
function getRoleBadge(role) {
  const badges = {
    'director': '<span class="badge bg-primary">Director</span>',
    'manager': '<span class="badge bg-info">Manager</span>',
    'sales_agent': '<span class="badge bg-success">Sales Agent</span>',
  };
  return badges[role] || `<span class="badge bg-secondary">${role}</span>`;
}

// Capitalize first letter
function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

// Create table row HTML
function createTableRow(data, columns) {
  const cells = columns.map(col => {
    let value = data[col.field];
    if (col.formatter) {
      value = col.formatter(value, data);
    }
    return `<td>${value}</td>`;
  }).join('');
  return `<tr>${cells}</tr>`;
}

// Debounce function
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

// Validate email
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Validate phone
function isValidPhone(phone) {
  return /^(\d{10,15})$/.test(phone.replace(/\D/g, ''));
}

// Get initials from name
function getInitials(name) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();
}

// Get color for avatar
function getAvatarColor(name) {
  const colors = ['bg-primary', 'bg-success', 'bg-danger', 'bg-warning', 'bg-info'];
  const hash = name.charCodeAt(0);
  return colors[hash % colors.length];
}

// Create avatar HTML
function createAvatar(name, size = 'md') {
  const sizeClass = size === 'sm' ? 'width: 30px; height: 30px; font-size: 12px;' : 
                    size === 'lg' ? 'width: 60px; height: 60px; font-size: 24px;' :
                    'width: 40px; height: 40px; font-size: 16px;';
  return `
    <div class="rounded-circle ${getAvatarColor(name)} text-white d-flex align-items-center justify-content-center" style="${sizeClass}">
      ${getInitials(name)}
    </div>
  `;
}

// Local Storage helpers
const Storage = {
  set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
  get: (key) => {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch {
      return null;
    }
  },
  remove: (key) => localStorage.removeItem(key),
  clear: () => localStorage.clear(),
};

// Session Storage helpers
const Session = {
  set: (key, value) => sessionStorage.setItem(key, JSON.stringify(value)),
  get: (key) => {
    try {
      return JSON.parse(sessionStorage.getItem(key));
    } catch {
      return null;
    }
  },
  remove: (key) => sessionStorage.removeItem(key),
  clear: () => sessionStorage.clear(),
};
