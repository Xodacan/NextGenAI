from typing import Optional, Tuple
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.utils.translation import gettext_lazy as _

from .firebase_config import verify_firebase_token
from core.models import Doctor


class FirebaseAuthentication(BaseAuthentication):
    """Authenticate requests using Firebase ID tokens from Authorization header.

    Expected header: Authorization: Bearer <FIREBASE_ID_TOKEN>
    Returns a Doctor instance as request.user.
    """

    keyword = 'Bearer'

    def authenticate(self, request) -> Optional[Tuple[Doctor, None]]:
        auth_header: str = request.headers.get('Authorization') or ''
        if not auth_header:
            return None

        parts = auth_header.split()
        if len(parts) != 2 or parts[0] != self.keyword:
            raise AuthenticationFailed(_('Invalid Authorization header format.'))

        id_token = parts[1]
        user_info = verify_firebase_token(id_token)
        if not user_info:
            raise AuthenticationFailed(_('Invalid Firebase ID token.'))

        firebase_uid = user_info.get('uid')
        if not firebase_uid:
            raise AuthenticationFailed(_('Firebase user missing uid.'))

        doctor, created = Doctor.objects.get_or_create(
            firebase_uid=firebase_uid,
            defaults={
                'email': user_info.get('email') or None,
                'display_name': user_info.get('name') or None,
            },
        )

        # Optionally update metadata
        updated = False
        email = user_info.get('email') or None
        name = user_info.get('name') or None
        if email and doctor.email != email:
            doctor.email = email
            updated = True
        if name and doctor.display_name != name:
            doctor.display_name = name
            updated = True
        if updated:
            doctor.save(update_fields=['email', 'display_name'])

        return doctor, None


