"""
finance_service.py — Business Logic Layer

All database calculations go here, not in the routes.
Routes call these functions; they don't touch SQLAlchemy directly.
"""

from datetime import date, datetime
from models.transaction import Transaction
from models import db


# ── Summary (Dashboard KPIs + chart) ──────────────────────────────────────

def get_summary(user_id: int) -> dict:
    """
    Return total income, total expense, balance, and category breakdown
    for all-time transactions of a user.

    Example return value:
        {
            'income': 35000.0,
            'expense': 8500.0,
            'balance': 26500.0,
            'category_breakdown': [
                {'category': 'Food',   'amount': 2000.0},
                {'category': 'Travel', 'amount': 1500.0},
            ]
        }
    """
    transactions = Transaction.query.filter_by(user_id=user_id).all()

    total_income  = sum(t.amount for t in transactions if t.type == 'income')
    total_expense = sum(t.amount for t in transactions if t.type == 'expense')
    balance       = total_income - total_expense

    # Category breakdown — only expenses
    category_totals: dict[str, float] = {}
    for t in transactions:
        if t.type == 'expense':
            category_totals[t.category] = category_totals.get(t.category, 0) + t.amount

    category_breakdown = [
        {'category': cat, 'amount': round(amt, 2)}
        for cat, amt in sorted(category_totals.items(), key=lambda x: x[1], reverse=True)
    ]

    return {
        'income':             round(total_income, 2),
        'expense':            round(total_expense, 2),
        'balance':            round(balance, 2),
        'category_breakdown': category_breakdown,
    }


# ── Get transactions (with optional filters) ───────────────────────────────

def get_transactions(user_id: int, type_filter: str = 'all', month_filter: str = '') -> list[dict]:
    """
    Return a user's transactions as a list of dicts.

    Args:
        user_id:      The logged-in user's ID.
        type_filter:  'all' | 'income' | 'expense'
        month_filter: 'YYYY-MM' string, or empty string for all months.
    """
    query = Transaction.query.filter_by(user_id=user_id)

    if type_filter in ('income', 'expense'):
        query = query.filter(Transaction.type == type_filter)

    if month_filter:
        try:
            year, month = map(int, month_filter.split('-'))
            query = query.filter(
                db.extract('year',  Transaction.date) == year,
                db.extract('month', Transaction.date) == month,
            )
        except (ValueError, AttributeError):
            pass  # invalid format — ignore filter

    # Newest first
    transactions = query.order_by(Transaction.date.desc(), Transaction.created_at.desc()).all()
    return [t.to_dict() for t in transactions]


# ── Add transaction ────────────────────────────────────────────────────────

def add_transaction(user_id: int, data: dict) -> Transaction:
    """
    Create and persist a new transaction.

    Args:
        user_id: The logged-in user's ID.
        data:    Dict with keys: title, amount, type, category, description, date.

    Returns:
        The newly created Transaction instance.

    Raises:
        ValueError: If required fields are missing or invalid.
    """
    # Validate required fields
    required = ('title', 'amount', 'type', 'category', 'date')
    for field in required:
        if not data.get(field) and data.get(field) != 0:
            raise ValueError(f"'{field}' is required.")

    try:
        amount = float(data['amount'])
        if amount <= 0:
            raise ValueError('Amount must be greater than 0.')
    except (TypeError, ValueError):
        raise ValueError('Amount must be a positive number.')

    if data['type'] not in ('income', 'expense'):
        raise ValueError("Type must be 'income' or 'expense'.")

    try:
        tx_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
    except (ValueError, TypeError):
        raise ValueError('Date must be in YYYY-MM-DD format.')

    tx = Transaction(
        user_id     = user_id,
        title       = str(data['title']).strip(),
        amount      = amount,
        type        = data['type'],
        category    = str(data['category']).strip(),
        description = str(data.get('description', '') or data.get('note', '')).strip(),
        date        = tx_date,
    )

    db.session.add(tx)
    db.session.commit()
    return tx


