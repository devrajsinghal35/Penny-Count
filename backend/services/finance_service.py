import calendar
from collections import defaultdict
from datetime import date, datetime, timedelta
from models import db
from models.transaction import Transaction


def get_summary(user_id: int) -> dict:
    transactions = Transaction.query.filter_by(user_id=user_id).all()

    total_income = sum(t.amount for t in transactions if t.type == 'income')
    total_expense = sum(t.amount for t in transactions if t.type == 'expense')
    balance = total_income - total_expense

    category_totals: dict[str, float] = {}
    for t in transactions:
        if t.type == 'expense':
            category_totals[t.category] = category_totals.get(t.category, 0) + t.amount

    category_breakdown = [
        {'category': cat, 'amount': round(amt, 2)}
        for cat, amt in sorted(category_totals.items(), key=lambda x: x[1], reverse=True)
    ]

    return {
        'income': round(total_income, 2),
        'expense': round(total_expense, 2),
        'balance': round(balance, 2),
        'category_breakdown': category_breakdown,
    }


def get_transactions(user_id: int, type_filter: str = 'all', month_filter: str = '') -> list[dict]:
    query = Transaction.query.filter_by(user_id=user_id)

    if type_filter in ('income', 'expense'):
        query = query.filter(Transaction.type == type_filter)

    if month_filter:
        try:
            year, month = map(int, month_filter.split('-'))
            query = query.filter(
                db.extract('year', Transaction.date) == year,
                db.extract('month', Transaction.date) == month,
            )
        except (ValueError, AttributeError):
            pass

    transactions = query.order_by(Transaction.date.desc(), Transaction.created_at.desc()).all()
    return [t.to_dict() for t in transactions]


def add_transaction(user_id: int, data: dict) -> Transaction:
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
        user_id=user_id,
        title=str(data['title']).strip(),
        amount=amount,
        type=data['type'],
        category=str(data['category']).strip(),
        description=str(data.get('description', '') or data.get('note', '')).strip(),
        date=tx_date,
    )

    db.session.add(tx)
    db.session.commit()
    return tx


def get_safe_to_spend(user_id: int) -> dict:
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
            "calculation_period": f"{today.strftime('%B %Y')} ({remaining_days} days left)",
        }

    this_month_start = today.replace(day=1)
    past_txs = [t for t in transactions if t.date < this_month_start and t.type == 'expense']
    this_month_txs = [t for t in transactions if t.date >= this_month_start and t.type == 'expense']

    commitments_categories = {'Housing', 'Utilities', 'Investment'}
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
            category = txs_list[0].category
            avg_day = round(sum(t.date.day for t in txs_list) / len(txs_list))
            avg_day = max(1, min(28, avg_day))

            this_month_paid_by_title = [
                t for t in this_month_txs
                if title.lower() in t.title.lower() or t.title.lower() in title.lower()
            ]

            if this_month_paid_by_title:
                spent_this_month = sum(t.amount for t in this_month_paid_by_title)
            else:
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
                    "expected_day": avg_day,
                })

    upcoming_details.sort(key=lambda x: x["expected_day"])

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
    safety_buffer = current_balance * 0.10
    safe_to_spend = current_balance - upcoming_commitments - expected_essential_spending - safety_buffer
    daily_safe_to_spend = safe_to_spend / remaining_days

    status = "You are on track"
    if safe_to_spend < 0:
        status = "At risk: Commitments exceed balance"
    elif daily_safe_to_spend < (total_income * 0.01):
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
        "calculation_period": f"{today.strftime('%B %Y')} ({remaining_days} days left)",
    }


def delete_transaction(user_id: int, tx_id: int) -> bool:
    tx = Transaction.query.filter_by(id=tx_id, user_id=user_id).first()
    if not tx:
        return False
    db.session.delete(tx)
    db.session.commit()
    return True


def update_transaction(user_id: int, tx_id: int, data: dict) -> Transaction | None:
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
    Transaction.query.filter_by(user_id=user_id).delete()

    today = date.today()
    year = today.year
    month = today.month

    for offset in [1, 2]:
        prev_month_date = today.replace(day=1) - timedelta(days=offset * 28)
        pyear = prev_month_date.year
        pmonth = prev_month_date.month

        db.session.add(Transaction(
            user_id=user_id, title="Monthly Salary", amount=31000.0, type="income", category="Salary", description="Salary", date=date(pyear, pmonth, 1)
        ))
        db.session.add(Transaction(
            user_id=user_id, title="Hostel/Rent", amount=12000.0, type="expense", category="Housing", description="Rent", date=date(pyear, pmonth, 2)
        ))
        db.session.add(Transaction(
            user_id=user_id, title="SIP Contribution", amount=5000.0, type="expense", category="Investment", description="SIP", date=date(pyear, pmonth, 5)
        ))
        db.session.add(Transaction(
            user_id=user_id, title="EMI Payment", amount=4000.0, type="expense", category="Investment", description="EMI", date=date(pyear, pmonth, 10)
        ))
        db.session.add(Transaction(
            user_id=user_id, title="Groceries", amount=6000.0, type="expense", category="Food", description="Groceries", date=date(pyear, pmonth, 15)
        ))
        db.session.add(Transaction(
            user_id=user_id, title="Metro/Cab", amount=4000.0, type="expense", category="Travel", description="Travel", date=date(pyear, pmonth, 20)
        ))

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
            date=tx_data["date"],
        ))

    db.session.commit()
    return True


def clear_user_data(user_id: int) -> bool:
    txs = Transaction.query.filter_by(user_id=user_id).all()
    for tx in txs:
        db.session.delete(tx)
    db.session.commit()
    return True
