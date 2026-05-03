const Home = {
    async init() {
        const el = document.getElementById('page-home');
        el.innerHTML = '<div class="loading-overlay"><div class="loading-spinner"></div><span>加载中...</span></div>';

        const res = await App.api('/api/stats/overview');
        if (!res.success) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">📖</div><p>加载失败，请刷新重试</p></div>'; return; }

        const { today, recent_7days, total_records, streak, reminders } = res;
        const todayScore = today ? (today.ai_emotion_score || today.user_mood_score || '-') : '-';
        const todayStress = today ? (today.ai_stress_score || today.user_stress_score || '-') : '-';
        const todayEnergy = today ? (today.ai_energy_score || '-') : '-';
        const username = App.user ? App.user.username : '';

        let reminderHtml = '';
        if (reminders && reminders.length) {
            reminderHtml = reminders.map(r => `<div class="reminder-banner">🌿 ${r}</div>`).join('');
        }

        let todayAiHtml = '';
        if (today && today.ai_summary) {
            const ai = today.ai_analysis_json || {};
            const suggestions = ai.suggestions || today.ai_suggestions || [];
            todayAiHtml = `
                <div class="ai-panel" style="margin-top:16px">
                    <div class="ai-header">AI 心理小贴士 ✨</div>
                    <div class="ai-summary">${today.ai_summary}</div>
                    <div class="tag-group mb-md">
                        <span class="tag tag-green">${today.ai_main_emotion || ''}</span>
                        ${(today.ai_secondary_emotions || []).map(e => `<span class="tag tag-blue">${e}</span>`).join('')}
                    </div>
                    ${suggestions.length ? suggestions.slice(0, 2).map(s => `<div class="ai-suggestion">${s}</div>`).join('') : ''}
                    <div class="mt-sm"><a href="javascript:void(0)" onclick="App.navigate('suggestion')" class="btn btn-outline btn-sm">了解更多建议 →</a></div>
                </div>`;
        }

        let diaryExcerpt = '';
        if (today && today.diary_text) {
            const text = today.diary_text.length > 120 ? today.diary_text.slice(0, 120) + '...' : today.diary_text;
            diaryExcerpt = `
                <div class="card mt-md" style="cursor:pointer" onclick="History.showDetail(${today.id})">
                    <div class="card-title">📝 今日日记</div>
                    <p class="text-sec text-sm" style="line-height:1.8">${text}</p>
                </div>`;
        }

        el.innerHTML = `
            <div class="home-header">
                <div class="welcome-tape">Hi, ${username} ♡</div>
                <div class="welcome-sub">每一次记录，都是心灵的温柔对话。</div>
            </div>
            ${reminderHtml}
            <div class="home-body">
                <div class="home-main">
                    <div class="flex gap-md mb-md">
                        <div class="card" style="flex:1;text-align:center;cursor:pointer" onclick="App.navigate('record')">
                            <div class="score-circle" style="background:${App.moodColorHex(todayScore === '-' ? 5 : todayScore)}">${todayScore}</div>
                            <div class="score-label">今日心情</div>
                        </div>
                        <div class="card" style="flex:1;text-align:center">
                            <div class="score-circle" style="background:${App.moodColorHex(todayStress === '-' ? 5 : 11 - todayStress)}">${todayStress}</div>
                            <div class="score-label">今日压力</div>
                        </div>
                        <div class="card" style="flex:1;text-align:center">
                            <div class="score-circle" style="background:${App.moodColorHex(todayEnergy === '-' ? 5 : todayEnergy)}">${todayEnergy}</div>
                            <div class="score-label">今日精力</div>
                        </div>
                    </div>

                    <div class="card" style="cursor:pointer;text-align:center;padding:16px" onclick="App.navigate('record')">
                        <span style="font-size:1.1rem;letter-spacing:1px">✏️ ${today ? '继续写日记' : '开始今日记录'}</span>
                    </div>

                    ${todayAiHtml}
                    ${diaryExcerpt}
                </div>

                <div class="home-side">
                    <div class="card">
                        <div class="card-title">📅 情绪日历</div>
                        <div id="home-mini-calendar"></div>
                    </div>
                    <div class="card">
                        <div class="card-title">本周情绪概览</div>
                        <canvas id="home-mood-chart" class="mini-chart"></canvas>
                    </div>
                    <div class="card">
                        <div class="card-title">本周压力概览</div>
                        <canvas id="home-stress-chart" class="mini-chart"></canvas>
                    </div>
                    <div class="card-sticky">
                        <div style="font-size:0.82rem;color:var(--text-sec);line-height:1.7">
                            📌 连续记录 <strong style="color:var(--green-dark)">${streak}</strong> 天<br>
                            共 <strong style="color:var(--green-dark)">${total_records}</strong> 篇日记
                        </div>
                    </div>
                    <div class="card-sticky" style="transform:rotate(1deg);background:#F0F7F0;border-left-color:var(--green)">
                        <div style="font-size:0.82rem;color:var(--text-sec);font-style:italic;line-height:1.7">
                            "慢慢来，比较快。"
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.drawMiniChart('home-mood-chart', recent_7days, 'emotion');
        this.drawMiniChart('home-stress-chart', recent_7days, 'stress');
        this.drawMiniCalendar(recent_7days);
    },

    drawMiniCalendar(recentData) {
        const container = document.getElementById('home-mini-calendar');
        if (!container) return;
        const now = new Date();
        const year = now.getFullYear(), month = now.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const todayDate = now.getDate();
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

        const scoreMap = {};
        (recentData || []).forEach(d => {
            const day = parseInt(d.record_date.split('-')[2]);
            scoreMap[day] = d.ai_emotion_score || d.user_mood_score || 5;
        });

        let html = '<div class="calendar-grid" style="font-size:0.7rem;gap:2px">';
        html += weekdays.map(w => `<div class="calendar-weekday" style="font-size:0.65rem">${w}</div>`).join('');
        for (let i = 0; i < firstDay; i++) html += '<div class="calendar-day empty" style="aspect-ratio:1"></div>';
        for (let d = 1; d <= daysInMonth; d++) {
            const score = scoreMap[d];
            const isToday = d === todayDate;
            const face = score ? (score >= 8 ? '😊' : score >= 5 ? '😐' : score >= 3 ? '😟' : '😢') : '';
            const cls = isToday ? 'today' : '';
            html += `<div class="calendar-day ${cls}" style="aspect-ratio:1;font-size:${face ? '0.9rem' : '0.7rem'}">${face || d}</div>`;
        }
        html += '</div>';
        container.innerHTML = html;
    },

    drawMiniChart(canvasId, data, type) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || !data.length) return;
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
        const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
        const w = rect.width, h = rect.height;
        const pad = { top: 10, right: 15, bottom: 22, left: 28 };
        const cw = w - pad.left - pad.right, ch = h - pad.top - pad.bottom;
        const values = data.map(d => type === 'emotion' ? (d.ai_emotion_score || d.user_mood_score || 5) : (d.ai_stress_score || d.user_stress_score || 5));

        ctx.strokeStyle = 'rgba(120,100,70,0.08)'; ctx.lineWidth = 0.5;
        for (let i = 0; i <= 10; i += 5) {
            const y = pad.top + ch - (i / 10) * ch;
            ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
            ctx.fillStyle = '#A79B8B'; ctx.font = '9px sans-serif'; ctx.textAlign = 'right';
            ctx.fillText(i, pad.left - 4, y + 3);
        }
        if (values.length < 2) return;
        const step = cw / (values.length - 1);
        const color = type === 'emotion' ? '#5D9B63' : '#F6A04D';
        const grad = ctx.createLinearGradient(0, pad.top, 0, h - pad.bottom);
        grad.addColorStop(0, color + '20'); grad.addColorStop(1, color + '05');

        ctx.beginPath();
        ctx.moveTo(pad.left, pad.top + ch - (values[0] / 10) * ch);
        values.forEach((v, i) => ctx.lineTo(pad.left + i * step, pad.top + ch - (v / 10) * ch));
        ctx.lineTo(pad.left + (values.length - 1) * step, pad.top + ch);
        ctx.lineTo(pad.left, pad.top + ch); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();

        ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        values.forEach((v, i) => {
            const x = pad.left + i * step, y = pad.top + ch - (v / 10) * ch;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }); ctx.stroke();

        values.forEach((v, i) => {
            const x = pad.left + i * step, y = pad.top + ch - (v / 10) * ch;
            ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFDF7'; ctx.fill();
            ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
        });

        ctx.fillStyle = '#A79B8B'; ctx.font = '8px sans-serif'; ctx.textAlign = 'center';
        data.forEach((d, i) => ctx.fillText(d.record_date ? d.record_date.slice(5) : '', pad.left + i * step, h - 4));
    }
};
