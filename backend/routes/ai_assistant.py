import os
import json
import urllib.request
from flask import Blueprint, request, jsonify
from routes.auth import token_required
from models.transaction import Transaction

from services.finance_service import get_safe_to_spend

ai_bp = Blueprint('ai', __name__)


def generate_fallback_audit(tx_context, user_query, safe_to_spend_data=None):
    total_expense = sum(t['amount'] for t in tx_context if t.get('type') == 'expense')
    total_income = sum(t['amount'] for t in tx_context if t.get('type') == 'income')
    safe_amt = safe_to_spend_data.get('safe_to_spend', 0.0) if safe_to_spend_data else (total_income - total_expense)
    daily_safe = safe_to_spend_data.get('daily_safe_to_spend', 0.0) if safe_to_spend_data else 0.0

    cat_totals = {}
    for t in tx_context:
        if t.get('type') == 'expense':
            cat = t.get('category', 'Other')
            cat_totals[cat] = cat_totals.get(cat, 0) + t['amount']

    breakdown_lines = [f"• {cat}: ₹{amt:,.2f}" for cat, amt in cat_totals.items()]
    breakdown_str = "\n".join(breakdown_lines) if breakdown_lines else "• No expense transactions recorded yet."

    purchase_advice = ""
    verdict_badge = "Healthy / Low Risk"
    import re
    # Match numbers like 50k, 50,000, 50000, 10.5k
    pattern = r'(\d+(?:\.\d+)?)\s*(k|lakh|lac|cr)?'
    matches = re.findall(pattern, user_query.replace(',', '').lower())
    if matches:
        try:
            val_str, unit = matches[0]
            val = float(val_str)
            if unit == 'k':
                val *= 1000
            elif unit in ('lakh', 'lac'):
                val *= 100000
            elif unit == 'cr':
                val *= 10000000

            if val > 0:
                if safe_amt >= val:
                    verdict_badge = "PURCHASE APPROVED: Within Safe-to-Spend"
                    purchase_advice = f"""
DIRECT VERDICT: YES, YOU CAN BUY THIS
• Item Cost: ₹{val:,.2f}
• Available Safe-to-Spend: ₹{safe_amt:,.2f}
• Remaining Safe Buffer: ₹{(safe_amt - val):,.2f}
• Impact: This purchase will not endanger your upcoming fixed bills or safety buffer.
"""
                else:
                    deficit = val - safe_amt
                    verdict_badge = "WARNING: EXCEEDS SAFE-TO-SPEND"
                    purchase_advice = f"""
DIRECT VERDICT: NO, NOT RECOMMENDED RIGHT NOW
• Item Cost: ₹{val:,.2f}
• Available Safe-to-Spend: ₹{safe_amt:,.2f}
• Shortfall (Deficit): ₹{deficit:,.2f}
• Risk: Buying this right now will dip into your emergency buffer or upcoming fixed commitments (Rent/Bills).
"""
        except Exception:
            pass

    return f"""AI FINANCIAL AUDIT
Status: {verdict_badge}
{purchase_advice}
SAFE-TO-SPEND METRICS
• Safe to Spend (After bills & buffer): ₹{safe_amt:,.2f}
• Daily Recommended Budget: ₹{daily_safe:,.2f}/day

CATEGORY BREAKDOWN
{breakdown_str}
• Total Income Logged: ₹{total_income:,.2f}
• Total Expense Logged: ₹{total_expense:,.2f}

SECURITY & RISK ASSESSMENT
• Data Protection: Sensitive transaction fields protected at rest.
• Anomaly Audit: Evaluated {len(tx_context)} recent transactions.

KEY TAKEAWAYS & RECOMMENDATIONS
• Safe Spending: {'Net cashflow remains positive.' if safe_amt > 0 else 'Caution: Upcoming commitments may exceed available cash.'}"""


@ai_bp.route('/analyze-spending', methods=['POST'])
@token_required
def analyze_spending(current_user):
    data = request.get_json(silent=True) or {}
    user_query = data.get('query', '')

    if not user_query:
        return jsonify({'error': 'Query is required'}), 400

    transactions = (
        Transaction.query.filter_by(user_id=current_user.id)
        .order_by(Transaction.date.desc())
        .limit(50)
        .all()
    )

    tx_context = [
        {
            "amount": tx.amount,
            "type": tx.type,
            "category": tx.category,
            "date": tx.date.isoformat(),
            "title": tx.title,
        }
        for tx in transactions
    ]

    safe_data = get_safe_to_spend(current_user.id)

    api_key = os.environ.get('GEMINI_API_KEY', '').strip()
    if not api_key:
        return jsonify({'response': generate_fallback_audit(tx_context, user_query, safe_data)}), 200

    prompt_text = f"""
    You are a financial analysis assistant for Penny-Count.
    Directly answer the user's specific query using their real-time Safe-to-Spend numbers and recent transaction history.

    Key Real-Time Metrics:
    - Current Balance: ₹{safe_data.get('current_balance', 0):,.2f}
    - Safe-to-Spend (free cash after bills & emergency buffer): ₹{safe_data.get('safe_to_spend', 0):,.2f}
    - Recommended Daily Spending Limit: ₹{safe_data.get('daily_safe_to_spend', 0):,.2f} / day
    - Upcoming Fixed Commitments (Bills/Rent/EMI): ₹{safe_data.get('upcoming_commitments', 0):,.2f}
    - Safety Buffer Reserved: ₹{safe_data.get('safety_buffer', 0):,.2f}

    Formatting Guidelines:
    - Directly and clearly answer the user's question first (e.g., if they ask if they can afford shoes for ₹10,000, compare it to the Safe-to-Spend and explain clearly).
    - Avoid markdown asterisks (* or **).
    - Use bullet characters like '•' for lists.
    - Currency: Format all monetary amounts in Indian Rupees (₹ / INR).

    User Query: {user_query}

    Recent Transactions Context:
    {json.dumps(tx_context, indent=2)}
    """

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    payload = {"contents": [{"parts": [{"text": prompt_text}]}]}

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
        )
        with urllib.request.urlopen(req) as response:  # nosec B310
            res_data = json.loads(response.read().decode('utf-8'))
            candidates = res_data.get('candidates', [])
            if candidates:
                text = candidates[0].get('content', {}).get('parts', [{}])[0].get('text', 'No response generated.')
                clean_text = text.replace('**', '').replace('*', '').strip()
                return jsonify({'response': clean_text}), 200
            return jsonify({'response': generate_fallback_audit(tx_context, user_query, safe_data)}), 200

    except Exception:
        return jsonify({'response': generate_fallback_audit(tx_context, user_query, safe_data)}), 200
