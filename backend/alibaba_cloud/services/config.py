import os
from decouple import config

# Alibaba Cloud Configuration
ALIBABA_CLOUD_CONFIG = {
    'ACCESS_KEY_ID': config('ALIBABA_ACCESS_KEY_ID', default=''),
    'ACCESS_KEY_SECRET': config('ALIBABA_ACCESS_KEY_SECRET', default=''),
    'REGION_ID': config('ALIBABA_REGION_ID', default='us-east-1'),
    'ENDPOINT': config('ALIBABA_ENDPOINT', default=''),
}

# OSS Configuration (File Storage)
OSS_CONFIG = {
    'BUCKET_NAME': config('ALIBABA_OSS_BUCKET_NAME', default='nextgenai-medical-docs'),
    'ENDPOINT': config('ALIBABA_OSS_ENDPOINT', default=''),
    'CDN_DOMAIN': config('ALIBABA_OSS_CDN_DOMAIN', default=''),
}

# Document Intelligence/NLP API Configuration
DOCUMENT_INTELLIGENCE_CONFIG = {
    'ENDPOINT': config('ALIBABA_DOC_INTELLIGENCE_ENDPOINT', default=''),
    'API_VERSION': config('ALIBABA_DOC_INTELLIGENCE_VERSION', default='2022-07-11'),
    'PROJECT_NAME': config('ALIBABA_DOC_INTELLIGENCE_PROJECT', default='nextgenai-medical'),
}

# Function Compute Configuration (Word Doc Generation)
FUNCTION_COMPUTE_CONFIG = {
    'ENDPOINT': config('ALIBABA_FC_ENDPOINT', default=''),
    'SERVICE_NAME': config('ALIBABA_FC_SERVICE_NAME', default='nextgenai-doc-generator'),
    'FUNCTION_NAME': config('ALIBABA_FC_FUNCTION_NAME', default='generate-word-doc'),
    'REGION': config('ALIBABA_FC_REGION', default='us-east-1'),
}

# Simple Application Server Configuration (Deployment)
SIMPLE_APP_SERVER_CONFIG = {
    'INSTANCE_ID': config('ALIBABA_SAS_INSTANCE_ID', default=''),
    'REGION_ID': config('ALIBABA_SAS_REGION_ID', default='us-east-1'),
    'DEPLOYMENT_PATH': config('ALIBABA_SAS_DEPLOYMENT_PATH', default='/var/www/nextgenai'),
}
