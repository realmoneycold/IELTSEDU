(() => {
  const DEFAULT_CONFIG = {
    pageId: document.body?.dataset?.page || null,
    title: document.title || 'Dashboard',
    subtitle: '',
  };

  function readUserState() {
    const token =
      localStorage.getItem('authToken') ||
      localStorage.getItem('token') ||
      null;

    let role =
      (localStorage.getItem('role') || '').trim() ||
      null;

    try {
      const rawUser = localStorage.getItem('user');
      const user = rawUser ? JSON.parse(rawUser) : null;
      role = role || (user && (user.role || user.type)) || null;
    } catch {}

    const normalizedRole = (role || '').toLowerCase() || 'student';

    return {
      token,
      role: normalizedRole,
      displayRole: normalizedRole ? normalizedRole.toUpperCase() : 'STUDENT',
    };
  }

  function setBodyRole(role) {
    if (!document.body) return;
    document.body.dataset.role = role || 'student';
  }

  function icon(name) {
    // Minimal inline SVG set to keep assets local.
    const common = 'class="nav-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"';
    switch (name) {
      case 'home':
        return `<svg ${common}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
      case 'grid':
        return `<svg ${common}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`;
      case 'shield':
        return `<svg ${common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
      case 'users':
        return `<svg ${common}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`;
      case 'chart':
        return `<svg ${common}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`;
      case 'logout':
        return `<svg ${common}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`;
      default:
        return `<svg ${common}><circle cx="12" cy="12" r="10"/></svg>`;
    }
  }

  function getActiveFile() {
    const file = (window.location.pathname || '').split('/').pop();
    return file || 'index.html';
  }

  function renderSidebar(config, user) {
    const activeFile = getActiveFile();

    const items = [
      { section: 'Portals' },
      { href: 'dashboard.html', label: 'Dashboard', pageId: 'dashboard', icon: 'grid' },
      { href: 'centre.html', label: 'Centre Portal', pageId: 'centre', icon: 'users' },
      { href: 'admin.html', label: 'Admin Portal', pageId: 'admin', icon: 'shield' },
      { href: 'ceo.html', label: 'CEO Portal', pageId: 'ceo', icon: 'chart' },
      { section: 'Website' },
      { href: 'index.html', label: 'Main Site', pageId: 'site', icon: 'home' },
    ];

    const navHtml = items
      .map((it) => {
        if (it.section) {
          return `<div class="nav-section">${it.section}</div>`;
        }
        const isActive = activeFile.toLowerCase() === (it.href || '').toLowerCase();
        return `
          <a class="nav-link ${isActive ? 'active' : ''}" href="${it.href}" data-page="${it.pageId}">
            ${icon(it.icon)}
            <span>${it.label}</span>
          </a>
        `;
      })
      .join('');

    const initials = (user.displayRole || 'U').slice(0, 1);

    return `
      <div class="sidebar-brand">
        <div class="brand-title">IELTSPRACTICE</div>
        <div class="brand-sub">${(config.subtitle || 'Unified Portal').trim()}</div>
      </div>
      <nav aria-label="Sidebar navigation">
        ${navHtml}
      </nav>
      <div class="sidebar-footer">
        <div class="user-pill" title="Logged in user">
          <div class="user-avatar">${initials}</div>
          <div class="user-meta">
            <div class="user-name">Signed in</div>
            <div class="user-role">${user.displayRole}</div>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" id="btn-logout" type="button" title="Log out" aria-label="Log out">
          ${icon('logout')}
        </button>
      </div>
    `;
  }

  function renderTopbar(config) {
    const subtitle = (config.subtitle || '').trim();
    return `
      <div class="topbar">
        <div class="topbar-title">
          <h1>${(config.title || 'Dashboard').trim()}</h1>
          <p>${subtitle || 'Data placeholders (backend-ready)'}</p>
        </div>
        <div class="topbar-actions">
          <a class="btn btn-accent btn-sm" href="login.html" title="Switch account">Switch</a>
        </div>
      </div>
    `;
  }

  function init() {
    const config = { ...DEFAULT_CONFIG, ...(window.PAGE_CONFIG || {}) };
    const user = readUserState();
    setBodyRole(user.role);

    const sidebarMount = document.getElementById('app-sidebar');
    if (sidebarMount) {
      sidebarMount.innerHTML = renderSidebar(config, user);
    }

    const topbarMount = document.getElementById('app-topbar');
    if (topbarMount) {
      topbarMount.innerHTML = renderTopbar(config);
    }

    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('user');
        localStorage.removeItem('userState');
        window.location.href = 'index.html';
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

