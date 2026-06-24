(() => {
  function readUserState() {
    const token =
      localStorage.getItem('authToken') ||
      localStorage.getItem('token') ||
      null;

    let role = (localStorage.getItem('role') || '').trim() || null;

    try {
      const rawState = localStorage.getItem('userState');
      const parsedState = rawState ? JSON.parse(rawState) : null;
      if (!token && parsedState && parsedState.token) {
        // Prefer token if provided by older pages
        localStorage.setItem('authToken', parsedState.token);
      }
      if (!role && parsedState && parsedState.role) role = parsedState.role;
    } catch {}

    try {
      const rawUser = localStorage.getItem('user');
      const user = rawUser ? JSON.parse(rawUser) : null;
      if (!role && user && (user.role || user.type)) role = user.role || user.type;
    } catch {}

    return {
      token: token || localStorage.getItem('authToken') || null,
      role: (role || '').toLowerCase() || 'student',
    };
  }

  function fileName() {
    let path = window.location.pathname || '';
    if (path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    let name = path.split('/').pop() || 'index.html';
    if (name && !name.includes('.') && name !== '') {
      name = name + '.html';
    }
    return name;
  }

  function redirect(to) {
    if (fileName().toLowerCase() === to.toLowerCase()) return;
    window.location.replace(to);
  }

  function routeByRole(role) {
    switch ((role || '').toLowerCase()) {
      case 'ceo':
        return 'ceo.html';
      case 'admin':
        return 'admin.html';
      case 'centre':
        return 'centre.html';
      default:
        return 'dashboard.html';
    }
  }

  function guard() {
    const current = fileName().toLowerCase();
    const { token, role } = readUserState();

    if (current === 'login.html') {
      if (token) redirect(routeByRole(role));
      return;
    }

    if (!token) {
      window.location.replace('/login.html');
      return;
    }

    // Requirement: if a 'student' tries to access ceo.html, redirect to dashboard.html
    if (current === 'ceo.html' && role === 'student') {
      redirect('dashboard.html');
      return;
    }

    // Sensible defaults (backend-ready; keeps roles clean)
    if (current === 'admin.html' && !(role === 'admin' || role === 'ceo')) {
      redirect('dashboard.html');
      return;
    }
    if (current === 'centre.html' && !(role === 'centre' || role === 'admin' || role === 'ceo')) {
      redirect('dashboard.html');
      return;
    }
    if (current === 'ceo.html' && !(role === 'ceo' || role === 'admin')) {
      redirect('dashboard.html');
      return;
    }
  }

  // Run ASAP (still after script load)
  guard();
})();

