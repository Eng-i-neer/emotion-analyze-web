import json
from datetime import datetime
from models.database import get_db, dict_from_row


def create_record(user_id, data):
    with get_db() as conn:
        now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        record_date = data.get('record_date', datetime.now().strftime('%Y-%m-%d'))
        cursor = conn.execute('''
            INSERT INTO mood_records
            (user_id, record_date, user_mood_score, user_stress_score,
             sleep_hours, sleep_quality, mood_types, user_tags, diary_text,
             created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
        ''', (
            user_id, record_date,
            data.get('user_mood_score'),
            data.get('user_stress_score'),
            data.get('sleep_hours'),
            data.get('sleep_quality'),
            json.dumps(data.get('mood_types', []), ensure_ascii=False),
            json.dumps(data.get('user_tags', []), ensure_ascii=False),
            data.get('diary_text', ''),
            now, now
        ))
        return cursor.lastrowid


def update_record(record_id, user_id, data):
    with get_db() as conn:
        existing = conn.execute(
            'SELECT id FROM mood_records WHERE id=? AND user_id=?', (record_id, user_id)
        ).fetchone()
        if not existing:
            return False

        now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        conn.execute('''
            UPDATE mood_records SET
                record_date=?, user_mood_score=?, user_stress_score=?,
                sleep_hours=?, sleep_quality=?, mood_types=?, user_tags=?,
                diary_text=?, updated_at=?
            WHERE id=? AND user_id=?
        ''', (
            data.get('record_date'),
            data.get('user_mood_score'),
            data.get('user_stress_score'),
            data.get('sleep_hours'),
            data.get('sleep_quality'),
            json.dumps(data.get('mood_types', []), ensure_ascii=False),
            json.dumps(data.get('user_tags', []), ensure_ascii=False),
            data.get('diary_text', ''),
            now, record_id, user_id
        ))
        return True


def update_ai_fields(record_id, ai_result):
    with get_db() as conn:
        now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        conn.execute('''
            UPDATE mood_records SET
                user_mood_score=?, user_stress_score=?,
                sleep_hours=?, sleep_quality=?,
                mood_types=?, user_tags=?,
                ai_summary=?, ai_main_emotion=?, ai_secondary_emotions=?,
                ai_sentiment=?, ai_emotion_score=?, ai_stress_score=?,
                ai_energy_score=?, ai_sleep_related=?, ai_stress_sources=?,
                ai_keywords=?, ai_auto_tags=?, ai_risk_level=?, ai_suggestions=?,
                ai_analysis_json=?, updated_at=?
            WHERE id=?
        ''', (
            ai_result.get('user_mood_score', 5),
            ai_result.get('user_stress_score', 5),
            ai_result.get('sleep_hours', 0),
            ai_result.get('sleep_quality', 5),
            json.dumps(ai_result.get('mood_types', []), ensure_ascii=False),
            json.dumps(ai_result.get('user_tags', []), ensure_ascii=False),
            ai_result.get('summary', ''),
            ai_result.get('main_emotion', ''),
            json.dumps(ai_result.get('secondary_emotions', []), ensure_ascii=False),
            ai_result.get('sentiment', 'neutral'),
            ai_result.get('emotion_score'),
            ai_result.get('stress_score'),
            ai_result.get('energy_score'),
            1 if ai_result.get('sleep_related') else 0,
            json.dumps(ai_result.get('stress_sources', []), ensure_ascii=False),
            json.dumps(ai_result.get('keywords', []), ensure_ascii=False),
            json.dumps(ai_result.get('auto_tags', []), ensure_ascii=False),
            ai_result.get('risk_level', 'normal'),
            json.dumps(ai_result.get('suggestions', []), ensure_ascii=False),
            json.dumps(ai_result, ensure_ascii=False),
            now, record_id
        ))


def get_record(record_id, user_id):
    with get_db() as conn:
        row = conn.execute(
            'SELECT * FROM mood_records WHERE id=? AND user_id=?', (record_id, user_id)
        ).fetchone()
        return dict_from_row(row)


def get_records(user_id, filters=None):
    with get_db() as conn:
        query = 'SELECT * FROM mood_records WHERE user_id=?'
        params = [user_id]

        if filters:
            if filters.get('start_date'):
                query += ' AND record_date >= ?'
                params.append(filters['start_date'])
            if filters.get('end_date'):
                query += ' AND record_date <= ?'
                params.append(filters['end_date'])
            if filters.get('mood_type'):
                query += ' AND mood_types LIKE ?'
                params.append(f'%{filters["mood_type"]}%')
            if filters.get('tag'):
                query += ' AND (user_tags LIKE ? OR ai_auto_tags LIKE ?)'
                params.append(f'%{filters["tag"]}%')
                params.append(f'%{filters["tag"]}%')
            if filters.get('risk_level'):
                query += ' AND ai_risk_level=?'
                params.append(filters['risk_level'])
            if filters.get('min_score'):
                query += ' AND (ai_emotion_score >= ? OR user_mood_score >= ?)'
                params.append(int(filters['min_score']))
                params.append(int(filters['min_score']))
            if filters.get('max_score'):
                query += ' AND (ai_emotion_score <= ? OR user_mood_score <= ?)'
                params.append(int(filters['max_score']))
                params.append(int(filters['max_score']))

        query += ' ORDER BY record_date DESC, created_at DESC'

        if filters and filters.get('limit'):
            query += ' LIMIT ?'
            params.append(int(filters['limit']))

        rows = conn.execute(query, params).fetchall()
        return [dict_from_row(r) for r in rows]


def delete_record(record_id, user_id):
    with get_db() as conn:
        cursor = conn.execute(
            'DELETE FROM mood_records WHERE id=? AND user_id=?', (record_id, user_id)
        )
        return cursor.rowcount > 0


def get_streak(user_id):
    with get_db() as conn:
        rows = conn.execute(
            'SELECT DISTINCT record_date FROM mood_records WHERE user_id=? ORDER BY record_date DESC',
            (user_id,)
        ).fetchall()

    if not rows:
        return 0

    from datetime import date, timedelta
    dates = [datetime.strptime(r['record_date'], '%Y-%m-%d').date() for r in rows]
    today = date.today()
    streak = 0
    check = today

    for d in dates:
        if d == check:
            streak += 1
            check -= timedelta(days=1)
        elif d < check:
            break

    return streak
