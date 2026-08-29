import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    # Change this to a long random string in production!
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-prod')

    # SQLite database stored in database/ folder
    SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(BASE_DIR, 'database', 'finance.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
