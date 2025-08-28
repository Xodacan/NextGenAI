# Django Backend API

This is the Django backend for the NextGenAI project.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run migrations:
```bash
python manage.py migrate
```

3. Start the development server:
```bash
python manage.py runserver
```

The server will run on `http://localhost:8000`

## API Endpoints

- `GET /api/health/` - Health check endpoint
- `GET /api/hello/` - Hello world endpoint
- `GET /admin/` - Django admin interface

## Project Structure

```
backend/
├── api/                 # Django project settings
│   ├── settings.py     # Main settings file
│   ├── urls.py         # Main URL configuration
│   └── ...
├── core/               # Core app with API views
│   ├── views.py        # API views
│   ├── urls.py         # App URL configuration
│   └── ...
├── manage.py           # Django management script
├── requirements.txt    # Python dependencies
└── README.md          # This file
```

## Development

- The API is configured to work with the frontend running on `http://localhost:5173`
- CORS is enabled for development
- Django REST Framework is used for API endpoints 