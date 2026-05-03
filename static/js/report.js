const Report = {
    async init() {
        const el = document.getElementById('page-report');
        el.innerHTML = `
            <h1 class="page-title">📋 周报 / 月报</h1>
            <div class="flex gap-sm mb-lg">
                <button class="btn btn-primary" onclick="Report.generate('weekly')">✨ 生成本周报告</button>
                <button class="btn btn-outline" onclick="Report.generate('monthly')">生成本月报告</button>
            </div>
            <div id="report-content"></div>
            <h2 class="page-title mt-lg" style="font-size:1.05rem">历史报告</h2>
            <div id="report-list"></div>`;
        await this.loadList();
    },

    async generate(type) {
        const c = document.getElementById('report-content');
        c.innerHTML = '<div class="loading-overlay"><div class="loading-spinner"></div><span>AI 正在生成报告...</span></div>';
        const res = await App.api('/api/reports/generate', { method:'POST', body: JSON.stringify({report_type:type}) });
        if (!res.success) { c.innerHTML = `<div class="card card-kraft"><p class="text-sec">${res.message||'生成失败'}</p></div>`; return; }
        this.renderReport(res.report, c);
        this.loadList();
    },

    renderReport(report, container) {
        const ai = report.ai_report || report.report_json || {};
        const label = report.report_type === 'weekly' ? '周报' : '月报';
        container.innerHTML = `
            <div class="card mb-md">
                <div class="report-header"><h2>${label}</h2><div class="report-period">${report.start_date} ~ ${report.end_date}</div></div>
                <div class="report-stats">
                    <div class="report-stat"><div class="stat-value">${report.avg_emotion_score||'-'}</div><div class="stat-label">平均情绪分</div></div>
                    <div class="report-stat"><div class="stat-value">${report.avg_stress_score||'-'}</div><div class="stat-label">平均压力分</div></div>
                    <div class="report-stat"><div class="stat-value">${report.lowest_emotion_date||'-'}</div><div class="stat-label">最低情绪日</div></div>
                    <div class="report-stat"><div class="stat-value">${report.highest_stress_date||'-'}</div><div class="stat-label">最高压力日</div></div>
                </div>
                ${ai.period_summary?`<div class="report-section"><h3>整体总结</h3><p style="line-height:1.75">${ai.period_summary}</p></div>`:''}
                ${ai.mood_trend?`<div class="report-section"><h3>情绪趋势</h3><p style="line-height:1.75">${ai.mood_trend}</p></div>`:''}
                ${ai.stress_trend?`<div class="report-section"><h3>压力趋势</h3><p style="line-height:1.75">${ai.stress_trend}</p></div>`:''}
                ${(ai.main_emotions||[]).length?`<div class="report-section"><h3>主要情绪</h3><div class="tag-group">${ai.main_emotions.map(e=>`<span class="tag tag-green">${e}</span>`).join('')}</div></div>`:''}
                ${(ai.positive_changes||[]).length?`<div class="report-section"><h3>✨ 积极变化</h3><ul style="padding-left:20px">${ai.positive_changes.map(c=>`<li style="margin-bottom:5px;line-height:1.65">${c}</li>`).join('')}</ul></div>`:''}
                ${(ai.potential_issues||[]).length?`<div class="report-section"><h3>💡 需要关注</h3><ul style="padding-left:20px">${ai.potential_issues.map(p=>`<li style="margin-bottom:5px;line-height:1.65">${p}</li>`).join('')}</ul></div>`:''}
                ${(report.top_keywords||[]).length?`<div class="report-section"><h3>高频关键词</h3><div class="tag-group">${report.top_keywords.map(k=>`<span class="tag tag-blue">${k.word}(${k.count})</span>`).join('')}</div></div>`:''}
                ${(ai.suggestions_next_period||[]).length?`<div class="report-section"><h3>🌿 下阶段建议</h3>${ai.suggestions_next_period.map(s=>`<div class="suggestion-card">${s}</div>`).join('')}</div>`:''}
            </div>`;
    },

    async loadList() {
        const res = await App.api('/api/reports');
        const el = document.getElementById('report-list');
        if (!res.success || !res.reports.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><p>暂无历史报告</p></div>'; return; }
        el.innerHTML = res.reports.map(r => `
            <div class="record-item" onclick="Report.showDetail(${r.id})" style="cursor:pointer">
                <div class="record-date-badge"><div class="day" style="font-size:0.85rem">${r.report_type==='weekly'?'周报':'月报'}</div></div>
                <div class="record-body">
                    <div class="record-title">${r.start_date} ~ ${r.end_date}</div>
                    <div class="record-excerpt">情绪均分: ${r.avg_emotion_score||'-'} | 压力均分: ${r.avg_stress_score||'-'}</div>
                </div>
            </div>`).join('');
    },

    async showDetail(id) {
        const res = await App.api(`/api/reports/${id}`);
        if (!res.success) { App.toast('加载失败','error'); return; }
        const r = res.report;
        this.renderReport({...r, ai_report: r.report_json||{}, top_keywords:[]}, document.getElementById('report-content'));
        window.scrollTo(0,0);
    }
};
