const Suggestion = {
    async init() {
        const el = document.getElementById('page-suggestion');
        el.innerHTML = `
            <h1 class="page-title">🌿 AI 心理助手</h1>
            <p class="text-sec mb-lg" style="font-size:0.9rem">AI 会根据你最近的情绪状态，给出个性化的调节建议。</p>
            <div id="suggestion-content">
                <div class="text-center"><button class="btn btn-primary" onclick="Suggestion.generate()">✨ 获取 AI 个性化建议</button></div>
            </div>
        `;
    },

    async generate() {
        const content = document.getElementById('suggestion-content');
        content.innerHTML = '<div class="loading-overlay"><div class="loading-spinner"></div><span>AI 正在分析你的近期状态...</span></div>';

        const res = await App.api('/api/ai/suggestions');
        if (!res.success) {
            content.innerHTML = `
                <div class="card card-kraft text-center">
                    <p class="text-sec">${res.message || '暂时无法获取建议'}</p>
                    <p class="text-sm text-sec mt-sm">请先记录几天日记，AI 才能更好地了解你</p>
                    <button class="btn btn-outline btn-sm mt-md" onclick="App.navigate('record')">去写日记</button>
                </div>`;
            return;
        }

        const data = res.suggestions;
        let html = '';

        if (data.daily_quote) {
            html += `
                <div class="card-sticky mb-lg" style="text-align:center;padding:24px;transform:rotate(-0.5deg)">
                    <div style="font-size:1.05rem;line-height:1.8;font-style:italic;color:var(--text)">"${data.daily_quote}"</div>
                    <div class="text-sm text-sec mt-sm">—— MindNote ✨</div>
                </div>`;
        }

        if (data.focus_areas && data.focus_areas.length) {
            html += `
                <div class="card mb-md">
                    <div class="card-title">💡 近期关注</div>
                    <div class="tag-group">${data.focus_areas.map(a => `<span class="tag tag-orange">${a}</span>`).join('')}</div>
                </div>`;
        }

        if (data.personalized_suggestions) {
            const tagColors = ['tag-green', 'tag-orange', 'tag-pink', 'tag-blue', 'tag-yellow', 'tag-purple'];
            let ci = 0;
            for (const [emotion, suggestions] of Object.entries(data.personalized_suggestions)) {
                const tc = tagColors[ci % tagColors.length]; ci++;
                html += `
                    <div class="suggestion-category">
                        <h3><span class="tag ${tc}" style="margin-right:6px">${emotion}</span></h3>
                        <div style="display:flex;flex-direction:column;gap:6px">
                            ${suggestions.map(s => `<div class="suggestion-card">${s}</div>`).join('')}
                        </div>
                    </div>`;
            }
        }

        html += `<div class="text-center mt-md"><button class="btn btn-outline btn-sm" onclick="Suggestion.generate()">✨ 重新生成</button></div>`;
        content.innerHTML = html;
    }
};
