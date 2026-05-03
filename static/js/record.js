const Record = {
    editingId: null,

    init(data) {
        this.editingId = data ? data.id : null;
        const el = document.getElementById('page-record');
        const today = new Date();
        const dateStr = data?.record_date || today.toISOString().slice(0, 10);
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        const dateDisplay = `${today.getFullYear()} 年 ${today.getMonth()+1} 月 ${today.getDate()} 日 周${weekdays[today.getDay()]}`;
        const timeDisplay = `${String(today.getHours()).padStart(2,'0')}:${String(today.getMinutes()).padStart(2,'0')}`;
        const existingText = data?.diary_text || '';

        el.innerHTML = `
            <div class="flex-between mb-md">
                <h1 class="page-title" style="margin-bottom:0">📝 ${this.editingId ? '编辑日记' : '情绪日记'}</h1>
            </div>
            <div class="diary-editor">
                <div class="diary-header">
                    <div class="diary-date">📅 ${dateDisplay}　${timeDisplay}</div>
                    <input type="date" id="rec-date" value="${dateStr}" class="form-input" style="width:auto;padding:6px 12px;font-size:0.8rem;border-radius:14px;max-width:160px">
                </div>
                <div class="diary-body">
                    <textarea id="rec-diary" class="diary-textarea" placeholder="写下你今天的感受、经历和想法...

今天整体还算平静。
早上完成了课程设计的结构梳理，感觉思路清晰了很多，
有一种"慢慢来，也能做完"的踏实感。

AI 会帮你分析情绪状态、压力水平，并给出温和的建议 🌿" oninput="Record.updateCount()">${existingText}</textarea>
                </div>
                <div class="diary-footer">
                    <div class="diary-char-count" id="rec-char-count">${existingText.length}/2000</div>
                    <div class="flex gap-sm">
                        <button class="btn btn-ghost btn-sm" onclick="Record.saveDraft()">仅保存</button>
                        <button class="btn btn-primary" id="rec-submit" onclick="Record.submitAndAnalyze()">
                            ✨ 提交并分析
                        </button>
                    </div>
                </div>
            </div>
            <div id="rec-ai-result"></div>
        `;
    },

    updateCount() {
        const text = document.getElementById('rec-diary').value;
        document.getElementById('rec-char-count').textContent = `${text.length}/2000`;
    },

    async saveDraft() {
        const text = document.getElementById('rec-diary').value.trim();
        if (!text) { App.toast('请先写点什么吧 📝', 'info'); return; }
        const data = {
            record_date: document.getElementById('rec-date').value,
            diary_text: text,
            user_mood_score: 5, user_stress_score: 5,
            sleep_hours: 0, sleep_quality: 5,
            mood_types: [], user_tags: [],
        };
        let res;
        if (this.editingId) {
            res = await App.api(`/api/mood-records/${this.editingId}`, { method: 'PUT', body: JSON.stringify(data) });
        } else {
            res = await App.api('/api/mood-records', { method: 'POST', body: JSON.stringify(data) });
        }
        if (res.success) { App.toast('日记已保存 ✓', 'success'); }
        else App.toast(res.message || '保存失败', 'error');
    },

    async submitAndAnalyze() {
        const btn = document.getElementById('rec-submit');
        const text = document.getElementById('rec-diary').value.trim();
        if (!text) { App.toast('请先写点什么再分析吧 📝', 'info'); return; }

        btn.disabled = true;
        btn.innerHTML = '<span class="loading-spinner" style="width:16px;height:16px;border-width:2px"></span> AI 分析中...';

        const data = {
            record_date: document.getElementById('rec-date').value,
            diary_text: text,
            user_mood_score: 5, user_stress_score: 5,
            sleep_hours: 0, sleep_quality: 5,
            mood_types: [], user_tags: [],
        };

        let res;
        if (this.editingId) {
            res = await App.api(`/api/mood-records/${this.editingId}`, { method: 'PUT', body: JSON.stringify(data) });
        } else {
            res = await App.api('/api/mood-records', { method: 'POST', body: JSON.stringify(data) });
        }

        if (!res.success) {
            App.toast(res.message || '保存失败', 'error');
            btn.disabled = false; btn.innerHTML = '✨ 提交并分析';
            return;
        }

        const recordId = res.record.id;
        const aiRes = await App.api('/api/ai/analyze-diary', {
            method: 'POST', body: JSON.stringify({ record_id: recordId })
        });

        btn.disabled = false; btn.innerHTML = '✨ 提交并分析';

        if (aiRes.success) {
            App.toast('分析完成 ✨', 'success');
            this.renderAiResult(aiRes.record);
        } else {
            App.toast('AI 分析暂时不可用，日记已保存', 'info');
        }
    },

    renderAiResult(record) {
        const container = document.getElementById('rec-ai-result');
        const ai = record.ai_analysis_json || {};
        const riskClass = { normal: 'risk-normal', watch: 'risk-watch', high: 'risk-high' }[ai.risk_level] || 'risk-normal';
        const riskText = ai.risk_level === 'high' ? '需要关注' : ai.risk_level === 'watch' ? '留意观察' : '状态良好';
        const sentimentText = ai.sentiment === 'positive' ? '积极' : ai.sentiment === 'negative' ? '偏低落' : '平稳';
        const secondaryEmotions = Array.isArray(ai.secondary_emotions) ? ai.secondary_emotions : [];
        const stressSources = Array.isArray(ai.stress_sources) ? ai.stress_sources : [];
        const keywords = Array.isArray(ai.keywords) ? ai.keywords : [];
        const autoTags = Array.isArray(ai.auto_tags) ? ai.auto_tags : [];
        const suggestions = Array.isArray(ai.suggestions) ? ai.suggestions : [];
        const moodTypes = Array.isArray(ai.mood_types) ? ai.mood_types : [];

        container.innerHTML = `
            <div class="ai-panel" style="animation:pageIn 0.3s ease">
                <div class="ai-header">AI 心理小贴士 ✨</div>
                ${ai.summary ? `<div class="ai-summary">${ai.summary}</div>` : ''}
                <div class="ai-scores">
                    <div class="ai-score-item">
                        <div class="ai-score-val" style="color:${App.moodColorHex(ai.emotion_score||5)}">${ai.emotion_score || '-'}</div>
                        <div class="ai-score-lbl">情绪分</div>
                    </div>
                    <div class="ai-score-item">
                        <div class="ai-score-val" style="color:${App.moodColorHex(11-(ai.stress_score||5))}">${ai.stress_score || '-'}</div>
                        <div class="ai-score-lbl">压力分</div>
                    </div>
                    <div class="ai-score-item">
                        <div class="ai-score-val" style="color:${App.moodColorHex(ai.energy_score||5)}">${ai.energy_score || '-'}</div>
                        <div class="ai-score-lbl">精力分</div>
                    </div>
                </div>
                <div class="ai-section">
                    <div class="ai-section-title">情绪识别</div>
                    <div class="tag-group">
                        <span class="tag tag-green">${ai.main_emotion || '未知'}</span>
                        ${secondaryEmotions.map(e => `<span class="tag tag-blue">${e}</span>`).join('')}
                        <span class="tag tag-purple">${sentimentText}</span>
                    </div>
                </div>
                ${ai.user_mood_score ? `
                <div class="ai-section">
                    <div class="ai-section-title">AI 综合评估</div>
                    <div class="tag-group">
                        <span class="tag tag-green">心情 ${ai.user_mood_score}/10</span>
                        <span class="tag tag-orange">压力 ${ai.user_stress_score}/10</span>
                        ${ai.sleep_hours ? `<span class="tag tag-blue">睡眠 ${ai.sleep_hours}h</span>` : ''}
                        ${ai.sleep_quality && ai.sleep_quality !== 5 ? `<span class="tag tag-purple">睡眠质量 ${ai.sleep_quality}/10</span>` : ''}
                    </div>
                </div>` : ''}
                ${moodTypes.length ? `
                <div class="ai-section">
                    <div class="ai-section-title">情绪类型</div>
                    <div class="tag-group">${moodTypes.map(m => `<span class="tag tag-yellow">${m}</span>`).join('')}</div>
                </div>` : ''}
                ${autoTags.length ? `
                <div class="ai-section">
                    <div class="ai-section-title">自动标签</div>
                    <div class="tag-group">${autoTags.map(t => `<span class="tag tag-green">${t}</span>`).join('')}</div>
                </div>` : ''}
                ${stressSources.length ? `
                <div class="ai-section">
                    <div class="ai-section-title">压力来源</div>
                    <div class="tag-group">${stressSources.map(s => `<span class="tag tag-orange">${s}</span>`).join('')}</div>
                </div>` : ''}
                ${keywords.length ? `
                <div class="ai-section">
                    <div class="ai-section-title">关键词</div>
                    <div class="tag-group">${keywords.map(k => `<span class="tag tag-blue">${k}</span>`).join('')}</div>
                </div>` : ''}
                <div class="flex-between mt-sm">
                    <span class="risk-badge ${riskClass}">${riskText}</span>
                </div>
                ${suggestions.length ? `
                <div class="ai-section mt-md">
                    <div class="ai-section-title">🌿 调节建议</div>
                    ${suggestions.map(s => `<div class="ai-suggestion">${s}</div>`).join('')}
                </div>` : ''}
                <div class="flex gap-sm mt-md">
                    <button class="btn btn-primary btn-sm" onclick="App.navigate('home')">返回首页</button>
                    <button class="btn btn-outline btn-sm" onclick="App.navigate('history')">查看历史</button>
                </div>
            </div>
        `;
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    showAnalysis(record) {
        this.renderAiResult(record);
        const el = document.getElementById('page-analysis');
        el.innerHTML = document.getElementById('rec-ai-result').innerHTML;
        App.navigate('analysis');
    }
};
