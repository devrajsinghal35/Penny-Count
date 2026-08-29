from datetime import datetime
from models import db


class User(db.Model):
    __tablename__ = 'user'

    id         = db.Column(db.Integer, primary_key=True)
    name       = db.Column(db.String(120), nullable=False)
    email      = db.Column(db.String(200), unique=True, nullable=False)
    password   = db.Column(db.String(256), nullable=False)   # Werkzeug hash
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # One-to-many: a user has many transactions
    transactions = db.relationship('Transaction', backref='user', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<User {self.email}>'
