import os
import uuid
import tempfile
from typing import Dict, Any, Optional, Tuple
from django.core.files.uploadedfile import UploadedFile

# Document processing imports
import PyPDF2
from docx import Document as DocxDocument
import io

class DocumentProcessor:
    """
    Comprehensive document processor that handles all file types
    and prepares them for optimal storage and viewing
    """
    
    SUPPORTED_TEXT_FORMATS = ['txt', 'csv', 'json', 'xml', 'html', 'md']
    SUPPORTED_PDF_FORMATS = ['pdf']
    SUPPORTED_DOC_FORMATS = ['doc', 'docx']
    SUPPORTED_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff']
    
    @staticmethod
    def get_file_extension(filename: str) -> str:
        """Get file extension in lowercase"""
        return filename.lower().split('.')[-1] if '.' in filename else ''
    
    @staticmethod
    def get_file_category(filename: str) -> str:
        """Categorize file type for processing"""
        ext = DocumentProcessor.get_file_extension(filename)
        
        if ext in DocumentProcessor.SUPPORTED_TEXT_FORMATS:
            return 'text'
        elif ext in DocumentProcessor.SUPPORTED_PDF_FORMATS:
            return 'pdf'
        elif ext in DocumentProcessor.SUPPORTED_DOC_FORMATS:
            return 'document'
        elif ext in DocumentProcessor.SUPPORTED_IMAGE_FORMATS:
            return 'image'
        else:
            return 'other'
    
    @staticmethod
    def extract_text_content(uploaded_file: UploadedFile) -> Optional[str]:
        """
        Extract text content from various file types
        Returns None if text extraction is not possible/needed
        """
        filename = uploaded_file.name
        category = DocumentProcessor.get_file_category(filename)
        
        try:
            if category == 'text':
                # Plain text files
                content = uploaded_file.read()
                if isinstance(content, bytes):
                    content = content.decode('utf-8', errors='ignore')
                uploaded_file.seek(0)  # Reset file pointer
                return content.strip()
                
            elif category == 'pdf':
                # PDF files
                uploaded_file.seek(0)
                pdf_reader = PyPDF2.PdfReader(io.BytesIO(uploaded_file.read()))
                text = ""
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
                uploaded_file.seek(0)  # Reset file pointer
                return text.strip() if text.strip() else None
                
            elif category == 'document':
                # DOC/DOCX files
                if DocumentProcessor.get_file_extension(filename) == 'docx':
                    uploaded_file.seek(0)
                    doc = DocxDocument(io.BytesIO(uploaded_file.read()))
                    text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
                    uploaded_file.seek(0)  # Reset file pointer
                    return text.strip() if text.strip() else None
                
            # For images and other formats, no text extraction
            return None
            
        except Exception as e:
            print(f"Error extracting text from {filename}: {str(e)}")
            uploaded_file.seek(0)  # Reset file pointer on error
            return None
    
    @staticmethod
    def get_content_type(filename: str) -> str:
        """Get appropriate content type for file"""
        ext = DocumentProcessor.get_file_extension(filename)
        
        content_types = {
            'txt': 'text/plain',
            'csv': 'text/csv',
            'json': 'application/json',
            'xml': 'application/xml',
            'html': 'text/html',
            'md': 'text/markdown',
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'bmp': 'image/bmp',
            'tiff': 'image/tiff',
        }
        
        return content_types.get(ext, 'application/octet-stream')
    
    @staticmethod
    def get_viewer_strategy(filename: str) -> str:
        """Determine the best viewing strategy for the file"""
        category = DocumentProcessor.get_file_category(filename)
        
        if category == 'text':
            return 'text'  # Display as text
        elif category == 'pdf':
            return 'pdf'   # Display in PDF viewer
        elif category == 'document':
            return 'text_extracted'  # Show extracted text + download original
        elif category == 'image':
            return 'image'  # Display as image
        else:
            return 'download'  # Download only
    
    @staticmethod
    def process_document(uploaded_file: UploadedFile, doctor_id: str, patient_id: str, document_type: str) -> Dict[str, Any]:
        """
        Process uploaded document and prepare for storage
        Returns document metadata with storage information
        """
        filename = uploaded_file.name
        file_size = uploaded_file.size
        file_extension = DocumentProcessor.get_file_extension(filename)
        content_type = DocumentProcessor.get_content_type(filename)
        viewer_strategy = DocumentProcessor.get_viewer_strategy(filename)
        
        # Generate unique file ID
        file_id = str(uuid.uuid4())
        
        # Create OSS path
        oss_path = f"doctors/{doctor_id}/patients/{patient_id}/{document_type}/{file_id}.{file_extension}"
        
        # Extract text content if possible
        extracted_text = DocumentProcessor.extract_text_content(uploaded_file)
        
        # Prepare document metadata
        document_metadata = {
            'documentType': document_type,
            'fileName': filename,
            'fileId': file_id,
            'fileSize': file_size,
            'fileExtension': file_extension,
            'contentType': content_type,
            'viewerStrategy': viewer_strategy,
            'oss_path': oss_path,
            'extractedText': extracted_text,
            'hasTextContent': extracted_text is not None,
            'uploadTimestamp': None,  # Will be set when uploaded
            'practitionerId': doctor_id,
        }
        
        return document_metadata

class DocumentUploadService:
    """Service for handling document uploads with the new system"""
    
    @staticmethod
    def upload_document(uploaded_file: UploadedFile, doctor_id: str, patient_id: str, document_type: str) -> Dict[str, Any]:
        """
        Upload document to OSS with new optimized system
        """
        from alibaba_cloud.services.oss_service import AlibabaOSSService
        from django.utils import timezone
        
        # Process document
        doc_metadata = DocumentProcessor.process_document(uploaded_file, doctor_id, patient_id, document_type)
        
        try:
            # Upload to OSS
            oss_service = AlibabaOSSService()
            
            # Reset file pointer
            uploaded_file.seek(0)
            
            # Upload original file using the correct method
            oss_response = oss_service.upload_medical_document(
                file_content=uploaded_file.read(),
                file_name=uploaded_file.name,
                doctor_id=doctor_id,
                patient_id=patient_id,
                document_type=document_type
            )
            
            # Set upload timestamp
            doc_metadata['uploadTimestamp'] = timezone.now().isoformat()
            
            # Create backend proxy URL
            doc_metadata['url'] = f'/api/patients/{patient_id}/documents/{{index}}/content/'  # Index will be set when added to patient
            
            # Store original OSS URL for reference
            doc_metadata['oss_url'] = oss_response.get('presigned_url') if isinstance(oss_response, dict) else None
            
            # Update OSS path with the actual path returned by the service
            if isinstance(oss_response, dict) and oss_response.get('oss_path'):
                doc_metadata['oss_path'] = oss_response['oss_path']
            
            return {
                'success': True,
                'document': doc_metadata,
                'message': f'Document uploaded successfully: {uploaded_file.name}'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'message': f'Failed to upload document: {uploaded_file.name}'
            }
