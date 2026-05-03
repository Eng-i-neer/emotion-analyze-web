const Charts = {
    currentDays: 30,

    async init() {
        const el = document.getElementById('page-charts');
        el.innerHTML = `
            <h1 class="page-title">📊 数据分析</h1>
            <div class="chart-tabs" id="chart-period-tabs">
                <span class="chart-tab" data-days="7" onclick="Charts.switchPeriod(7, this)">近7天</span>
                <span class="chart-tab active" data-days="30" onclick="Charts.switchPeriod(30, this)">近30天</span>
                <span class="chart-tab" data-days="90" onclick="Charts.switchPeriod(90, this)">近90天</span>
            </div>
            <div class="chart-container"><div class="chart-title">情绪评分趋势</div><canvas id="chart-emotion"></canvas></div>
            <div class="chart-container"><div class="chart-title">压力评分趋势</div><canvas id="chart-stress"></canvas></div>
            <div class="chart-container"><div class="chart-title">精力评分趋势</div><canvas id="chart-energy"></canvas></div>
            <div class="chart-container"><div class="chart-title">睡眠与情绪关系</div><canvas id="chart-sleep-mood"></canvas></div>
            <div class="chart-container"><div class="chart-title">情绪分布</div><canvas id="chart-emotions-pie"></canvas></div>
            <div class="chart-container"><div class="chart-title">标签统计</div><canvas id="chart-tags-bar"></canvas></div>
            <div class="chart-container"><div class="chart-title">关键词统计</div><canvas id="chart-keywords-bar"></canvas></div>
            <div class="chart-container"><div class="chart-title">关注等级分布</div><canvas id="chart-risk-pie"></canvas></div>
        `;
        await this.loadAll();
    },

    async switchPeriod(days, el) {
        this.currentDays = days;
        document.querySelectorAll('#chart-period-tabs .chart-tab').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
        await this.loadAll();
    },

    async loadAll() {
        const d = this.currentDays;
        const [tr, em, tg, kw, rk] = await Promise.all([
            App.api(`/api/stats/trends?days=${d}`), App.api(`/api/stats/emotions?days=${d}`),
            App.api(`/api/stats/tags?days=${d}`), App.api(`/api/stats/keywords?days=${d}`),
            App.api(`/api/stats/risk?days=${d}`)
        ]);
        if (tr.success && tr.trends.length) {
            const t = tr.trends;
            this.drawLine('chart-emotion', t.map(x=>x.record_date.slice(5)), t.map(x=>x.avg_emotion||x.avg_user_mood||0), '#5D9B63');
            this.drawLine('chart-stress', t.map(x=>x.record_date.slice(5)), t.map(x=>x.avg_stress||0), '#F6A04D');
            this.drawLine('chart-energy', t.map(x=>x.record_date.slice(5)), t.map(x=>x.avg_energy||0), '#8BA8C8');
            this.drawScatter('chart-sleep-mood', t.map(x=>x.avg_sleep||0), t.map(x=>x.avg_emotion||x.avg_user_mood||0));
        }
        if (em.success) this.drawPie('chart-emotions-pie', em.emotions);
        if (tg.success) this.drawBar('chart-tags-bar', tg.tags);
        if (kw.success) this.drawBar('chart-keywords-bar', kw.keywords);
        if (rk.success) this.drawPie('chart-risk-pie', rk.risk, {normal:'#5D9B63',watch:'#F6A04D',high:'#E96862'});
    },

    _setup(id) {
        const c = document.getElementById(id); if (!c) return null;
        const dpr = window.devicePixelRatio || 1;
        const r = c.getBoundingClientRect();
        c.width = r.width * dpr; c.height = r.height * dpr;
        const ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
        return { ctx, w: r.width, h: r.height };
    },

    drawLine(id, labels, values, color) {
        const s = this._setup(id); if (!s || !values.length) return;
        const { ctx, w, h } = s;
        const pad = { top: 14, right: 16, bottom: 26, left: 32 };
        const cw = w - pad.left - pad.right, ch = h - pad.top - pad.bottom;
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(120,100,70,0.06)'; ctx.lineWidth = 0.5;
        ctx.fillStyle = '#A79B8B'; ctx.font = '9px sans-serif'; ctx.textAlign = 'right';
        for (let i = 0; i <= 10; i += 2) {
            const y = pad.top + ch - (i/10)*ch;
            ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w-pad.right, y); ctx.stroke();
            ctx.fillText(i, pad.left-4, y+3);
        }
        const step = values.length > 1 ? cw / (values.length - 1) : cw;
        const grad = ctx.createLinearGradient(0, pad.top, 0, h-pad.bottom);
        grad.addColorStop(0, color+'18'); grad.addColorStop(1, color+'03');
        ctx.beginPath(); ctx.moveTo(pad.left, pad.top+ch-(values[0]/10)*ch);
        values.forEach((v,i) => ctx.lineTo(pad.left+i*step, pad.top+ch-(v/10)*ch));
        ctx.lineTo(pad.left+(values.length-1)*step, pad.top+ch);
        ctx.lineTo(pad.left, pad.top+ch); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
        ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        values.forEach((v,i) => { const x=pad.left+i*step, y=pad.top+ch-(v/10)*ch; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
        ctx.stroke();
        values.forEach((v,i) => { const x=pad.left+i*step, y=pad.top+ch-(v/10)*ch; ctx.beginPath(); ctx.arc(x,y,3.5,0,Math.PI*2); ctx.fillStyle='#FFFDF7'; ctx.fill(); ctx.strokeStyle=color; ctx.lineWidth=2; ctx.stroke(); });
        ctx.fillStyle = '#A79B8B'; ctx.font = '8px sans-serif'; ctx.textAlign = 'center';
        const skip = Math.max(1, Math.floor(labels.length/8));
        labels.forEach((l,i) => { if (i%skip===0) ctx.fillText(l, pad.left+i*step, h-6); });
    },

    drawScatter(id, xV, yV) {
        const s = this._setup(id); if (!s || !xV.length) return;
        const { ctx, w, h } = s;
        const pad = { top: 14, right: 16, bottom: 26, left: 32 };
        const cw = w-pad.left-pad.right, ch = h-pad.top-pad.bottom;
        ctx.clearRect(0, 0, w, h);
        const xMax = Math.max(...xV, 12), xMin = 0;
        ctx.strokeStyle = 'rgba(120,100,70,0.06)'; ctx.lineWidth = 0.5;
        ctx.fillStyle = '#A79B8B'; ctx.font = '9px sans-serif';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 10; i += 2) { const y=pad.top+ch-(i/10)*ch; ctx.beginPath(); ctx.moveTo(pad.left,y); ctx.lineTo(w-pad.right,y); ctx.stroke(); ctx.fillText(i,pad.left-4,y+3); }
        ctx.textAlign = 'center';
        for (let i = 0; i <= xMax; i += 2) ctx.fillText(i+'h', pad.left+((i-xMin)/(xMax-xMin||1))*cw, h-6);
        xV.forEach((xv,i) => {
            const x = pad.left+((xv-xMin)/(xMax-xMin||1))*cw, y = pad.top+ch-(yV[i]/10)*ch;
            ctx.beginPath(); ctx.arc(x,y,5,0,Math.PI*2); ctx.fillStyle='rgba(93,155,99,0.2)'; ctx.fill(); ctx.strokeStyle='#5D9B63'; ctx.lineWidth=1.5; ctx.stroke();
        });
    },

    drawPie(id, data, colorMap) {
        const s = this._setup(id); if (!s) return;
        const { ctx, w, h } = s;
        ctx.clearRect(0, 0, w, h);
        const entries = Object.entries(data);
        if (!entries.length) { ctx.fillStyle='#A79B8B'; ctx.font='12px sans-serif'; ctx.textAlign='center'; ctx.fillText('暂无数据',w/2,h/2); return; }
        const total = entries.reduce((s,[,v])=>s+v,0);
        const colors = colorMap || {};
        const dc = ['#5D9B63','#F6A04D','#8BA8C8','#E96862','#A78BCB','#F5C84C','#E8A0BF','#7C9E8B','#C8A87B','#9BB5C8'];
        const cx = w*0.35, cy = h/2, r = Math.min(cx-16, cy-16);
        let sa = -Math.PI/2;
        entries.forEach(([k,v],i) => { const a = (v/total)*Math.PI*2; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,sa,sa+a); ctx.closePath(); ctx.fillStyle = colors[k]||dc[i%dc.length]; ctx.fill(); sa += a; });
        ctx.beginPath(); ctx.arc(cx,cy,r*0.42,0,Math.PI*2); ctx.fillStyle='#FFFDF7'; ctx.fill();
        let ly = 18; ctx.font='11px sans-serif'; ctx.textAlign='left';
        entries.forEach(([k,v],i) => { if(ly>h-8)return; ctx.fillStyle=colors[k]||dc[i%dc.length]; ctx.beginPath(); ctx.arc(w*0.65+5,ly+4,4,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#3C352B'; ctx.fillText(`${k} ${((v/total)*100).toFixed(0)}%`,w*0.65+16,ly+8); ly+=20; });
    },

    drawBar(id, data) {
        const s = this._setup(id); if (!s) return;
        const { ctx, w, h } = s;
        ctx.clearRect(0, 0, w, h);
        const entries = Object.entries(data);
        if (!entries.length) { ctx.fillStyle='#A79B8B'; ctx.font='12px sans-serif'; ctx.textAlign='center'; ctx.fillText('暂无数据',w/2,h/2); return; }
        const pad = {top:12,right:16,bottom:12,left:72};
        const cw = w-pad.left-pad.right;
        const maxV = Math.max(...entries.map(([,v])=>v));
        const barH = Math.min(18, (h-pad.top-pad.bottom-entries.length*3)/entries.length);
        const gap = 3;
        const dc = ['#5D9B63','#F6A04D','#8BA8C8','#A78BCB','#E8A0BF','#F5C84C'];
        entries.forEach(([k,v],i) => {
            const y = pad.top+i*(barH+gap), bw = (v/maxV)*cw;
            ctx.fillStyle = dc[i%dc.length];
            ctx.beginPath(); const r=Math.min(barH/2,5);
            ctx.moveTo(pad.left,y); ctx.lineTo(pad.left+bw-r,y); ctx.arcTo(pad.left+bw,y,pad.left+bw,y+r,r); ctx.lineTo(pad.left+bw,y+barH-r); ctx.arcTo(pad.left+bw,y+barH,pad.left+bw-r,y+barH,r); ctx.lineTo(pad.left,y+barH); ctx.closePath(); ctx.fill();
            ctx.fillStyle='#3C352B'; ctx.font='10px sans-serif'; ctx.textAlign='right'; ctx.fillText(k.length>5?k.slice(0,5)+'..':k,pad.left-5,y+barH/2+3);
            ctx.fillStyle='#7C7162'; ctx.textAlign='left'; ctx.fillText(v,pad.left+bw+5,y+barH/2+3);
        });
    }
};
