function renderEmptyTables() {
  const grading = document.getElementById('grading-table-body');
  if (grading) {
    grading.innerHTML = `
      <tr>
        <td colspan="6"><div class="empty-state">No submissions in the queue.</div></td>
      </tr>
    `;
  }

  const users = document.getElementById('users-table-body');
  if (users) {
    users.innerHTML = `
      <tr>
        <td colspan="5"><div class="empty-state">No users loaded yet.</div></td>
      </tr>
    `;
  }
}

async function loadData() {
  // TODO: fetch from backend (e.g., /api/admin/overview, /api/admin/users, /api/admin/grading/queue).
  // Keep empty states until backend is ready.

  const ids = ['stat-pending', 'stat-users', 'stat-health'];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = '—';
  });

  renderEmptyTables();
}

document.addEventListener('DOMContentLoaded', () => {
  loadData();
});

