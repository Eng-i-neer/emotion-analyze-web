from flask import Blueprint, request, jsonify, session
from services.ai_service import analyze_diary, generate_suggestions
from services.mood_service import get_record, get_records, update_ai_fields
import json

ai_bp = Blueprint('ai', __name__)


@ai_bp.route('/analyze-diary', methods=['POST'])
def analyze():
    uid = session.get('user_id')
    if not uid:
        return jsonify({'success': False, 'message': '未登录'}), 401

    data = request.get_json()
    record_id = data.get('record_id')
    if not record_id:
        return jsonify({'success': False, 'message': '缺少记录ID'}), 400

    record = get_record(record_id, uid)
    if not record:
        return jsonify({'success': False, 'message': '记录不存在'}), 404

    ai_result = analyze_diary(diary_text=record.get('diary_text', ''))

    update_ai_fields(record_id, ai_result)
    updated = get_record(record_id, uid)
    return jsonify({'success': True, 'record': updated, 'analysis': ai_result})


@ai_bp.route('/suggestions', methods=['GET'])
def suggestions():
    uid = session.get('user_id')
    if not uid:
        return jsonify({'success': False, 'message': '未登录'}), 401

    records = get_records(uid, {'limit': 7})
    if not records:
        return jsonify({'success': False, 'message': '暂无记录'}), 400

    summary_parts = []
    for r in records:
        parts = [f"日期:{r.get('record_date','')}"]
        if r.get('ai_main_emotion'):
            parts.append(f"情绪:{r['ai_main_emotion']}")
        if r.get('ai_emotion_score'):
            parts.append(f"情绪分:{r['ai_emotion_score']}")
        if r.get('ai_stress_score'):
            parts.append(f"压力分:{r['ai_stress_score']}")
        if r.get('ai_summary'):
            parts.append(f"摘要:{r['ai_summary']}")
        summary_parts.append(' | '.join(parts))

    summary = '\n'.join(summary_parts)
    result = generate_suggestions(summary)
    if result:
        return jsonify({'success': True, 'suggestions': result})
    return jsonify({'success': False, 'message': 'AI 暂时不可用'}), 500
