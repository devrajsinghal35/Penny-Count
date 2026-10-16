import os
from cryptography.fernet import Fernet

_ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY')
if not _ENCRYPTION_KEY:
    _ENCRYPTION_KEY = Fernet.generate_key().decode('utf-8')
    os.environ['ENCRYPTION_KEY'] = _ENCRYPTION_KEY

cipher_suite = Fernet(_ENCRYPTION_KEY.encode('utf-8'))


def encrypt_field(data: str) -> str:
    if not data:
        return data
    return cipher_suite.encrypt(data.encode('utf-8')).decode('utf-8')


def decrypt_field(encrypted_data: str) -> str:
    if not encrypted_data:
        return encrypted_data
    try:
        return cipher_suite.decrypt(encrypted_data.encode('utf-8')).decode('utf-8')
    except Exception:
        return encrypted_data