def get_safe_to_spend(user_id: int) -> dict:
    """
    Calculate the safe-to-spend amount for the user based on historical data
    and current balances.
    """
    import calendar
    from datetime import date, timedelta
    
    today = date.today()
    _, last_day = calendar.monthrange(today.year, today.month)
    remaining_days = max(1, last_day - today.day + 1)
    
    transactions = Transaction.query.filter_by(user_id=user_id).all()
    
    total_income = sum(t.amount for t in transactions if t.type == 'income')
    total_expense = sum(t.amount for t in transactions if t.type == 'expense')
    current_balance = total_income - total_expense
    
    if current_balance <= 0:
        return {
            "current_balance": round(current_balance, 2),
            "upcoming_commitments": 0.0,
            "upcoming_commitments_details": [],
            "expected_essential_spending": 0.0,
            "safety_buffer": 0.0,
            "safe_to_spend": round(current_balance, 2),
            "daily_safe_to_spend": round(current_balance / remaining_days, 2),
            "status": "At risk: Zero or negative balance",
            "calculation_period": f"{today.strftime('%B %Y')} ({remaining_days} days left)"
        }
        
    # Analyze past transactions (before this month)
    this_month_start = today.replace(day=1)
    past_txs = [t for t in transactions if t.date < this_month_start and t.type == 'expense']
    this_month_txs = [t for t in transactions if t.date >= this_month_start and t.type == 'expense']
    
    # Calculate upcoming commitments based on specific recurring titles
    commitments_categories = {'Housing', 'Utilities', 'Investment'}
    from collections import defaultdict
    past_commitments_by_title = defaultdict(list)
    for t in past_txs:
        if t.category in commitments_categories:
            past_commitments_by_title[t.title].append(t)
            
    upcoming_commitments = 0.0
    upcoming_details = []
    
    for title, txs_list in past_commitments_by_title.items():
        unique_months = len(set((t.date.year, t.date.month) for t in txs_list))
        if unique_months > 0:
            avg_monthly = sum(t.amount for t in txs_list) / unique_months
            
            # Find the most common category for this title
            category = txs_list[0].category
            
            # Find the average day of the month
            avg_day = round(sum(t.date.day for t in txs_list) / len(txs_list))
            avg_day = max(1, min(28, avg_day))
            
            # Check if spent this month
            spent_this_month = sum(t.amount for t in this_month_txs if t.title.lower() == title.lower() or t.category == category)
            # Alternatively, check specifically by title or category
            # Let's fallback to category-based matching if title-based matching doesn't find it
            this_month_paid_by_title = [t for t in this_month_txs if title.lower() in t.title.lower() or t.title.lower() in title.lower()]
            
            if this_month_paid_by_title:
                spent_this_month = sum(t.amount for t in this_month_paid_by_title)
            else:
                # If no matching title, check if we already paid category commitments
                spent_this_month = sum(t.amount for t in this_month_txs if t.category == category)
                
            rem = max(0.0, avg_monthly - spent_this_month)
            if rem > 0:
                upcoming_commitments += rem
                expected_date = today.replace(day=avg_day)
                upcoming_details.append({
                    "name": title,
                    "category": category,
                    "amount": round(rem, 2),
                    "expected_date": expected_date.strftime("%Y-%m-%d"),
                    "expected_day": avg_day
                })
                
    # Sort upcoming commitments by expected day
    upcoming_details.sort(key=lambda x: x["expected_day"])
            
    # Expected Essential Spending (Food, Travel)
    essential_categories = {'Food', 'Travel'}
    essential_past_txs = [t for t in past_txs if t.category in essential_categories]
    
    if essential_past_txs:
        first_date = min(t.date for t in essential_past_txs)
        last_month_end = this_month_start - timedelta(days=1)
        total_days = max(1, (last_month_end - first_date).days + 1)
        daily_essential = sum(t.amount for t in essential_past_txs) / total_days
    else:
        daily_essential = 0.0
        
    expected_essential_spending = daily_essential * remaining_days
    
    # Safety Buffer (10% of current balance)
    safety_buffer = current_balance * 0.10
    
    # Safe to Spend
    safe_to_spend = current_balance - upcoming_commitments - expected_essential_spending - safety_buffer
    
    daily_safe_to_spend = safe_to_spend / remaining_days
    
    status = "You are on track"
    if safe_to_spend < 0:
        status = "At risk: Commitments exceed balance"
    elif daily_safe_to_spend < (total_income * 0.01): # Arbitrary low threshold relative to income
        status = "Caution: Low daily budget"
        
    return {
        "current_balance": round(current_balance, 2),
        "upcoming_commitments": round(upcoming_commitments, 2),
        "upcoming_commitments_details": upcoming_details,
        "expected_essential_spending": round(expected_essential_spending, 2),
        "safety_buffer": round(safety_buffer, 2),
        "safe_to_spend": round(safe_to_spend, 2),
        "daily_safe_to_spend": round(daily_safe_to_spend, 2),
        "status": status,
        "calculation_period": f"{today.strftime('%B %Y')} ({remaining_days} days left)"
    }
# ── Delete transaction ─────────────────────────────────────────────────────

def delete_transaction(user_id: int, tx_id: int) -> bool:
    """
    Delete a transaction, verifying ownership.

    Returns:
        True if deleted, False if not found or not owned by user.
    """
    tx = Transaction.query.filter_by(id=tx_id, user_id=user_id).first()
    if not tx:
        return False

    db.session.delete(tx)
    db.session.commit()
    return True


