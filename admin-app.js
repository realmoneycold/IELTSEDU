import { createApp } from 'https://cdn.jsdelivr.net/npm/petite-vue@0.4.1/dist/petite-vue.es.js';

function timeAgo(dateStr) {
    const d = new Date(dateStr);
    const diff = Math.floor((Date.now() - d) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return diff + 'm ago';
    if (diff < 1440) return Math.floor(diff / 60) + 'h ago';
    return Math.floor(diff / 1440) + 'd ago';
}

const colors = [
    'from-[#1C6758] to-[#2d8c77]', 'from-[#3b82f6] to-[#60a5fa]',
    'from-[#8b5cf6] to-[#a78bfa]', 'from-[#f59e0b] to-[#fbbf24]',
    'from-[#ec4899] to-[#f472b6]', 'from-[#10b981] to-[#34d399]'
];

const app = createApp({
    currentPage: 'dashboard',
    isProfileModalOpen: false,
    isGradingModalOpen: false,
    isAiModalOpen: false,
    isLoading: true,
    token: localStorage.getItem('authToken') || '',

    stats: { pending: 0, users: 0, tickets: 0, reports: 0, recentSignups: 0 },
    gradingQueue: [],
    tasks: [],
    users: [],
    userSearch: '',
    reports: [],
    tickets: [],
    tests: [],
    questions: [],

    profile: { firstName: '', lastName: '', initials: 'A', avatar: null },
    activeGrading: null,
    scores: { ta: 6.5, cc: 6.0, lr: 7.0, gra: 6.5 },

    healthChecks: [
        { name: 'Web Server', sub: 'Running normally', status: 'Online', color: 'bg-green-500' },
        { name: 'Database', sub: 'Connected', status: 'Healthy', color: 'bg-green-500' },
        { name: 'AI Grading API', sub: 'Operational', status: 'Online', color: 'bg-green-500' },
        { name: 'CDN/Media', sub: 'Operational', status: 'Online', color: 'bg-green-500' }
    ],

    get taskProgress() {
        if (!this.tasks.length) return 0;
        const done = this.tasks.filter(t => t.done).length;
        return Math.round((done / this.tasks.length) * 100);
    },
    get taskProgressStroke() {
        const total = 251.2;
        return total - (this.taskProgress / 100) * total;
    },
    get filteredUsers() {
        if (!this.userSearch) return this.users;
        const q = this.userSearch.toLowerCase();
        return this.users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    },

    mounted() { this.init(); },

    async init() {
        if (!this.token) { window.location.href = '/staff-portal-x72.html'; return; }
        // Safety timeout: hide overlay after 8s no matter what
        setTimeout(() => {
            const overlay = document.getElementById('authOverlay');
            if (overlay && overlay.style.display !== 'none') {
                console.warn('Auth overlay timeout — forcing hide');
                overlay.style.display = 'none';
            }
        }, 8000);
        try {
            console.log('[Admin] Verifying token...');
            await this.loadProfile();
            console.log('[Admin] Profile loaded');
            // Load data independently so one failure doesn't block the rest
            await this.loadStats().catch(e => console.error('[Admin] Stats error:', e));
            await this.loadUsers().catch(e => console.error('[Admin] Users error:', e));
            await this.loadTasks().catch(e => console.error('[Admin] Tasks error:', e));
            await this.loadReports().catch(e => console.error('[Admin] Reports error:', e));
            console.log('[Admin] Dashboard ready');
            const overlay = document.getElementById('authOverlay');
            if (overlay) overlay.style.display = 'none';
        } catch (e) {
            console.error('[Admin] Auth error:', e);
            window.location.href = '/staff-portal-x72.html';
        }
    },

    async apiFetch(url, opts = {}) {
        const res = await fetch(url, {
            ...opts,
            headers: {
                'Authorization': 'Bearer ' + this.token,
                'Content-Type': 'application/json',
                ...(opts.headers || {})
            }
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            if (res.status === 401) {
                localStorage.removeItem('authToken'); localStorage.removeItem('role');
                window.location.href = '/staff-portal-x72.html';
            }
            throw new Error(data.error || 'Request failed');
        }
        return data.data !== undefined ? data.data : data;
    },

    async loadProfile() {
        const data = await this.apiFetch('/api/auth/admin/verify');
        const admin = data.admin || data;
        if (!admin) throw new Error('Not authenticated');
        const parts = (admin.name || admin.full_name || 'Admin').split(' ');
        this.profile.firstName = parts[0] || '';
        this.profile.lastName = parts.slice(1).join(' ') || '';
        this.profile.initials = (this.profile.firstName[0] || '') + (this.profile.lastName[0] || '');
    },

    async loadStats() {
        try {
            const data = await this.apiFetch('/api/admin/stats');
            console.log('[Admin] Stats raw result:', data);
            this.stats.pending = data.tasks?.pending || 0;
            this.stats.users = data.users?.total || 0;
            this.stats.tickets = data.reports?.open || 0;
            this.stats.reports = data.reports?.open || 0;
            this.stats.recentSignups = data.users?.recentSignups || 0;
            console.log('[Admin] Stats loaded:', JSON.stringify(this.stats));
        } catch (e) {
            console.error('[Admin] loadStats failed:', e);
        }
    },

    async loadUsers() {
        try {
            const result = await this.apiFetch('/api/admin/users?page=1&limit=50');
            console.log('[Admin] Users raw result:', result);
            const list = result.users || (Array.isArray(result) ? result : []);
            if (!Array.isArray(list)) {
                console.error('[Admin] Users list is not an array:', list);
                this.users = [];
                return;
            }
            this.users = list.map((u, i) => ({
                id: u.id,
                name: u.full_name || u.name || 'Unknown',
                email: u.email || '',
                plan: u.role === 'STUDENT' ? (u.is_verified ? 'Premium' : 'Free') : u.role,
                joined: u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
                status: u.isActive ? 'Active' : 'Suspended',
                initial: ((u.full_name || u.name)?.[0] || '?').toUpperCase(),
                color: colors[i % colors.length]
            }));
            console.log('[Admin] Users loaded:', this.users.length);
        } catch (e) {
            console.error('[Admin] loadUsers failed:', e);
            this.users = [];
        }
    },

    async loadTasks() {
        const list = await this.apiFetch('/api/admin/tasks');
        const prioMap = { HIGH: 'High', MEDIUM: 'Med', LOW: 'Low' };
        const labelMap = { CUSTOMER_SERVICE: 'Customer Service', OPERATIONS: 'Operations', CONTENT_MGMT: 'Content Mgmt', TECHNICAL: 'Technical' };
        this.tasks = list.map(t => ({
            id: t.id, title: t.title,
            type: labelMap[t.label] || t.label || 'General',
            priority: prioMap[t.priority] || t.priority || 'Med',
            due: t.assignedDate ? new Date(t.assignedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Today',
            done: t.isDone || false
        }));
    },

    async loadReports() {
        const result = await this.apiFetch('/api/admin/reports?page=1&limit=20');
        const list = result.reports || result;
        this.reports = list.slice(0, 5).map(r => ({
            id: 'R-' + String(r.id).padStart(3, '0'),
            text: r.description || 'No details',
            details: (r.test?.title || 'Unknown Test') + ' \u00B7 ' + timeAgo(r.createdAt),
            level: r.status === 'OPEN' ? 'High' : 'Med',
            icon: r.type === 'TECHNICAL_BUG' ? 'ph:bug-bold' : r.type === 'SCORE_ERROR' ? 'ph:chart-bar-bold' : 'ph:warning-circle-bold'
        }));
        this.tickets = list.slice(0, 5).map(r => ({
            id: '#T-' + String(r.id).padStart(3, '0'),
            user: (r.student?.full_name || 'Unknown').split(' ').map(n => n[0]).join('') + '.',
            issue: r.description || 'No details',
            priority: r.status === 'OPEN' ? 'High' : 'Med',
            time: timeAgo(r.createdAt)
        }));
    },

    async toggleTask(task) {
        try {
            await this.apiFetch('/api/admin/tasks/' + task.id + '/toggle', { method: 'PATCH' });
            task.done = !task.done;
        } catch (e) { console.error('Toggle task error:', e); }
    },

    async deleteTask(task) {
        if (!confirm('Delete this task?')) return;
        try {
            await this.apiFetch('/api/admin/tasks/' + task.id, { method: 'DELETE' });
            this.tasks = this.tasks.filter(t => t.id !== task.id);
        } catch (e) { console.error('Delete task error:', e); }
    },

    openGrading(student) {
        this.activeGrading = student;
        this.isGradingModalOpen = true;
    },

    submitGrade() {
        if (this.activeGrading) {
            this.activeGrading.status = 'Graded';
            this.stats.pending = Math.max(0, this.stats.pending - 1);
        }
        this.isGradingModalOpen = false;
    },

    addQuestion(type) {
        this.questions.push({ id: Date.now(), type, text: '', options: ['', '', '', ''], answer: '' });
    },
    removeQuestion(index) { this.questions.splice(index, 1); },

    async savePracticeTest() {
        const title = document.querySelector('#ptTitle')?.value.trim();
        const skill = document.querySelector('#ptSkill')?.value;
        const duration = document.querySelector('#ptDuration')?.value;
        const instructions = document.querySelector('#ptInstructions')?.value.trim();
        if (!title || !this.questions.length) { alert('Please fill in the title and add at least one question.'); return; }
        try {
            const payload = {
                title, testType: skill.toUpperCase(), durationMins: parseInt(duration) || 60,
                instructions: instructions || null,
                questions: this.questions.map((q, i) => ({
                    questionText: q.text,
                    type: q.type === 'True/False' ? 'TRUE_FALSE' : q.type === 'Fill Blanks' ? 'FILL_BLANKS' : 'MULTIPLE_CHOICE',
                    options: q.type === 'Multiple Choice' ? q.options.filter(o => o) : null,
                    correctAnswer: q.answer || 'A',
                    orderIndex: i
                }))
            };
            await this.apiFetch('/api/admin/tests', { method: 'POST', body: JSON.stringify(payload) });
            alert('Practice test saved successfully!');
            this.questions = [];
            document.querySelector('#ptTitle').value = '';
            document.querySelector('#ptDuration').value = '';
            document.querySelector('#ptInstructions').value = '';
        } catch (e) { console.error('Save test error:', e); alert('Failed to save test.'); }
    },

    async aiParseQuestions() {
        const ta = document.querySelector('#aiParseText');
        const text = ta ? ta.value.trim() : '';
        if (!text) { alert('Please paste some text first.'); return; }
        try {
            const data = await this.apiFetch('/api/admin/ai-parse', { method: 'POST', body: JSON.stringify({ text }) });
            const questions = Array.isArray(data) ? data : (data.questions || []);
            questions.forEach(q => {
                const type = q.type === 'TRUE_FALSE' ? 'True/False' : q.type === 'FILL_BLANKS' ? 'Fill Blanks' : 'Multiple Choice';
                this.questions.push({ id: Date.now() + Math.floor(Math.random() * 1000), type, text: q.questionText || '', options: q.options || ['', '', '', ''], answer: q.correctAnswer || '' });
            });
            this.isAiModalOpen = false;
        } catch (e) { console.error('AI parse error:', e); alert('AI parsing failed.'); }
    },

    handleAvatarUpload(e) {
        const file = e.target.files[0];
        if (file) this.profile.avatar = URL.createObjectURL(file);
    },

    async addTaskPrompt() {
        const title = prompt('Task title:');
        if (!title) return;
        const priority = prompt('Priority (High/Med/Low):', 'Med');
        const label = prompt('Label (Customer Service/Operations/Content Mgmt/Technical):', 'Customer Service');
        try {
            await this.apiFetch('/api/admin/tasks', {
                method: 'POST',
                body: JSON.stringify({ title, priority: priority || 'MEDIUM', label: (label || 'CUSTOMER_SERVICE').toUpperCase().replace(/ /g, '_') })
            });
            await this.loadTasks();
        } catch (e) { console.error('Add task error:', e); alert('Failed to add task.'); }
    },

    async addUserPrompt() {
        const full_name = prompt('Full name:');
        if (!full_name) return;
        const email = prompt('Email:');
        if (!email) return;
        const password = prompt('Temporary password:');
        if (!password) return;
        const role = prompt('Role (STUDENT/TEACHER/CENTRE/ADMIN/CEO/GRADER/SUPPORT/CONTENT/ANALYST/MANAGER):', 'STUDENT');
        try {
            await this.apiFetch('/api/admin/users', {
                method: 'POST',
                body: JSON.stringify({ full_name, email, password, role: (role || 'STUDENT').toUpperCase() })
            });
            alert('User created successfully!');
            await this.loadUsers();
            await this.loadStats();
        } catch (e) { console.error('Add user error:', e); alert('Failed to add user: ' + (e.message || 'Unknown error')); }
    },

    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('role');
        localStorage.removeItem('user');
        window.location.href = '/staff-portal-x72.html';
    },

    setPage(page) { this.currentPage = page; }
});

app.mount('#app');
