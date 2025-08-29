import os
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, List
import oss2
from django.conf import settings
from .config import OSS_CONFIG, ALIBABA_CLOUD_CONFIG


class AlibabaOSSService:
    """Alibaba Cloud OSS service for medical document storage"""
    
    def __init__(self):
        self.auth = oss2.Auth(
            ALIBABA_CLOUD_CONFIG['ACCESS_KEY_ID'],
            ALIBABA_CLOUD_CONFIG['ACCESS_KEY_SECRET']
        )
        self.bucket = oss2.Bucket(
            self.auth,
            OSS_CONFIG['ENDPOINT'],
            OSS_CONFIG['BUCKET_NAME']
        )
    
    def upload_medical_document(self, file_content: bytes, file_name: str, 
                               doctor_id: str, patient_id: str, 
                               document_type: str) -> Dict:
        """
        Upload a medical document to OSS with proper organization
        
        Args:
            file_content: File content as bytes
            file_name: Original file name
            doctor_id: Doctor's Firebase UID
            patient_id: Patient ID
            document_type: Type of medical document
            
        Returns:
            Dict containing upload information
        """
        # Generate unique file path
        file_extension = os.path.splitext(file_name)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        
        # Organize files by doctor/patient structure
        oss_path = f"doctors/{doctor_id}/patients/{patient_id}/{document_type}/{unique_filename}"
        
        # Upload file
        result = self.bucket.put_object(oss_path, file_content)
        
        # Generate presigned URL for secure access (24 hours)
        url = self.bucket.sign_url('GET', oss_path, 24 * 3600)
        
        return {
            'oss_path': oss_path,
            'file_name': file_name,
            'unique_filename': unique_filename,
            'document_type': document_type,
            'upload_timestamp': datetime.now().isoformat(),
            'file_size': len(file_content),
            'presigned_url': url,
            'etag': result.etag
        }
    
    def get_document_url(self, oss_path: str, expires: int = 3600) -> str:
        """
        Generate a presigned URL for document access
        
        Args:
            oss_path: OSS object path
            expires: URL expiration time in seconds
            
        Returns:
            Presigned URL
        """
        return self.bucket.sign_url('GET', oss_path, expires)
    
    def delete_document(self, oss_path: str) -> bool:
        """
        Delete a document from OSS
        
        Args:
            oss_path: OSS object path
            
        Returns:
            True if successful, False otherwise
        """
        try:
            self.bucket.delete_object(oss_path)
            return True
        except Exception as e:
            print(f"Error deleting document: {e}")
            return False
    
    def list_patient_documents(self, doctor_id: str, patient_id: str) -> List[Dict]:
        """
        List all documents for a specific patient
        
        Args:
            doctor_id: Doctor's Firebase UID
            patient_id: Patient ID
            
        Returns:
            List of document information
        """
        prefix = f"doctors/{doctor_id}/patients/{patient_id}/"
        documents = []
        
        for obj in oss2.ObjectIterator(self.bucket, prefix=prefix):
            # Extract document type from path
            path_parts = obj.key.split('/')
            if len(path_parts) >= 5:
                document_type = path_parts[4]
                file_name = path_parts[-1]
                
                documents.append({
                    'oss_path': obj.key,
                    'file_name': file_name,
                    'document_type': document_type,
                    'size': obj.size,
                    'last_modified': obj.last_modified,
                    'url': self.get_document_url(obj.key)
                })
        
        return documents
    
    def get_document_metadata(self, oss_path: str) -> Optional[Dict]:
        """
        Get metadata for a specific document
        
        Args:
            oss_path: OSS object path
            
        Returns:
            Document metadata or None if not found
        """
        try:
            head = self.bucket.head_object(oss_path)
            return {
                'size': head.content_length,
                'last_modified': head.last_modified,
                'content_type': head.content_type,
                'etag': head.etag
            }
        except oss2.exceptions.NoSuchKey:
            return None
