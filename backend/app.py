import os
from flask import Flask
from flask_cors import CORS
from config import Config
from models import db
from models.user import User  # noqa: F401
from models.transaction import Transaction  # noqa: F401
from routes.auth import auth_bp
from routes.transactions import transactions_bp
from routes.ai_assistant import ai_bp


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    CORS(
        app,
        resources={r"/*": {"origins": "*"}},
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )

    db_path = os.path.join(os.path.dirname(__file__), 'database')
    os.makedirs(db_path, exist_ok=True)

    db.init_app(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(transactions_bp)
    app.register_blueprint(ai_bp, url_prefix='/api/ai')

    @app.route('/')
    @app.route('/health')
    def index():
        return {
            'status': 'online',
            'message': 'Penny-Count Backend API is running! 🚀'
        }, 200

    with app.app_context():
        db.create_all()

    return app


if __name__ == '__main__':
    app = create_app()
    debug_mode = os.environ.get('FLASK_DEBUG', 'false').lower() in ('true', '1')
    host_mode = os.environ.get('FLASK_HOST', '127.0.0.1')
    port = int(os.environ.get('PORT', 5055))
    app.run(host=host_mode, debug=debug_mode, port=port)
