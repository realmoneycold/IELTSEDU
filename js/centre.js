async function loadData() {
  // TODO: fetch from backend (e.g., /api/centre/overview) and hydrate UI.
  // Replace placeholders with real students, upcoming mock dates, and performance.

  const ids = ['stat-centre-students', 'stat-centre-mocks', 'stat-centre-band', 'stat-centre-revenue'];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = '—';
  });

  const mocks = document.getElementById('centre-upcoming-mocks');
  if (mocks) mocks.textContent = 'No mock dates scheduled yet.';
}

document.addEventListener('DOMContentLoaded', () => {
  loadData();
});

