import sqlite3
import json
from contextlib import contextmanager
import config


@contextmanager
def get_db():
    conn = sqlite3.connect(config.DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def dict_from_row(row):
    if row is None:
        return None
    d = dict(row)
    json_fields = [
        'mood_types', 'user_tags', 'ai_secondary_emotions',
        'ai_stress_sources', 'ai_keywords', 'ai_auto_tags', 'ai_suggestions'
    ]
    for f in json_fields:
        if f in d and d[f]:
            try:
                d[f] = json.loads(d[f])
            except (json.JSONDecodeError, TypeError):
                pass
    if 'ai_analysis_json' in d and d['ai_analysis_json']:
        try:
            d['ai_analysis_json'] = json.loads(d['ai_analysis_json'])
        except (json.JSONDecodeError, TypeError):
            pass
    if 'report_json' in d and d['report_json']:
        try:
            d['report_json'] = json.loads(d['report_json'])
        except (json.JSONDecodeError, TypeError):
            pass
    return d


def init_tables():
    with get_db() as conn:
        conn.executescript('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS mood_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id),
                record_date DATE NOT NULL,
                user_mood_score INTEGER,
                user_stress_score INTEGER,
                sleep_hours REAL,
                sleep_quality INTEGER,
                mood_types TEXT,
                user_tags TEXT,
                diary_text TEXT,
                ai_summary TEXT,
                ai_main_emotion TEXT,
                ai_secondary_emotions TEXT,
                ai_sentiment TEXT,
                ai_emotion_score INTEGER,
                ai_stress_score INTEGER,
                ai_energy_score INTEGER,
                ai_sleep_related INTEGER DEFAULT 0,
                ai_stress_sources TEXT,
                ai_keywords TEXT,
                ai_auto_tags TEXT,
                ai_risk_level TEXT DEFAULT 'normal',
                ai_suggestions TEXT,
                ai_analysis_json TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id),
                report_type TEXT NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                avg_emotion_score REAL,
                avg_stress_score REAL,
                report_json TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_mood_user_date ON mood_records(user_id, record_date);
            CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id, report_type);
        ''')
