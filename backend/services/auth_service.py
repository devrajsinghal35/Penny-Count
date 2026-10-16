import jwt
from datetime import datetime, timedelta, timezone
from flask import current_app


def generate_token(user_id: int) -> str:
    payload = {
        'id': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(days=7),
        'iat': datetime.now(timezone.utc),
    }
    return jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')


def verify_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        return payload.get('id')
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None
