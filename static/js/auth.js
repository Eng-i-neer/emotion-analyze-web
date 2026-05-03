const Auth = {
    isLogin: true,

    render() {
        const el = document.getElementById('page-auth');
        el.innerHTML = `<div class="auth-page">
            <div class="auth-left">
                <div class="auth-card-wrap">
                    <div class="auth-brand">
                        <div class="auth-brand-title">MindNote ✨</div>
                        <div class="auth-brand-sub">每一次记录，都是心灵的温柔对话</div>
                    </div>
                    <div class="auth-card" id="auth-form-area"></div>
                </div>
            </div>
            <div class="auth-right">
                <span class="deco deco-1">🌱</span>
                <span class="deco deco-2">☀️</span>
                <span class="deco deco-3">🍃</span>
                <span class="deco deco-4">💛</span>
                <span class="deco deco-5">📖</span>
                <span class="deco deco-6">✨</span>
                <div class="auth-right-content">
                    <div style="font-size:5rem;margin-bottom:20px;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.08))">📔</div>
                    <div class="auth-right-title">记录此刻</div>
                    <div class="auth-right-title" style="margin-top:-2px">理解自己</div>
                    <div class="auth-right-desc mt-md">
                        写下你的故事，AI 帮你温柔倾听<br>
                        发现情绪的纹理，拥抱每一个真实的自己
                    </div>
                </div>
            </div>
        </div>`;
        this.renderForm();
    },

    renderForm() {
        const area = document.getElementById('auth-form-area');
        if (this.isLogin) {
            area.innerHTML = `
                <div class="form-group">
                    <label class="form-label">用户名</label>
                    <input id="auth-username" class="form-input" type="text" placeholder="请输入用户名" autocomplete="username">
                </div>
                <div class="form-group">
                    <label class="form-label">密码</label>
                    <input id="auth-password" class="form-input" type="password" placeholder="请输入密码" autocomplete="current-password">
                </div>
                <button class="btn btn-primary btn-block mt-sm" onclick="Auth.doLogin()">登录</button>
                <div class="auth-toggle">还没有账号？<a onclick="Auth.toggleMode()">立即注册</a></div>
            `;
        } else {
            area.innerHTML = `
                <div class="form-group">
                    <label class="form-label">用户名</label>
                    <input id="auth-username" class="form-input" type="text" placeholder="2-20个字符" autocomplete="username">
                </div>
                <div class="form-group">
                    <label class="form-label">密码</label>
                    <input id="auth-password" class="form-input" type="password" placeholder="至少4个字符" autocomplete="new-password">
                </div>
                <div class="form-group">
                    <label class="form-label">确认密码</label>
                    <input id="auth-password2" class="form-input" type="password" placeholder="再次输入密码" autocomplete="new-password">
                </div>
                <button class="btn btn-primary btn-block mt-sm" onclick="Auth.doRegister()">注册</button>
                <div class="auth-toggle">已有账号？<a onclick="Auth.toggleMode()">去登录</a></div>
            `;
        }
        area.querySelectorAll('input').forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { Auth.isLogin ? Auth.doLogin() : Auth.doRegister(); }
            });
        });
    },

    toggleMode() { this.isLogin = !this.isLogin; this.renderForm(); },

    async doLogin() {
        const username = document.getElementById('auth-username').value.trim();
        const password = document.getElementById('auth-password').value;
        if (!username || !password) { App.toast('请填写用户名和密码', 'error'); return; }
        const res = await App.api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
        if (res.success) { App.user = res.user; App.toast('欢迎回来，' + res.user.username + ' 🌿', 'success'); App.showApp(); }
        else App.toast(res.message || '登录失败', 'error');
    },

    async doRegister() {
        const username = document.getElementById('auth-username').value.trim();
        const password = document.getElementById('auth-password').value;
        const password2 = document.getElementById('auth-password2').value;
        if (!username || !password) { App.toast('请填写用户名和密码', 'error'); return; }
        if (password !== password2) { App.toast('两次密码不一致', 'error'); return; }
        const res = await App.api('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) });
        if (res.success) { App.user = res.user; App.toast('注册成功，开始你的 MindNote 之旅 ✨', 'success'); App.showApp(); }
        else App.toast(res.message || '注册失败', 'error');
    }
};
