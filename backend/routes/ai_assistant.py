import os
import json
import urllib.request
from flask import Blueprint, request, jsonify
from routes.auth import token_required
from models.transaction import Transaction

ai_bp = Blueprint('ai', __name__)

# Fetch Gemini API key from environment variable
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')

@ai_bp.route('/analyze-spending', methods=['POST'])
@token_required
def analyze_spending(current_user):
    """
    AI-Assisted Financial & Security Analysis using Gemini 1.5 Flash API.
    """
    data = request.get_json(silent=True) or {}
    user_query = data.get('query', '')
    
    if not user_query:
        return jsonify({'error': 'Query is required'}), 400

    # Fetch user transactions for context
    transactions = Transaction.query.filter_by(user_id=current_user.id).order_by(Transaction.date.desc()).limit(50).all()
    
    # Anonymize/Format data for LLM context to ensure privacy guardrails
    tx_context = []
    for tx in transactions:
        tx_context.append({
            "amount": tx.amount,
            "type": tx.type,
            "category": tx.category,
            "date": tx.date.isoformat(),
            "title": tx.title
        })

    prompt_text = f"""
    You are an intelligent financial assistant and cybersecurity agent for the Penny-Count platform.
    Your job is to analyze the user's spending data and answer their query in a clean, clean text format.

    Strict Formatting Rules:
    - Absolutely DO NOT use asterisks or star symbols (* or **) anywhere in your text.
    - Use bullet characters like '•' or '▶' for lists.
    - Start section titles with emojis, e.g.:
      🤖 AI FINANCIAL AUDIT
      Status: 🟢 Healthy / Low Risk
      
      📊 CATEGORY BREAKDOWN
      🛡️ SECURITY & RISK ASSESSMENT
      💡 KEY TAKEAWAYS & RECOMMENDATIONS
      
    Currency & Unit Rules:
    - ALL transaction amounts are in Indian Rupees (₹ / INR).
    - ALWAYS format financial values using ₹ (Indian Rupees), e.g. ₹500, ₹1,200. NEVER use US Dollars ($).
    
    Privacy & Security Guardrails:
    - Never expose account numbers, personal names, or exact addresses.
    - If asked to detect suspicious transactions, flag unusually large expenses, duplicate charges, or unexpected category spikes.
    
    User Query: {user_query}
    
    User's recent transactions context (JSON):
    {json.dumps(tx_context, indent=2)}
    """

    api_key = os.environ.get('GEMINI_API_KEY', GEMINI_API_KEY)
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key={api_key}"
    
    payload = {
        "contents": [{
            "parts": [{"text": prompt_text}]
        }]
    }

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req) as response:  # nosec B310
            res_data = json.loads(response.read().decode('utf-8'))
            candidates = res_data.get('candidates', [])
            if candidates:
                text = candidates[0].get('content', {}).get('parts', [{}])[0].get('text', 'No response generated.')
                # Clean out any stray asterisks
                clean_text = text.replace('**', '').replace('*', '').strip()
                return jsonify({'response': clean_text}), 200
            return jsonify({'response': 'No candidates returned from Gemini.'}), 200

    except Exception as e:
        return jsonify({'error': f'Gemini AI analysis failed: {str(e)}'}), 500

