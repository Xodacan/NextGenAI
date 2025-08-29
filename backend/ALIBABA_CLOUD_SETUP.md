# Alibaba Cloud Integration Setup Guide

This guide will help you set up the 4 specific Alibaba Cloud services for the NextGenAI healthcare application.

## Prerequisites

1. Alibaba Cloud account
2. Access Key ID and Access Key Secret
3. Python 3.8+ with pip

## Required Alibaba Cloud Services

### 1. Simple Application Server (SAS)
- **Purpose**: Quick deployment and hosting of the NextGenAI application
- **Features**: Automated deployment, environment management, server monitoring
- **Benefits**: Easy setup, managed hosting, automatic scaling

### 2. Object Storage Service (OSS)
- **Purpose**: Secure file storage for medical documents
- **Features**: Document upload/download, CDN integration, access control
- **Benefits**: Scalable storage, high availability, cost-effective

### 3. Document Intelligence/NLP API
- **Purpose**: Document analysis and summarization
- **Features**: OCR, entity extraction, medical text analysis, document classification
- **Benefits**: AI-powered insights, automated processing, accuracy

### 4. Function Compute (FC)
- **Purpose**: Word document generation
- **Features**: Serverless document creation, template processing, format conversion
- **Benefits**: Pay-per-use, automatic scaling, fast processing

## Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Alibaba Cloud Configuration
ALIBABA_ACCESS_KEY_ID=your_access_key_id
ALIBABA_ACCESS_KEY_SECRET=your_access_key_secret
ALIBABA_REGION_ID=us-east-1
ALIBABA_ENDPOINT=https://oss-us-east-1.aliyuncs.com

# OSS Configuration (File Storage)
ALIBABA_OSS_BUCKET_NAME=nextgenai-medical-docs
ALIBABA_OSS_ENDPOINT=https://oss-us-east-1.aliyuncs.com
ALIBABA_OSS_CDN_DOMAIN=your-cdn-domain.com

# Document Intelligence/NLP API Configuration
ALIBABA_DOC_INTELLIGENCE_ENDPOINT=https://doc-intelligence.cn-shanghai.aliyuncs.com
ALIBABA_DOC_INTELLIGENCE_VERSION=2022-07-11
ALIBABA_DOC_INTELLIGENCE_PROJECT=nextgenai-medical

# Function Compute Configuration (Word Doc Generation)
ALIBABA_FC_ENDPOINT=https://fc.cn-shanghai.aliyuncs.com
ALIBABA_FC_SERVICE_NAME=nextgenai-doc-generator
ALIBABA_FC_FUNCTION_NAME=generate-word-doc
ALIBABA_FC_REGION=us-east-1

# Simple Application Server Configuration (Deployment)
ALIBABA_SAS_INSTANCE_ID=your-instance-id
ALIBABA_SAS_REGION_ID=us-east-1
ALIBABA_SAS_DEPLOYMENT_PATH=/var/www/nextgenai
```

## Installation Steps

1. **Install Python dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Run Django migrations:**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

3. **Test the integration:**
   ```bash
   python manage.py runserver
   ```

## API Endpoints

### 1. OSS - File Storage
- `POST /api/alibaba/upload/` - Upload medical documents
- `GET /api/alibaba/documents/{patient_id}/` - List patient documents
- `DELETE /api/alibaba/documents/delete/{oss_path}/` - Delete documents

### 2. Document Intelligence/NLP API - Document Analysis
- `POST /api/alibaba/analyze/` - Analyze documents (full, entities, classify)
- `POST /api/alibaba/summary/` - Generate medical summaries

### 3. Function Compute - Word Document Generation
- `POST /api/alibaba/generate-word-doc/` - Generate Word documents
- `GET /api/alibaba/document-status/{document_id}/` - Check document generation status

### 4. Simple Application Server - Deployment
- `POST /api/alibaba/deploy/` - Deploy application
- `GET /api/alibaba/deployment-status/{deployment_id}/` - Check deployment status
- `POST /api/alibaba/restart/` - Restart application
- `GET /api/alibaba/server-status/` - Get server status

## Usage Examples

### Upload a Document (OSS)
```bash
curl -X POST http://localhost:8000/api/alibaba/upload/ \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -F "file=@medical_report.pdf" \
  -F "patient_id=123" \
  -F "document_type=Lab Report"
```

### Analyze Document (Document Intelligence)
```bash
curl -X POST http://localhost:8000/api/alibaba/analyze/ \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -F "file=@document.png" \
  -F "analysis_type=full"
```

### Generate Word Document (Function Compute)
```bash
curl -X POST http://localhost:8000/api/alibaba/generate-word-doc/ \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "document_type": "medical_report",
    "patient_data": {
      "name": "John Doe",
      "age": 45,
      "diagnosis": "Hypertension"
    }
  }'
```

### Deploy Application (Simple Application Server)
```bash
curl -X POST http://localhost:8000/api/alibaba/deploy/ \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deployment_config": {
      "git_repository": "https://github.com/your-repo/nextgenai.git",
      "branch": "main",
      "build_commands": ["npm install", "npm run build"],
      "environment_variables": {
        "NODE_ENV": "production"
      }
    }
  }'
```

## Service Integration Workflow

### Complete Document Processing Pipeline:
1. **Upload** medical document to OSS
2. **Analyze** document using Document Intelligence API
3. **Generate** Word report using Function Compute
4. **Deploy** updates using Simple Application Server

### Example Workflow:
```python
# 1. Upload document
upload_result = oss_service.upload_medical_document(file_content, file_name, doctor_id, patient_id, "Lab Report")

# 2. Analyze document
analysis_result = doc_intelligence_service.analyze_medical_document(file_content)

# 3. Generate Word document
patient_data = {
    "patient_id": patient_id,
    "analysis_results": analysis_result,
    "document_url": upload_result['presigned_url']
}
word_doc_result = fc_service.generate_medical_report(patient_data)

# 4. Deploy if needed
deployment_result = sas_service.deploy_application(deployment_config)
```

## Security Considerations

1. **Access Control**: All endpoints require Firebase authentication
2. **Data Encryption**: Documents are encrypted at rest in OSS
3. **Secure Communication**: All API calls use HTTPS
4. **Environment Variables**: Sensitive data stored in environment variables

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify Access Key ID and Secret are correct
   - Check if the keys have proper permissions for all 4 services

2. **OSS Upload Failures**
   - Verify bucket name and endpoint
   - Check bucket permissions and CORS settings

3. **Document Intelligence Errors**
   - Ensure Document Intelligence service is enabled
   - Verify project name and API version

4. **Function Compute Errors**
   - Check if Function Compute service is configured
   - Verify service and function names

5. **Simple Application Server Errors**
   - Verify instance ID and region
   - Check deployment path permissions

### Support

For Alibaba Cloud specific issues, refer to:
- [Simple Application Server Documentation](https://www.alibabacloud.com/help/en/simple-application-server)
- [OSS Documentation](https://www.alibabacloud.com/help/en/object-storage-service)
- [Document Intelligence Documentation](https://www.alibabacloud.com/help/en/document-intelligence)
- [Function Compute Documentation](https://www.alibabacloud.com/help/en/function-compute)
