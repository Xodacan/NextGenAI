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
        try:
            auth_header: str = request.headers.get('Authorization') or ''
            if not auth_header:
                print("No Authorization header found")
                return None

            parts = auth_header.split()
            if len(parts) != 2 or parts[0] != self.keyword:
                print(f"Invalid Authorization header format: {auth_header}")
                raise AuthenticationFailed(_('Invalid Authorization header format.'))

            id_token = parts[1]
            print(f"Verifying token: {id_token[:20]}...")
            user_info = verify_firebase_token(id_token)
            if not user_info:
                print("Token verification failed")
                raise AuthenticationFailed(_('Invalid Firebase ID token.'))

            firebase_uid = user_info.get('uid')
            if not firebase_uid:
                print("No UID in user info")
                raise AuthenticationFailed(_('Firebase user missing uid.'))

            print(f"Creating/getting doctor for UID: {firebase_uid}")
            doctor, created = Doctor.objects.get_or_create(
                firebase_uid=firebase_uid,
                defaults={
                    'email': user_info.get('email') or None,
                    'display_name': user_info.get('name') or None,
                },
            )

            if created:
                print(f"Created new doctor: {doctor}")
            else:
                print(f"Found existing doctor: {doctor}")

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
                print(f"Updated doctor metadata: {doctor}")

            return doctor, None
        except Exception as e:
            print(f"Authentication error: {e}")
            import traceback
            traceback.print_exc()
            raise


