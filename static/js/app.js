const App = {
    currentPage: 'auth',
    user: null,

    async api(url, opts = {}) {
        const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
        try {
            const res = await fetch(url, { ...opts, headers, credentials: 'include' });
            const data = await res.json();
            if (res.status === 401 && this.currentPage !== 'auth') { this.logout(); return data; }
            return data;
        } catch (e) {
            console.error('API Error:', e);
            return { success: false, message: '网络请求失败，请检查连接' };
        }
    },

    toast(msg, type = 'info') {
        const c = document.getElementById('toast-container');
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.textContent = msg;
        c.appendChild(t);
        setTimeout(() => {
            t.style.opacity = '0';
            t.style.transform = 'translateX(30px)';
            setTimeout(() => t.remove(), 300);
        }, 3200);
    },

    showModal(html) {
        const overlay = document.getElementById('modal-overlay');
        overlay.innerHTML = `<div class="modal">${html}</div>`;
        overlay.classList.remove('hidden');
        overlay.onclick = (e) => { if (e.target === overlay) this.hideModal(); };
    },

    hideModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
    },

    confirm(message, onConfirm, onCancel) {
        const html = `
            <div class="confirm-dialog">
                <div class="confirm-icon">💬</div>
                <div class="confirm-msg">${message}</div>
                <div class="confirm-actions">
                    <button class="btn btn-ghost" onclick="App._confirmCancel()">取消</button>
                    <button class="btn btn-primary" onclick="App._confirmOk()">确定</button>
                </div>
            </div>
        `;
        this._confirmCb = onConfirm;
        this._cancelCb = onCancel;
        this.showModal(html);
    },

    _confirmOk() { this.hideModal(); if (this._confirmCb) this._confirmCb(); },
    _cancelCb: null,
    _confirmCb: null,
    _confirmCancel() { this.hideModal(); if (this._cancelCb) this._cancelCb(); },

    navigate(page, data = null) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const el = document.getElementById(`page-${page}`);
        if (el) { el.classList.add('active'); this.currentPage = page; }
        document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(n => {
            n.classList.toggle('active', n.dataset.page === page);
        });
        const handlers = {
            home: () => Home.init(),
            record: () => Record.init(data),
            analysis: () => {},
            history: () => History.init(),
            calendar: () => Calendar.init(),
            charts: () => Charts.init(),
            report: () => Report.init(),
            suggestion: () => Suggestion.init(),
            settings: () => this.renderSettings(),
        };
        if (handlers[page]) handlers[page]();
        window.scrollTo(0, 0);
    },

    showApp() {
        document.getElementById('sidebar').classList.remove('hidden');
        document.getElementById('bottom-nav').classList.remove('hidden');
        document.getElementById('main-content').classList.add('with-sidebar', 'with-bottomnav');
        this.navigate('home');
    },

    logout() {
        this.api('/api/auth/logout', { method: 'POST' });
        this.user = null;
        document.getElementById('sidebar').classList.add('hidden');
        document.getElementById('bottom-nav').classList.add('hidden');
        document.getElementById('main-content').classList.remove('with-sidebar', 'with-bottomnav');
        this.navigate('auth');
        Auth.render();
    },

    renderSettings() {
        const el = document.getElementById('page-settings');
        el.innerHTML = `
            <h1 class="page-title">⚙️ 设置</h1>
            <div class="card settings-section">
                <h3>账号信息</h3>
                <div class="settings-row"><span>用户名</span><span>${this.user ? this.user.username : ''}</span></div>
                <div class="settings-row"><span>注册时间</span><span>${this.user ? this.user.created_at : ''}</span></div>
            </div>
            <div class="card settings-section mt-md">
                <h3>操作</h3>
                <div class="settings-row">
                    <span>退出登录</span>
                    <button class="btn btn-danger btn-sm" onclick="App.logout()">退出</button>
                </div>
            </div>
        `;
    },

    moodColor(score) {
        if (score >= 8) return 'var(--green)';
        if (score >= 5) return 'var(--yellow)';
        if (score >= 3) return 'var(--orange)';
        return 'var(--red)';
    },

    moodColorHex(score) {
        if (score >= 8) return '#5D9B63';
        if (score >= 5) return '#F5C84C';
        if (score >= 3) return '#F6A04D';
        return '#E96862';
    },

    formatDate(d) {
        if (!d) return '';
        const date = new Date(d);
        return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    },

    async init() {
        document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(n => {
            n.addEventListener('click', () => this.navigate(n.dataset.page));
        });
        document.getElementById('btn-logout').addEventListener('click', () => this.logout());
        const res = await this.api('/api/auth/me');
        if (res.success) { this.user = res.user; this.showApp(); }
        else Auth.render();
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
