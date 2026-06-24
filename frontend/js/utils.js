// Utility Functions

function getLocalDateString(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function normalizeDateKey(value) {
  if (!value) return '';
  if (value instanceof Date) return getLocalDateString(value);
  const str = String(value);
  if (str.includes('T')) return getLocalDateString(new Date(str));
  return str.slice(0, 10);
}

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

function renderListPagination(containerId, pagination, loadFn) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!pagination || pagination.total === 0) {
    el.innerHTML = '';
    return;
  }
  const { page, total_pages, total } = pagination;
  if (typeof loadFn === 'function') {
    el._paginationLoadFn = loadFn;
    if (!el.dataset.paginationBound) {
      el.dataset.paginationBound = '1';
      el.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-page]');
        if (!btn || btn.disabled) return;
        el._paginationLoadFn?.(parseInt(btn.dataset.page, 10));
      });
    }
  }
  el.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mt-3 no-print">
      <small class="text-muted">${total} record(s) · Page ${page} of ${total_pages}</small>
      <div class="btn-group btn-group-sm">
        <button type="button" class="btn btn-outline-secondary" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>Previous</button>
        <button type="button" class="btn btn-outline-secondary" data-page="${page + 1}" ${page >= total_pages ? 'disabled' : ''}>Next</button>
      </div>
    </div>`;
}

function ensureConfirmModal() {
  if (document.getElementById('csrmsConfirmModal')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal fade" id="csrmsConfirmModal" tabindex="-1" aria-labelledby="csrmsConfirmTitle" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="csrmsConfirmTitle">Confirm</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p class="mb-0" id="csrmsConfirmMessage"></p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-danger" id="csrmsConfirmOkBtn">Delete</button>
          </div>
        </div>
      </div>
    </div>
  `);
}

/** Bootstrap confirm modal — use instead of window.confirm for deletes and destructive actions. */
function confirmAction(options = {}) {
  const {
    title = 'Confirm',
    message = 'Are you sure?',
    confirmLabel = 'Delete',
    confirmClass = 'btn-danger',
  } = options;

  return new Promise((resolve) => {
    if (typeof bootstrap === 'undefined') {
      resolve(window.confirm(message));
      return;
    }

    ensureConfirmModal();
    const modalEl = document.getElementById('csrmsConfirmModal');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    document.getElementById('csrmsConfirmTitle').textContent = title;
    document.getElementById('csrmsConfirmMessage').textContent = message;
    const okBtn = document.getElementById('csrmsConfirmOkBtn');
    okBtn.textContent = confirmLabel;
    okBtn.className = `btn ${confirmClass}`;

    let confirmed = false;

    const onConfirm = () => {
      confirmed = true;
      modal.hide();
    };

    const onHidden = () => {
      okBtn.removeEventListener('click', onConfirm);
      modalEl.removeEventListener('hidden.bs.modal', onHidden);
      resolve(confirmed);
    };

    okBtn.addEventListener('click', onConfirm);
    modalEl.addEventListener('hidden.bs.modal', onHidden);
    modal.show();
  });
}
