import json
from datetime import datetime, date, timedelta
from models.database import get_db, dict_from_row
from services.ai_service import generate_period_report


def _build_records_summary(records):
    lines = []
    for r in records:
        parts = [f"日期: {r['record_date']}"]
        if r.get('user_mood_score'):
            parts.append(f"心情自评: {r['user_mood_score']}/10")
        if r.get('ai_emotion_score'):
            parts.append(f"AI情绪分: {r['ai_emotion_score']}/10")
        if r.get('ai_stress_score'):
            parts.append(f"压力分: {r['ai_stress_score']}/10")
        if r.get('ai_energy_score'):
            parts.append(f"精力分: {r['ai_energy_score']}/10")
        if r.get('sleep_hours'):
            parts.append(f"睡眠: {r['sleep_hours']}小时")
        if r.get('ai_main_emotion'):
            parts.append(f"主要情绪: {r['ai_main_emotion']}")
        if r.get('ai_summary'):
            parts.append(f"总结: {r['ai_summary']}")
        if r.get('ai_risk_level') and r['ai_risk_level'] != 'normal':
            parts.append(f"关注等级: {r['ai_risk_level']}")

        kw = r.get('ai_keywords')
        if kw:
            if isinstance(kw, str):
                try:
                    kw = json.loads(kw)
                except (json.JSONDecodeError, TypeError):
                    kw = []
            if kw:
                parts.append(f"关键词: {', '.join(kw[:3])}")

        lines.append(' | '.join(parts))
    return '\n'.join(lines)


def generate_report(user_id, report_type='weekly'):
    today = date.today()
    if report_type == 'weekly':
        start_date = today - timedelta(days=6)
    else:
        start_date = today.replace(day=1)

    start_str = start_date.isoformat()
    end_str = today.isoformat()

    with get_db() as conn:
        rows = conn.execute(
            'SELECT * FROM mood_records WHERE user_id=? AND record_date>=? AND record_date<=? ORDER BY record_date ASC',
            (user_id, start_str, end_str)
        ).fetchall()

    records = [dict_from_row(r) for r in rows]

    if not records:
        return None, '该时段内没有记录，无法生成报告'

    emotion_scores = [r['ai_emotion_score'] for r in records if r.get('ai_emotion_score')]
    stress_scores = [r['ai_stress_score'] for r in records if r.get('ai_stress_score')]
    avg_emotion = round(sum(emotion_scores) / len(emotion_scores), 1) if emotion_scores else None
    avg_stress = round(sum(stress_scores) / len(stress_scores), 1) if stress_scores else None

    summary_text = _build_records_summary(records)
    ai_report = generate_period_report(summary_text, report_type)

    with get_db() as conn:
        cursor = conn.execute('''
            INSERT INTO reports (user_id, report_type, start_date, end_date,
                                 avg_emotion_score, avg_stress_score, report_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            user_id, report_type, start_str, end_str,
            avg_emotion, avg_stress,
            json.dumps(ai_report, ensure_ascii=False)
        ))
        report_id = cursor.lastrowid

    lowest_emotion_date = None
    highest_stress_date = None
    if emotion_scores:
        min_score = min(r.get('ai_emotion_score', 99) for r in records if r.get('ai_emotion_score'))
        for r in records:
            if r.get('ai_emotion_score') == min_score:
                lowest_emotion_date = r['record_date']
                break
    if stress_scores:
        max_stress = max(r.get('ai_stress_score', 0) for r in records if r.get('ai_stress_score'))
        for r in records:
            if r.get('ai_stress_score') == max_stress:
                highest_stress_date = r['record_date']
                break

    kw_count = {}
    for r in records:
        kws = r.get('ai_keywords', [])
        if isinstance(kws, str):
            try:
                kws = json.loads(kws)
            except (json.JSONDecodeError, TypeError):
                kws = []
        for k in (kws or []):
            kw_count[k] = kw_count.get(k, 0) + 1
    top_keywords = sorted(kw_count.items(), key=lambda x: -x[1])[:10]

    return {
        'id': report_id,
        'report_type': report_type,
        'start_date': start_str,
        'end_date': end_str,
        'avg_emotion_score': avg_emotion,
        'avg_stress_score': avg_stress,
        'lowest_emotion_date': lowest_emotion_date,
        'highest_stress_date': highest_stress_date,
        'top_keywords': [{'word': k, 'count': c} for k, c in top_keywords],
        'record_count': len(records),
        'ai_report': ai_report,
    }, None


def get_reports(user_id):
    with get_db() as conn:
        rows = conn.execute(
            'SELECT * FROM reports WHERE user_id=? ORDER BY created_at DESC',
            (user_id,)
        ).fetchall()
    return [dict_from_row(r) for r in rows]


def get_report(report_id, user_id):
    with get_db() as conn:
        row = conn.execute(
            'SELECT * FROM reports WHERE id=? AND user_id=?',
            (report_id, user_id)
        ).fetchone()
    return dict_from_row(row)
