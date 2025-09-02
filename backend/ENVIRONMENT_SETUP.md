# Environment Setup

This document explains how to set up the environment variables for the NextGenAI backend.

## Required Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

```bash
# Django Settings
SECRET_KEY=your-secure-secret-key-here
DEBUG=True

# OpenAI Configuration (optional)
OPENAI_API_KEY=your-openai-api-key-here

# Firebase Configuration (optional)
FIREBASE_PROJECT_ID=your-firebase-project-id

# Alibaba Cloud Configuration (optional)
ALIBABA_CLOUD_ACCESS_KEY_ID=your-access-key-id
ALIBABA_CLOUD_ACCESS_KEY_SECRET=your-access-key-secret
ALIBABA_CLOUD_REGION=your-region
ALIBABA_CLOUD_BUCKET_NAME=your-bucket-name
```

## Generating a Secret Key

To generate a secure Django secret key, run:

```bash
python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

## Security Notes

- **Never commit the `.env` file** - it's already in `.gitignore`
- **Change the SECRET_KEY in production** - use a different, secure key
- **The database files (`db.sqlite3`) are now ignored** - they won't be committed to version control

## Database

The database will be created automatically when you run migrations:

```bash
python3 manage.py migrate
```

## Running the Server

```bash
python3 manage.py runserver 8000
```

## Troubleshooting

If you get an error about missing SECRET_KEY, make sure:
1. The `.env` file exists in the `backend/` directory
2. The SECRET_KEY is set in the `.env` file
3. You're running Django from the `backend/` directory
