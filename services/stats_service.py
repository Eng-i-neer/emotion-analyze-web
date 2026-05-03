import json
from datetime import datetime, timedelta, date
from models.database import get_db, dict_from_row
from collections import Counter


def get_overview(user_id):
    today = date.today().isoformat()
    week_ago = (date.today() - timedelta(days=6)).isoformat()

    with get_db() as conn:
        today_record = conn.execute(
            'SELECT * FROM mood_records WHERE user_id=? AND record_date=? ORDER BY created_at DESC LIMIT 1',
            (user_id, today)
        ).fetchone()

        recent = conn.execute(
            'SELECT * FROM mood_records WHERE user_id=? AND record_date>=? ORDER BY record_date ASC',
            (user_id, week_ago)
        ).fetchall()

        total = conn.execute(
            'SELECT COUNT(*) as cnt FROM mood_records WHERE user_id=?', (user_id,)
        ).fetchone()['cnt']

    today_data = dict_from_row(today_record) if today_record else None
    recent_data = [dict_from_row(r) for r in recent]

    return {
        'today': today_data,
        'recent_7days': recent_data,
        'total_records': total,
    }


def get_trends(user_id, days=30):
    start = (date.today() - timedelta(days=days-1)).isoformat()
    with get_db() as conn:
        rows = conn.execute(
            '''SELECT record_date, 
                      AVG(ai_emotion_score) as avg_emotion,
                      AVG(ai_stress_score) as avg_stress,
                      AVG(ai_energy_score) as avg_energy,
                      AVG(user_mood_score) as avg_user_mood,
                      AVG(sleep_hours) as avg_sleep
               FROM mood_records
               WHERE user_id=? AND record_date>=?
               GROUP BY record_date
               ORDER BY record_date ASC''',
            (user_id, start)
        ).fetchall()
    return [dict(r) for r in rows]


def get_calendar_data(user_id, year, month):
    start = f'{year}-{month:02d}-01'
    if month == 12:
        end = f'{year+1}-01-01'
    else:
        end = f'{year}-{month+1:02d}-01'

    with get_db() as conn:
        rows = conn.execute(
            '''SELECT record_date, 
                      AVG(COALESCE(ai_emotion_score, user_mood_score)) as score,
                      ai_main_emotion, ai_risk_level
               FROM mood_records 
               WHERE user_id=? AND record_date>=? AND record_date<?
               GROUP BY record_date
               ORDER BY record_date''',
            (user_id, start, end)
        ).fetchall()
    return [dict(r) for r in rows]


def get_tag_stats(user_id, days=30):
    start = (date.today() - timedelta(days=days-1)).isoformat()
    with get_db() as conn:
        rows = conn.execute(
            'SELECT user_tags, ai_auto_tags FROM mood_records WHERE user_id=? AND record_date>=?',
            (user_id, start)
        ).fetchall()

    counter = Counter()
    for r in rows:
        for field in ['user_tags', 'ai_auto_tags']:
            val = r[field]
            if val:
                try:
                    tags = json.loads(val) if isinstance(val, str) else val
                    for t in tags:
                        counter[t] += 1
                except (json.JSONDecodeError, TypeError):
                    pass
    return dict(counter.most_common(20))


def get_keyword_stats(user_id, days=30):
    start = (date.today() - timedelta(days=days-1)).isoformat()
    with get_db() as conn:
        rows = conn.execute(
            'SELECT ai_keywords FROM mood_records WHERE user_id=? AND record_date>=?',
            (user_id, start)
        ).fetchall()

    counter = Counter()
    for r in rows:
        val = r['ai_keywords']
        if val:
            try:
                kws = json.loads(val) if isinstance(val, str) else val
                for k in kws:
                    counter[k] += 1
            except (json.JSONDecodeError, TypeError):
                pass
    return dict(counter.most_common(20))


def get_emotion_type_stats(user_id, days=30):
    start = (date.today() - timedelta(days=days-1)).isoformat()
    with get_db() as conn:
        rows = conn.execute(
            'SELECT ai_main_emotion, mood_types FROM mood_records WHERE user_id=? AND record_date>=?',
            (user_id, start)
        ).fetchall()

    counter = Counter()
    for r in rows:
        if r['ai_main_emotion']:
            counter[r['ai_main_emotion']] += 1
        val = r['mood_types']
        if val:
            try:
                mt = json.loads(val) if isinstance(val, str) else val
                for m in mt:
                    counter[m] += 1
            except (json.JSONDecodeError, TypeError):
                pass
    return dict(counter.most_common(15))


def get_risk_distribution(user_id, days=30):
    start = (date.today() - timedelta(days=days-1)).isoformat()
    with get_db() as conn:
        rows = conn.execute(
            "SELECT ai_risk_level, COUNT(*) as cnt FROM mood_records WHERE user_id=? AND record_date>=? AND ai_risk_level IS NOT NULL GROUP BY ai_risk_level",
            (user_id, start)
        ).fetchall()
    return {r['ai_risk_level']: r['cnt'] for r in rows}


def check_reminders(user_id):
    three_days_ago = (date.today() - timedelta(days=2)).isoformat()
    with get_db() as conn:
        rows = conn.execute(
            '''SELECT record_date, ai_emotion_score, ai_stress_score, ai_risk_level
               FROM mood_records WHERE user_id=? AND record_date>=?
               ORDER BY record_date DESC''',
            (user_id, three_days_ago)
        ).fetchall()

    if len(rows) < 3:
        return []

    reminders = []
    dates_with_data = [dict(r) for r in rows]

    low_mood = all(r.get('ai_emotion_score') and r['ai_emotion_score'] <= 4 for r in dates_with_data[:3])
    high_stress = all(r.get('ai_stress_score') and r['ai_stress_score'] >= 8 for r in dates_with_data[:3])
    risk_alert = all(r.get('ai_risk_level') in ('watch', 'high') for r in dates_with_data[:3])

    if low_mood:
        reminders.append('最近几天你的情绪状态似乎不太理想，可以试着做一些让自己放松的事情，比如散步、听音乐，或者和信任的朋友聊聊天。')
    if high_stress:
        reminders.append('最近几天你的压力似乎比较大，可以先减少一些任务量，保证充足的睡眠，给自己留一些喘息的空间。')
    if risk_alert:
        reminders.append('最近的记录显示你可能需要更多关照自己。如果感到难以承受，可以和信任的人聊聊，或者寻求专业的支持。')

    return reminders
