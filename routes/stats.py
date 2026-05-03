from flask import Blueprint, request, jsonify, session
from services.stats_service import (
    get_overview, get_trends, get_calendar_data,
    get_tag_stats, get_keyword_stats, get_emotion_type_stats,
    get_risk_distribution, check_reminders
)
from services.mood_service import get_streak

stats_bp = Blueprint('stats', __name__)


@stats_bp.route('/overview', methods=['GET'])
def overview():
    uid = session.get('user_id')
    if not uid:
        return jsonify({'success': False, 'message': '未登录'}), 401
    data = get_overview(uid)
    data['streak'] = get_streak(uid)
    data['reminders'] = check_reminders(uid)
    return jsonify({'success': True, **data})


@stats_bp.route('/trends', methods=['GET'])
def trends():
    uid = session.get('user_id')
    if not uid:
        return jsonify({'success': False, 'message': '未登录'}), 401
    days = int(request.args.get('days', 30))
    data = get_trends(uid, days)
    return jsonify({'success': True, 'trends': data})


@stats_bp.route('/calendar', methods=['GET'])
def calendar():
    uid = session.get('user_id')
    if not uid:
        return jsonify({'success': False, 'message': '未登录'}), 401
    from datetime import date
    year = int(request.args.get('year', date.today().year))
    month = int(request.args.get('month', date.today().month))
    data = get_calendar_data(uid, year, month)
    return jsonify({'success': True, 'calendar': data})


@stats_bp.route('/tags', methods=['GET'])
def tags():
    uid = session.get('user_id')
    if not uid:
        return jsonify({'success': False, 'message': '未登录'}), 401
    days = int(request.args.get('days', 30))
    data = get_tag_stats(uid, days)
    return jsonify({'success': True, 'tags': data})


@stats_bp.route('/keywords', methods=['GET'])
def keywords():
    uid = session.get('user_id')
    if not uid:
        return jsonify({'success': False, 'message': '未登录'}), 401
    days = int(request.args.get('days', 30))
    data = get_keyword_stats(uid, days)
    return jsonify({'success': True, 'keywords': data})


@stats_bp.route('/emotions', methods=['GET'])
def emotions():
    uid = session.get('user_id')
    if not uid:
        return jsonify({'success': False, 'message': '未登录'}), 401
    days = int(request.args.get('days', 30))
    data = get_emotion_type_stats(uid, days)
    return jsonify({'success': True, 'emotions': data})


@stats_bp.route('/risk', methods=['GET'])
def risk():
    uid = session.get('user_id')
    if not uid:
        return jsonify({'success': False, 'message': '未登录'}), 401
    days = int(request.args.get('days', 30))
    data = get_risk_distribution(uid, days)
    return jsonify({'success': True, 'risk': data})
