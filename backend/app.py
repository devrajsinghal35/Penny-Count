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
from routes.ai_assistant import ai_bp


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Enable CORS for all routes (necessary for React app integration)
    CORS(app, resources={r"/*": {"origins": "*"}}, allow_headers=["Content-Type", "Authorization"], methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

    # Ensure the database directory exists
    db_path = os.path.join(os.path.dirname(__file__), 'database')
    os.makedirs(db_path, exist_ok=True)

    # Initialise SQLAlchemy with this app
    db.init_app(app)

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(transactions_bp)
    app.register_blueprint(ai_bp, url_prefix='/api/ai')

    # Create all database tables (safe to call repeatedly)
    with app.app_context():
        db.create_all()

    return app


# ── Entry point ────────────────────────────────────────────────────────────
if __name__ == '__main__':
    app = create_app()
    debug_mode = os.environ.get('FLASK_DEBUG', 'false').lower() in ('true', '1')
    host_mode = os.environ.get('FLASK_HOST', '127.0.0.1')
    print('\n🚀  Finance Tracker API running at http://127.0.0.1:5055\n')
    app.run(host=host_mode, debug=debug_mode, port=5055)
