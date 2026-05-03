from flask import Blueprint, request, jsonify, session
from services.mood_service import (
    create_record, update_record, get_record, get_records, delete_record
)

mood_bp = Blueprint('mood', __name__)


def require_login():
    uid = session.get('user_id')
    if not uid:
        return None
    return uid


@mood_bp.route('', methods=['POST'])
def create():
    uid = require_login()
    if not uid:
        return jsonify({'success': False, 'message': '未登录'}), 401
    data = request.get_json()
    record_id = create_record(uid, data)
    record = get_record(record_id, uid)
    return jsonify({'success': True, 'record': record})


@mood_bp.route('', methods=['GET'])
def list_records():
    uid = require_login()
    if not uid:
        return jsonify({'success': False, 'message': '未登录'}), 401
    filters = {
        'start_date': request.args.get('start_date'),
        'end_date': request.args.get('end_date'),
        'mood_type': request.args.get('mood_type'),
        'tag': request.args.get('tag'),
        'risk_level': request.args.get('risk_level'),
        'min_score': request.args.get('min_score'),
        'max_score': request.args.get('max_score'),
        'limit': request.args.get('limit'),
    }
    filters = {k: v for k, v in filters.items() if v}
    records = get_records(uid, filters if filters else None)
    return jsonify({'success': True, 'records': records})


@mood_bp.route('/<int:record_id>', methods=['GET'])
def detail(record_id):
    uid = require_login()
    if not uid:
        return jsonify({'success': False, 'message': '未登录'}), 401
    record = get_record(record_id, uid)
    if not record:
        return jsonify({'success': False, 'message': '记录不存在'}), 404
    return jsonify({'success': True, 'record': record})


@mood_bp.route('/<int:record_id>', methods=['PUT'])
def update(record_id):
    uid = require_login()
    if not uid:
        return jsonify({'success': False, 'message': '未登录'}), 401
    data = request.get_json()
    ok = update_record(record_id, uid, data)
    if not ok:
        return jsonify({'success': False, 'message': '记录不存在'}), 404
    record = get_record(record_id, uid)
    return jsonify({'success': True, 'record': record})


@mood_bp.route('/<int:record_id>', methods=['DELETE'])
def delete(record_id):
    uid = require_login()
    if not uid:
        return jsonify({'success': False, 'message': '未登录'}), 401
    ok = delete_record(record_id, uid)
    if not ok:
        return jsonify({'success': False, 'message': '记录不存在'}), 404
    return jsonify({'success': True})
