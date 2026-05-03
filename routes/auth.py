from flask import Blueprint, request, jsonify, session
from services.auth_service import register_user, login_user, get_user_by_id

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    user, error = register_user(data.get('username', ''), data.get('password', ''))
    if error:
        return jsonify({'success': False, 'message': error}), 400
    session['user_id'] = user['id']
    return jsonify({'success': True, 'user': user})


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user, error = login_user(data.get('username', ''), data.get('password', ''))
    if error:
        return jsonify({'success': False, 'message': error}), 401
    session['user_id'] = user['id']
    return jsonify({'success': True, 'user': user})


@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return jsonify({'success': True})


@auth_bp.route('/me', methods=['GET'])
def me():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': '未登录'}), 401
    user = get_user_by_id(user_id)
    if not user:
        session.pop('user_id', None)
        return jsonify({'success': False, 'message': '用户不存在'}), 401
    return jsonify({'success': True, 'user': user})
