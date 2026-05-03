const History = {
    async init() {
        const el = document.getElementById('page-history');
        el.innerHTML = `
            <h1 class="page-title">📖 历史日记</h1>
            <div class="filter-bar">
                <input type="date" class="form-input" id="filter-start" placeholder="开始日期">
                <input type="date" class="form-input" id="filter-end" placeholder="结束日期">
                <div class="custom-select-wrap">
                    <select class="form-input" id="filter-mood-type">
                        <option value="">情绪类型</option>
                        <option>开心</option><option>平静</option><option>焦虑</option>
                        <option>难过</option><option>愤怒</option><option>疲惫</option>
                        <option>压力大</option><option>委屈</option><option>迷茫</option>
                    </select>
                </div>
                <div class="custom-select-wrap">
                    <select class="form-input" id="filter-risk">
                        <option value="">关注等级</option>
                        <option value="normal">正常</option>
                        <option value="watch">留意</option>
                        <option value="high">高关注</option>
                    </select>
                </div>
                <button class="btn btn-primary btn-sm" onclick="History.search()">筛选</button>
                <button class="btn btn-ghost btn-sm" onclick="History.reset()">重置</button>
            </div>
            <div id="hist-list" class="record-list"><div class="loading-overlay"><div class="loading-spinner"></div></div></div>`;
        this.search();
    },

    async search() {
        const params = new URLSearchParams();
        const v = (id) => document.getElementById(id)?.value || '';
        if (v('filter-start')) params.set('start_date', v('filter-start'));
        if (v('filter-end')) params.set('end_date', v('filter-end'));
        if (v('filter-mood-type')) params.set('mood_type', v('filter-mood-type'));
        if (v('filter-risk')) params.set('risk_level', v('filter-risk'));

        const res = await App.api(`/api/mood-records?${params}`);
        const list = document.getElementById('hist-list');
        if (!res.success || !res.records.length) {
            list.innerHTML = '<div class="empty-state"><div class="empty-icon">📖</div><p>暂无日记记录</p><button class="btn btn-primary btn-sm mt-md" onclick="App.navigate(\'record\')">去写日记</button></div>';
            return;
        }

        list.innerHTML = res.records.map(r => {
            const d = new Date(r.record_date);
            const es = r.ai_emotion_score || r.user_mood_score || '-';
            const ss = r.ai_stress_score || r.user_stress_score || '-';
            const excerpt = r.diary_text ? (r.diary_text.length > 50 ? r.diary_text.slice(0, 50) + '...' : r.diary_text) : '无日记';
            const me = r.ai_main_emotion || '';
            const face = es !== '-' ? (es >= 8 ? '😊' : es >= 5 ? '😐' : es >= 3 ? '😟' : '😢') : '📝';
            return `
                <div class="record-item" onclick="History.showDetail(${r.id})">
                    <div class="record-date-badge">
                        <div class="day">${d.getDate()}</div>
                        <div class="month">${d.getMonth()+1}月</div>
                    </div>
                    <div class="record-body">
                        <div class="record-title">${face} ${me ? me + ' · ' : ''}${r.ai_summary || excerpt}</div>
                        <div class="record-excerpt">${excerpt}</div>
                    </div>
                    <div class="record-scores">
                        <span style="color:${App.moodColorHex(es === '-' ? 5 : es)}">♥ ${es}</span>
                        <span style="color:${App.moodColorHex(ss === '-' ? 5 : 11 - ss)}">⚡ ${ss}</span>
                    </div>
                </div>`;
        }).join('');
    },

    reset() {
        ['filter-start','filter-end'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
        ['filter-mood-type','filter-risk'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
        this.search();
    },

    async showDetail(id) {
        const res = await App.api(`/api/mood-records/${id}`);
        if (!res.success) { App.toast('加载失败', 'error'); return; }
        const r = res.record;
        const ai = r.ai_analysis_json || {};
        const riskClass = {normal:'risk-normal',watch:'risk-watch',high:'risk-high'}[r.ai_risk_level] || 'risk-normal';
        const riskText = r.ai_risk_level === 'high' ? '需要关注' : r.ai_risk_level === 'watch' ? '留意观察' : '状态良好';
        const tags = [
            ...(Array.isArray(r.mood_types) ? r.mood_types : []),
            ...(Array.isArray(r.ai_auto_tags) ? r.ai_auto_tags : [])
        ];
        const suggestions = Array.isArray(r.ai_suggestions) ? r.ai_suggestions : (Array.isArray(ai.suggestions) ? ai.suggestions : []);
        const keywords = Array.isArray(r.ai_keywords) ? r.ai_keywords : [];

        App.showModal(`
            <div class="modal-title">
                <span>📖 ${r.record_date}</span>
                <span class="risk-badge ${riskClass}">${riskText}</span>
            </div>
            ${r.ai_summary ? `<div class="ai-summary">${r.ai_summary}</div>` : ''}
            <div class="ai-scores">
                <div class="ai-score-item"><div class="ai-score-val" style="color:${App.moodColorHex(r.ai_emotion_score||5)}">${r.ai_emotion_score||'-'}</div><div class="ai-score-lbl">情绪分</div></div>
                <div class="ai-score-item"><div class="ai-score-val" style="color:${App.moodColorHex(11-(r.ai_stress_score||5))}">${r.ai_stress_score||'-'}</div><div class="ai-score-lbl">压力分</div></div>
                <div class="ai-score-item"><div class="ai-score-val" style="color:${App.moodColorHex(r.ai_energy_score||5)}">${r.ai_energy_score||'-'}</div><div class="ai-score-lbl">精力分</div></div>
            </div>
            ${r.ai_main_emotion ? `<div class="mb-md"><div class="tag-group"><span class="tag tag-green">${r.ai_main_emotion}</span>${(r.ai_secondary_emotions||[]).map(e=>`<span class="tag tag-blue">${e}</span>`).join('')}</div></div>` : ''}
            ${tags.length ? `<div class="mb-md"><div class="tag-group">${tags.map(t=>`<span class="tag tag-green">${t}</span>`).join('')}</div></div>` : ''}
            ${keywords.length ? `<div class="mb-md"><div class="ai-section-title">关键词</div><div class="tag-group">${keywords.map(k=>`<span class="tag tag-blue">${k}</span>`).join('')}</div></div>` : ''}
            ${r.diary_text ? `<div class="card card-kraft mb-md"><div class="card-title">📝 日记</div><p style="white-space:pre-wrap;font-size:0.9rem;line-height:1.85">${r.diary_text}</p></div>` : ''}
            ${suggestions.length ? `<div class="mb-md"><div class="ai-section-title">🌿 建议</div>${suggestions.map(s=>`<div class="ai-suggestion">${s}</div>`).join('')}</div>` : ''}
            <div class="flex gap-sm mt-md">
                <button class="btn btn-outline btn-sm" onclick="History.editRecord(${r.id})">编辑</button>
                <button class="btn btn-danger btn-sm" onclick="History.deleteRecord(${r.id})">删除</button>
                <button class="btn btn-ghost btn-sm" onclick="App.hideModal()" style="margin-left:auto">关闭</button>
            </div>
        `);
    },

    editRecord(id) {
        App.hideModal();
        App.api(`/api/mood-records/${id}`).then(res => { if (res.success) App.navigate('record', res.record); });
    },

    deleteRecord(id) {
        App.hideModal();
        App.confirm('确定要删除这条日记吗？删除后无法恢复。', async () => {
            const res = await App.api(`/api/mood-records/${id}`, { method: 'DELETE' });
            if (res.success) { App.toast('已删除', 'success'); this.search(); }
            else App.toast('删除失败', 'error');
        });
    }
};
