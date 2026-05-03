import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

SECRET_KEY = os.environ.get('SECRET_KEY', 'mood-tracker-secret-key-change-in-production')

DATABASE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mood_tracker.db')

DEEPSEEK_API_KEY = os.environ.get('DEEPSEEK_API_KEY', '')
DEEPSEEK_BASE_URL = 'https://api.deepseek.com'
DEEPSEEK_MODEL = 'deepseek-v4-flash'
