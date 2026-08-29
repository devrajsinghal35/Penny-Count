from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from models import db
from models.user import User
from services.auth_service import generate_token, verify_token

auth_bp = Blueprint('auth', __name__)

# ── JWT Authentication Decorator ───────────────────────────────────────────
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(" ")[1]
        
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
            
        user_id = verify_token(token)
        if not user_id:
            return jsonify({'message': 'Token is invalid or expired'}), 401
            
        current_user = User.query.get(user_id)
        if not current_user:
            return jsonify({'message': 'User not found'}), 401
            
        # Pass the authenticated user to the route
        return f(current_user, *args, **kwargs)
    return decorated

# ── Register Endpoint ──────────────────────────────────────────────────────
@auth_bp.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not name or not email or not password:
        return jsonify({'message': 'All fields (name, email, password) are required.'}), 400

    if len(password) < 6:
        return jsonify({'message': 'Password must be at least 6 characters.'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'message': 'An account with that email already exists.'}), 400

    hashed_password = generate_password_hash(password)
    user = User(name=name, email=email, password=hashed_password)
    db.session.add(user)
    db.session.commit()

    token = generate_token(user.id)
    return jsonify({
        'token': token,
        'user': {
            'id': user.id,
            'name': user.name,
            'email': user.email
        }
    }), 201

# ── Login Endpoint ─────────────────────────────────────────────────────────
@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'message': 'Email and password are required.'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password, password):
        return jsonify({'message': 'Invalid email or password.'}), 400

    token = generate_token(user.id)
    return jsonify({
        'token': token,
        'user': {
            'id': user.id,
            'name': user.name,
            'email': user.email
        }
    }), 200

# ── Current User Profile ────────────────────────────────────────────────────
@auth_bp.route('/api/auth/me', methods=['GET'])
@token_required
def me(current_user):
    return jsonify({
        'id': current_user.id,
        'name': current_user.name,
        'email': current_user.email
    }), 200
