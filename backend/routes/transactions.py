from flask import Blueprint, request, jsonify
from routes.auth import token_required
from services.finance_service import (
    get_transactions,
    add_transaction,
    delete_transaction,
    get_summary,
    update_transaction,
    get_safe_to_spend,
    seed_demo_data,
    clear_user_data,
)
from models import db

transactions_bp = Blueprint('transactions', __name__)


@transactions_bp.route('/api/transactions/seed-demo', methods=['POST'])
@token_required
def api_seed_demo(current_user):
    success = seed_demo_data(current_user.id)
    return jsonify({"success": success, "message": "Demo data successfully loaded."})


@transactions_bp.route('/api/financial/safe-to-spend', methods=['GET'])
@token_required
def api_safe_to_spend(current_user):
    result = get_safe_to_spend(current_user.id)
    return jsonify(result)


@transactions_bp.route('/api/transactions/summary', methods=['GET'])
@token_required
def api_summary(current_user):
    summary = get_summary(current_user.id)
    summary['categoryBreakdown'] = summary.pop('category_breakdown')
    return jsonify(summary)


@transactions_bp.route('/api/transactions', methods=['GET'])
@token_required
def api_list(current_user):
    type_filter = request.args.get('type', 'all')
    month_filter = request.args.get('month', '')
    txs = get_transactions(current_user.id, type_filter, month_filter)
    return jsonify(txs)


@transactions_bp.route('/api/transactions', methods=['POST'])
@token_required
def api_create(current_user):
    data = request.get_json(silent=True) or {}
    try:
        tx = add_transaction(current_user.id, data)
        return jsonify(tx.to_dict()), 201
    except ValueError as e:
        return jsonify({'message': str(e)}), 400


@transactions_bp.route('/api/transactions/<int:tx_id>', methods=['PUT'])
@token_required
def api_update(current_user, tx_id):
    data = request.get_json(silent=True) or {}
    try:
        tx = update_transaction(current_user.id, tx_id, data)
        if not tx:
            return jsonify({'message': 'Transaction not found or unauthorized'}), 404
        return jsonify(tx.to_dict()), 200
    except ValueError as e:
        return jsonify({'message': str(e)}), 400


@transactions_bp.route('/api/transactions/<int:tx_id>', methods=['DELETE'])
@token_required
def api_delete(current_user, tx_id):
    deleted = delete_transaction(current_user.id, tx_id)
    if deleted:
        return jsonify({'message': 'Transaction deleted successfully'}), 200
    return jsonify({'message': 'Transaction not found or unauthorized'}), 404


@transactions_bp.route("/api/transactions/clear-all", methods=["DELETE", "POST", "OPTIONS"])
@transactions_bp.route("/api/transactions/clear", methods=["DELETE", "POST", "OPTIONS"])
@token_required
def api_clear_all(current_user):
    try:
        clear_user_data(current_user.id)
        return jsonify({"success": True, "message": "All transaction data cleared successfully."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
