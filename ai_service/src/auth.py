from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from functools import wraps
from typing import Any, Dict

from flask import jsonify, request, g


class AuthError(Exception):
    pass


def _b64url_decode(data: str) -> bytes:
    pad = '=' * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + pad)


def _decode_jwt(token: str, secret: str) -> Dict[str, Any]:
    parts = token.split('.')
    if len(parts) != 3:
        raise AuthError('Invalid token')

    header_b64, payload_b64, sig_b64 = parts
    try:
        header = json.loads(_b64url_decode(header_b64))
    except Exception as exc:
        raise AuthError('Invalid token header') from exc

    if header.get('alg') != 'HS256':
        raise AuthError('Unsupported token algorithm')

    signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
    expected = hmac.new(secret.encode('utf-8'), signing_input, hashlib.sha256).digest()
    try:
        signature = _b64url_decode(sig_b64)
    except Exception as exc:
        raise AuthError('Invalid token signature') from exc

    if not hmac.compare_digest(signature, expected):
        raise AuthError('Invalid token signature')

    try:
        payload = json.loads(_b64url_decode(payload_b64))
    except Exception as exc:
        raise AuthError('Invalid token payload') from exc

    exp = payload.get('exp')
    if exp is not None:
        try:
            if time.time() > float(exp):
                raise AuthError('Token expired')
        except ValueError as exc:
            raise AuthError('Invalid exp claim') from exc

    return payload


def _json_err(message: str, status: int):
    return jsonify({'success': False, 'message': message, 'data': {}}), status


def protect(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if os.getenv('AUTH_ENABLED', 'false').lower() != 'true':
            return fn(*args, **kwargs)

        secret = os.getenv('JWT_SECRET', '')
        if not secret:
            return _json_err('JWT_SECRET missing', 500)

        auth = request.headers.get('Authorization', '')
        if not auth.startswith('Bearer '):
            return _json_err('Not authorized to access this route', 401)

        token = auth.split(' ', 1)[1].strip()
        if not token:
            return _json_err('Not authorized to access this route', 401)

        try:
            payload = _decode_jwt(token, secret)
        except AuthError:
            return _json_err('Not authorized to access this route', 401)

        role = payload.get('role')
        user_id = payload.get('id') or payload.get('_id')
        if not role or not user_id:
            return _json_err('Not authorized to access this route', 401)

        g.user = {'id': user_id, 'role': role}
        return fn(*args, **kwargs)

    return wrapper


def authorize(*roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if os.getenv('AUTH_ENABLED', 'false').lower() != 'true':
                return fn(*args, **kwargs)

            user = getattr(g, 'user', None)
            if not user:
                return _json_err('Not authorized to access this route', 401)

            if user.get('role') not in roles:
                return _json_err(f"User role {user.get('role')} is not authorized to access this route", 403)

            return fn(*args, **kwargs)

        return wrapper

    return decorator
