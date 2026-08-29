import os
from flask import Flask
from flask_cors import CORS
from config import Config
from models import db

# Import models so SQLAlchemy knows about them before create_all()
from models.user import User          # noqa: F401
from models.transaction import Transaction  # noqa: F401

# Import blueprints
from routes.auth import auth_bp
from routes.transactions import transactions_bp


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Enable CORS for all routes (necessary for React app integration)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Ensure the database directory exists
    db_path = os.path.join(os.path.dirname(__file__), 'database')
    os.makedirs(db_path, exist_ok=True)

    # Initialise SQLAlchemy with this app
    db.init_app(app)

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(transactions_bp)

    # Create all database tables (safe to call repeatedly)
    with app.app_context():
        db.create_all()

    return app


# ── Entry point ────────────────────────────────────────────────────────────
if __name__ == '__main__':
    app = create_app()
    print('\n🚀  Finance Tracker API running at http://localhost:5000\n')
    app.run(debug=True, port=5000)
