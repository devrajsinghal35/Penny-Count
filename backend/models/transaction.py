from datetime import datetime
from models import db


class Transaction(db.Model):
    __tablename__ = 'transaction'

    id          = db.Column(db.Integer, primary_key=True)
    user_id     = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title       = db.Column(db.String(200), nullable=False)
    amount      = db.Column(db.Float, nullable=False)
    type        = db.Column(db.String(10), nullable=False)    # 'income' | 'expense'
    category    = db.Column(db.String(80), nullable=False)
    description = db.Column(db.String(300), default='')
    date        = db.Column(db.Date, nullable=False)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        """Serialize to JSON-safe dict for API responses."""
        return {
            'id':          self.id,
            'title':       self.title,
            'amount':      self.amount,
            'type':        self.type,
            'category':    self.category,
            'description': self.description,
            'date':        self.date.isoformat(),
            'created_at':  self.created_at.isoformat(),
        }

    def __repr__(self):
        return f'<Transaction {self.type} ₹{self.amount} [{self.category}]>'
