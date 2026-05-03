from werkzeug.security import generate_password_hash, check_password_hash
from models.database import get_db, dict_from_row


def register_user(username, password):
    if not username or not password:
        return None, '用户名和密码不能为空'
    if len(username) < 2 or len(username) > 20:
        return None, '用户名长度应在2-20个字符之间'
    if len(password) < 4:
        return None, '密码长度不能少于4个字符'

    with get_db() as conn:
        existing = conn.execute('SELECT id FROM users WHERE username=?', (username,)).fetchone()
        if existing:
            return None, '用户名已存在'
        pw_hash = generate_password_hash(password)
        cursor = conn.execute(
            'INSERT INTO users (username, password_hash) VALUES (?, ?)',
            (username, pw_hash)
        )
        user = conn.execute('SELECT id, username, created_at FROM users WHERE id=?', (cursor.lastrowid,)).fetchone()
        return dict_from_row(user), None


def login_user(username, password):
    if not username or not password:
        return None, '请输入用户名和密码'

    with get_db() as conn:
        user = conn.execute('SELECT * FROM users WHERE username=?', (username,)).fetchone()
        if not user:
            return None, '用户名或密码错误'
        if not check_password_hash(user['password_hash'], password):
            return None, '用户名或密码错误'
        return {'id': user['id'], 'username': user['username'], 'created_at': user['created_at']}, None


def get_user_by_id(user_id):
    with get_db() as conn:
        user = conn.execute('SELECT id, username, created_at FROM users WHERE id=?', (user_id,)).fetchone()
        return dict_from_row(user)