def update_transaction(user_id: int, tx_id: int, data: dict) -> Transaction | None:
    """
    Update a transaction, verifying ownership.
    """
    tx = Transaction.query.filter_by(id=tx_id, user_id=user_id).first()
    if not tx:
        return None

    if 'title' in data:
        tx.title = str(data['title']).strip()
    if 'amount' in data:
        try:
            amount = float(data['amount'])
            if amount <= 0:
                raise ValueError('Amount must be greater than 0.')
            tx.amount = amount
        except (TypeError, ValueError):
            raise ValueError('Amount must be a positive number.')
    if 'type' in data:
        if data['type'] not in ('income', 'expense'):
            raise ValueError("Type must be 'income' or 'expense'.")
        tx.type = data['type']
    if 'category' in data:
        tx.category = str(data['category']).strip()
    if 'description' in data:
        tx.description = str(data['description']).strip()
    elif 'note' in data:
        tx.description = str(data['note']).strip()
    if 'date' in data:
        try:
            tx.date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        except (ValueError, TypeError):
            raise ValueError('Date must be in YYYY-MM-DD format.')

    db.session.commit()
    return tx


def seed_demo_data(user_id: int) -> bool:
    """
    Seed realistic demo data for testing and demonstrations.
    Deletes all existing transactions for this user first.
    """
    from models.transaction import Transaction
    from datetime import date, timedelta
    
    # 1. Clear current transactions
    Transaction.query.filter_by(user_id=user_id).delete()
    
    today = date.today()
    year = today.year
    month = today.month
    
    # We want current balance of ₹43,351, which is ₹60,000 (Income) - ₹16,649 (Expenses).
    # Rent is ₹12,000, SIP is ₹5,000, EMI is ₹4,000. These are upcoming commitments,
    # meaning they are expected based on historical transactions, but NOT yet spent this month.
    # Therefore, we seed the historical transactions for commitments in previous months.
    
    # Seed 2 previous months to establish averages
    for offset in [1, 2]:
        # Approximate start of previous months
        prev_month_date = today.replace(day=1) - timedelta(days=offset * 28)
        pyear = prev_month_date.year
        pmonth = prev_month_date.month
        
        # Income to cover expenses so carry-over balance from past months is exactly zero
        # Total past month expense: Rent(12k) + SIP(5k) + EMI(4k) + Essentials: Food(6k) + Travel(4k) = 31k.
        db.session.add(Transaction(
            user_id=user_id, title="Monthly Salary", amount=31000.0, type="income", category="Salary", description="Salary", date=date(pyear, pmonth, 1)
        ))
        
        # Commitments in historical data
        db.session.add(Transaction(
            user_id=user_id, title="Hostel/Rent", amount=12000.0, type="expense", category="Housing", description="Rent", date=date(pyear, pmonth, 2)
        ))
        db.session.add(Transaction(
            user_id=user_id, title="SIP Contribution", amount=5000.0, type="expense", category="Investment", description="SIP", date=date(pyear, pmonth, 5)
        ))
        db.session.add(Transaction(
            user_id=user_id, title="EMI Payment", amount=4000.0, type="expense", category="Investment", description="EMI", date=date(pyear, pmonth, 10)
        ))
        
        # Essentials in historical data
        db.session.add(Transaction(
            user_id=user_id, title="Groceries", amount=6000.0, type="expense", category="Food", description="Groceries", date=date(pyear, pmonth, 15)
        ))
        db.session.add(Transaction(
            user_id=user_id, title="Metro/Cab", amount=4000.0, type="expense", category="Travel", description="Travel", date=date(pyear, pmonth, 20)
        ))

    # 2. Current Month Transactions (Excluding upcoming commitments)
    current_txs = [
        {"title": "Monthly Salary", "amount": 60000.0, "type": "income", "category": "Salary", "description": "Monthly Salary", "date": date(year, month, 1)},
        {"title": "Groceries", "amount": 4500.0, "type": "expense", "category": "Food", "description": "Groceries", "date": date(year, month, 3)},
        {"title": "Metro/Cab", "amount": 2000.0, "type": "expense", "category": "Travel", "description": "Metro/Cab", "date": date(year, month, 5)},
        {"title": "Amazon Purchase", "amount": 3200.0, "type": "expense", "category": "Shopping", "description": "Amazon Purchase", "date": date(year, month, 7)},
        {"title": "Electricity", "amount": 1800.0, "type": "expense", "category": "Utilities", "description": "Electricity", "date": date(year, month, 10)},
        {"title": "Movies", "amount": 800.0, "type": "expense", "category": "Entertainment", "description": "Movies", "date": date(year, month, 12)},
        {"title": "Restaurant", "amount": 1200.0, "type": "expense", "category": "Food", "description": "Restaurant", "date": date(year, month, 15)},
        {"title": "Netflix/Spotify", "amount": 649.0, "type": "expense", "category": "Entertainment", "description": "Netflix/Spotify", "date": date(year, month, 18)},
        {"title": "Course", "amount": 2500.0, "type": "expense", "category": "Other", "description": "Course", "date": date(year, month, 20)},
    ]
    
    for tx_data in current_txs:
        db.session.add(Transaction(
            user_id=user_id,
            title=tx_data["title"],
            amount=tx_data["amount"],
            type=tx_data["type"],
            category=tx_data["category"],
            description=tx_data["description"],
            date=tx_data["date"]
        ))
        
    db.session.commit()
    return True


