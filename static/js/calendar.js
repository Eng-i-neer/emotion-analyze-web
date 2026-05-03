const Calendar = {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,

    async init() {
        const el = document.getElementById('page-calendar');
        el.innerHTML = `
            <h1 class="page-title">📅 情绪日历</h1>
            <div class="card">
                <div class="calendar-header">
                    <div class="calendar-nav"><button onclick="Calendar.prevMonth()">‹</button></div>
                    <h2 id="cal-title">${this.year}年${this.month}月</h2>
                    <div class="calendar-nav"><button onclick="Calendar.nextMonth()">›</button></div>
                </div>
                <div class="calendar-grid" id="cal-grid"></div>
            </div>
            <div id="cal-detail" class="mt-md"></div>`;
        await this.load();
    },

    async load() {
        document.getElementById('cal-title').textContent = `${this.year}年${this.month}月`;
        const res = await App.api(`/api/stats/calendar?year=${this.year}&month=${this.month}`);
        const calData = res.success ? res.calendar : [];
        const scoreMap = {};
        calData.forEach(d => { scoreMap[d.record_date] = d.score; });

        const grid = document.getElementById('cal-grid');
        const weekdays = ['日','一','二','三','四','五','六'];
        let html = weekdays.map(d => `<div class="calendar-weekday">${d}</div>`).join('');
        const firstDay = new Date(this.year, this.month-1, 1).getDay();
        const daysInMonth = new Date(this.year, this.month, 0).getDate();
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

        for (let i = 0; i < firstDay; i++) html += '<div class="calendar-day empty"></div>';
        for (let d = 1; d <= daysInMonth; d++) {
            const ds = `${this.year}-${String(this.month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const score = scoreMap[ds];
            let cls = 'cal-none';
            let face = '';
            if (score != null) {
                if (score >= 8) { cls = 'cal-high'; face = '😊'; }
                else if (score >= 5) { cls = 'cal-mid'; face = '😐'; }
                else if (score >= 3) { cls = 'cal-low'; face = '😟'; }
                else { cls = 'cal-vlow'; face = '😢'; }
            }
            const isToday = ds === todayStr ? ' today' : '';
            html += `<div class="calendar-day ${cls}${isToday}" onclick="Calendar.showDay('${ds}')" title="${score!=null?'情绪分:'+Math.round(score):'未记录'}">
                <span style="font-size:${face?'1.1rem':'0.85rem'}">${face || d}</span>
                <span style="font-size:0.55rem;color:var(--text-weak)">${d}</span>
            </div>`;
        }
        grid.innerHTML = html;
    },

    async prevMonth() { this.month--; if (this.month<1){this.month=12;this.year--;} await this.load(); },
    async nextMonth() { this.month++; if (this.month>12){this.month=1;this.year++;} await this.load(); },

    async showDay(dateStr) {
        const res = await App.api(`/api/mood-records?start_date=${dateStr}&end_date=${dateStr}`);
        const detail = document.getElementById('cal-detail');
        if (!res.success || !res.records.length) {
            detail.innerHTML = `<div class="card card-kraft text-center"><p class="text-sec">${dateStr} 暂无记录</p><button class="btn btn-primary btn-sm mt-sm" onclick="App.navigate('record')">去记录</button></div>`;
            return;
        }
        detail.innerHTML = res.records.map(r => `
            <div class="card mb-md" style="cursor:pointer" onclick="History.showDetail(${r.id})">
                <div class="flex-between">
                    <strong>${r.ai_main_emotion||''}${r.ai_summary?' · '+r.ai_summary:''}</strong>
                    <div class="record-scores">
                        <span style="color:${App.moodColorHex(r.ai_emotion_score||5)}">♥ ${r.ai_emotion_score||'-'}</span>
                        <span style="color:${App.moodColorHex(11-(r.ai_stress_score||5))}">⚡ ${r.ai_stress_score||'-'}</span>
                    </div>
                </div>
                ${r.diary_text?`<p class="text-sec text-sm mt-sm">${r.diary_text.length>80?r.diary_text.slice(0,80)+'...':r.diary_text}</p>`:''}
            </div>
        `).join('');
    }
};
