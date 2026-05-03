from flask import Flask, session, send_from_directory
from flask_cors import CORS
import config
from models.database import init_tables
from routes.auth import auth_bp
from routes.mood import mood_bp
from routes.ai import ai_bp
from routes.stats import stats_bp
from routes.report import report_bp

app = Flask(__name__, static_folder='static', template_folder='templates')
app.secret_key = config.SECRET_KEY
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
CORS(app, supports_credentials=True)

app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(mood_bp, url_prefix='/api/mood-records')
app.register_blueprint(ai_bp, url_prefix='/api/ai')
app.register_blueprint(stats_bp, url_prefix='/api/stats')
app.register_blueprint(report_bp, url_prefix='/api/reports')


@app.route('/')
def index():
    return send_from_directory('templates', 'index.html')


init_tables()

if __name__ == '__main__':
    app.run(debug=True, port=5001)
