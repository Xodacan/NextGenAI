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

## Alibaba Cloud OSS Structure

The system uses Alibaba Cloud Object Storage Service (OSS) for secure, scalable file storage. All medical documents and AI-generated summaries are stored in the cloud following a structured hierarchy.

### 📁 OSS Bucket Organization

```
openroom-documents/ (OSS Bucket)
├── doctors/
│   └── {doctor_firebase_uid}/
│       ├── patients/
│       │   └── {patient_id}/
│       │       ├── {document_type}/
│       │       │   ├── {unique_filename_1}
│       │       │   ├── {unique_filename_2}
│       │       │   └── ...
│       │       └── discharge_summaries/
│       │           ├── Discharge_summary_{PatientName_1}.txt
│       │           ├── Discharge_summary_{PatientName_2}.txt
│       │           └── ...
│       └── institution/
│           └── {institution_files}
└── global/
    ├── templates/
    └── shared_resources/
```

### 🔗 Data Relationships

#### **Doctor Level (`doctors/{doctor_firebase_uid}/`)**
- **Source**: Firebase Authentication UID
- **Storage**: Each authenticated doctor gets their own folder
- **Connection**: Links to `core.Doctor` model via `firebase_uid` field
- **Example**: `doctors/RFvzSDKGe7gU9B9YTTfTve3aVlk2/`

#### **Patient Level (`doctors/{doctor_firebase_uid}/patients/{patient_id}/`)**
- **Source**: Django Patient model ID
- **Storage**: All patient documents organized under their doctor
- **Connection**: Links to `core.Patient` model via `id` field and `doctor` foreign key
- **Example**: `doctors/RFvzSDKGe7gU9B9YTTfTve3aVlk2/patients/1/`

#### **Document Type Level (`patients/{patient_id}/{document_type}/`)**
- **Structure**: Organized by medical document type
- **Common Types**:
  - `admission_forms/` - Patient admission documents
  - `lab_reports/` - Laboratory test results
  - `imaging/` - X-rays, CT scans, MRIs
  - `progress_notes/` - Daily progress notes
  - `medication_orders/` - Prescription and medication records
  - `discharge_summaries/` - AI-generated summaries

#### **File Level (`{document_type}/{unique_filename}`)**
- **Naming**: `{uuid}.{extension}` (e.g., `a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf`)
- **Uniqueness**: UUID ensures no filename conflicts
- **Metadata**: Stored in patient's `documents` JSON field

### 🏥 Medical Institution Connection

#### **Institution Data Storage**
```python
# In core/models.py
class Doctor(models.Model):
    firebase_uid = models.CharField(max_length=128, unique=True)
    institution = models.CharField(max_length=255, blank=True, null=True)
    # ... other fields
```

#### **OSS Institution Structure**
```
doctors/{doctor_firebase_uid}/institution/
├── profile/
│   ├── logo.png
│   ├── policies.pdf
│   └── contact_info.json
├── templates/
│   ├── discharge_summary_template.pdf
│   ├── admission_form.pdf
│   └── consent_forms/
└── shared_documents/
    ├── protocols/
    ├── guidelines/
    └── training_materials/
```

### 📊 Complete Data Flow Example

#### **1. User Authentication**
```
Firebase Auth → Doctor UID: RFvzSDKGe7gU9B9YTTfTve3aVlk2
↓
Django Doctor Model: Prag (ID: 1, Institution: "City General Hospital")
↓
OSS Path: doctors/RFvzSDKGe7gU9B9YTTfTve3aVlk2/
```

#### **2. Patient Creation**
```
Patient: John Doe (ID: 1, Doctor: Prag)
↓
OSS Path: doctors/RFvzSDKGe7gU9B9YTTfTve3aVlk2/patients/1/
```

#### **3. Document Upload**
```
Document: Lab Report (Type: lab_reports)
↓
OSS Path: doctors/RFvzSDKGe7gU9B9YTTfTve3aVlk2/patients/1/lab_reports/a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf
```

#### **4. Summary Generation**
```
AI Summary: Discharge Summary for John Doe
↓
OSS Path: doctors/RFvzSDKGe7gU9B9YTTfTve3aVlk2/patients/1/discharge_summaries/Discharge_summary_John_Doe.txt
```

### 🔐 Security & Access Control

#### **1. Doctor Isolation**
- Each doctor can only access their own folder
- No cross-doctor access possible
- Firebase UID ensures authentication

#### **2. Patient Privacy**
- Patient documents isolated under doctor folder
- Patient ID ensures data separation
- OSS presigned URLs expire (24 hours default)

#### **3. Document Type Segregation**
- Medical documents organized by type
- Easy to implement role-based access
- Audit trail for document access

### 🌐 Global Resources

#### **1. Shared Templates**
```
global/templates/
├── discharge_summary_template.pdf
├── admission_forms/
├── consent_forms/
└── medical_protocols/
```

#### **2. Institution Templates**
```
doctors/{doctor_uid}/institution/templates/
├── custom_discharge_template.pdf
├── hospital_specific_forms/
└── department_protocols/
```

### 🔄 Data Relationships Summary

```
Firebase Auth (UID) 
    ↓
Django Doctor Model (firebase_uid, institution)
    ↓
Django Patient Model (doctor foreign key)
    ↓
Patient Documents (JSON field with OSS paths)
    ↓
OSS Storage (organized folder structure)
```

### ✅ Benefits of This Structure

- **Complete isolation** between doctors
- **Organized patient data** by document type
- **Scalable storage** for medical documents
- **Secure access** via presigned URLs
- **Easy backup and recovery**
- **Compliance** with medical data regulations
- **Efficient querying** and organization

## Development

- The API is configured to work with the frontend running on `http://localhost:5173`
- CORS is enabled for development
- Django REST Framework is used for API endpoints 