function readAuth() {
  const token = localStorage.getItem('authToken');
  const role = (localStorage.getItem('role') || '').toLowerCase();
  return { token, role };
}

function showToast(message, type = 'success') {
  let el = document.getElementById('global-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'global-toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.remove('toast-error');
  if (type === 'error') el.classList.add('toast-error');
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

function renderPendingRequests(requests) {
  const centreList = document.getElementById('centre-list');
  if (!centreList) return;

  if (!requests.length) {
    centreList.innerHTML = `<div class="empty-state">No pending partner requests.</div>`;
    return;
  }

  const rows = requests
    .map(
      (r) => `
      <div class="list-row" data-request-id="${r.id}">
        <div class="list-main">
          <div class="list-title">${r.centre_name}</div>
          <div class="list-sub">
            CEO: ${r.ceo_name} • ${r.email} • ${r.phone} • ${r.location}
          </div>
        </div>
        <div class="list-actions">
          <button class="btn btn-sm btn-accent" type="button" data-approve="${r.id}">
            Approve
          </button>
        </div>
      </div>
    `
    )
    .join('');

  centreList.innerHTML = rows;

  centreList.querySelectorAll('[data-approve]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.getAttribute('data-approve'));
      approvePartner(id);
    });
  });
}

async function loadData() {
  const { token, role } = readAuth();

  const statIds = ['stat-revenue', 'stat-students', 'stat-region', 'stat-ltv'];
  statIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = '—';
  });

  const chart = document.getElementById('revenue-chart');
  if (chart) {
    chart.innerHTML = `<div class="empty-state">Revenue chart will render once backend data is available.</div>`;
  }

  const board = document.getElementById('strategy-board');
  if (board) {
    board.innerHTML = `<div class="empty-state">No strategic goals yet.</div>`;
  }

  // Fetch pending partner requests for CEO
  if (!token || role !== 'ceo') {
    const centreList = document.getElementById('centre-list');
    if (centreList) {
      centreList.innerHTML = `<div class="empty-state">Only the CEO can manage partner approvals.</div>`;
    }
    return;
  }

  try {
    const res = await (typeof apiFetch === 'function' ? apiFetch('/api/admin/partner-requests') : fetch('/api/admin/partner-requests', { headers: { Authorization: `Bearer ${token}` } }));
    const data = await res.json();
    if (!res.ok) {
      console.error(data);
      const centreList = document.getElementById('centre-list');
      if (centreList) {
        centreList.innerHTML = `<div class="empty-state">Failed to load partner requests.</div>`;
      }
      return;
    }
    renderPendingRequests(data.requests || []);
  } catch (err) {
    console.error(err);
    const centreList = document.getElementById('centre-list');
    if (centreList) {
      centreList.innerHTML = `<div class="empty-state">Network error while loading partner requests.</div>`;
    }
  }
}

async function approvePartner(id) {
  const { token, role } = readAuth();
  if (!token || role !== 'ceo') {
    showToast('Only the CEO can approve partners.', 'error');
    return;
  }

  try {
    const res = await (typeof apiFetch === 'function' ? apiFetch(`/api/admin/approve-partner/${id}`, { method: 'POST' }) : fetch(`/api/admin/approve-partner/${id}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }));
    const data = await res.json();
    if (!res.ok) {
      showToast(data.message || 'Failed to approve partner.', 'error');
      return;
    }

    const row = document.querySelector(`[data-request-id="${id}"]`);
    if (row && row.parentElement) {
      row.parentElement.removeChild(row);
    }

    showToast('Partner approved and centre account created.');
  } catch (err) {
    console.error(err);
    showToast('Network error while approving partner.', 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadData();
});

