from datetime import datetime
from models import db
from utils.encryption import encrypt_field, decrypt_field

class Transaction(db.Model):
    __tablename__ = 'transaction'

    id          = db.Column(db.Integer, primary_key=True)
    user_id     = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # Store encrypted string, so we need a larger column size
    _title       = db.Column('title', db.String(500), nullable=False)
    amount      = db.Column(db.Float, nullable=False)
    type        = db.Column(db.String(10), nullable=False)    # 'income' | 'expense'
    category    = db.Column(db.String(80), nullable=False)
    _description = db.Column('description', db.String(1000), default='')
    date        = db.Column(db.Date, nullable=False)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    @property
    def title(self):
        return decrypt_field(self._title)
        
    @title.setter
    def title(self, value):
        self._title = encrypt_field(value)
        
    @property
    def description(self):
        return decrypt_field(self._description)
        
    @description.setter
    def description(self, value):
        self._description = encrypt_field(value)

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
