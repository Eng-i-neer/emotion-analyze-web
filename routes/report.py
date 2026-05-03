from flask import Blueprint, request, jsonify, session
from services.report_service import generate_report, get_reports, get_report

report_bp = Blueprint('report', __name__)


@report_bp.route('/generate', methods=['POST'])
def generate():
    uid = session.get('user_id')
    if not uid:
        return jsonify({'success': False, 'message': '未登录'}), 401
    data = request.get_json()
    report_type = data.get('report_type', 'weekly')
    result, error = generate_report(uid, report_type)
    if error:
        return jsonify({'success': False, 'message': error}), 400
    return jsonify({'success': True, 'report': result})


@report_bp.route('', methods=['GET'])
def list_reports():
    uid = session.get('user_id')
    if not uid:
        return jsonify({'success': False, 'message': '未登录'}), 401
    reports = get_reports(uid)
    return jsonify({'success': True, 'reports': reports})


@report_bp.route('/<int:report_id>', methods=['GET'])
def detail(report_id):
    uid = session.get('user_id')
    if not uid:
        return jsonify({'success': False, 'message': '未登录'}), 401
    report = get_report(report_id, uid)
    if not report:
        return jsonify({'success': False, 'message': '报告不存在'}), 404
    return jsonify({'success': True, 'report': report})
