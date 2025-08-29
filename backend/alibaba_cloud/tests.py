from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from unittest.mock import patch, MagicMock
from .services.oss_service import AlibabaOSSService
from .services.ai_service import AlibabaAIService


class AlibabaCloudTestCase(TestCase):
    """Base test case for Alibaba Cloud integration"""
    
    def setUp(self):
        self.oss_service = AlibabaOSSService()
        self.ai_service = AlibabaAIService()


class AlibabaOSSServiceTest(AlibabaCloudTestCase):
    """Test cases for OSS service"""
    
    @patch('alibaba_cloud.services.oss_service.oss2.Auth')
    @patch('alibaba_cloud.services.oss_service.oss2.Bucket')
    def test_upload_medical_document(self, mock_bucket, mock_auth):
        """Test uploading a medical document"""
        # Mock the OSS bucket
        mock_bucket_instance = MagicMock()
        mock_bucket.return_value = mock_bucket_instance
        mock_bucket_instance.put_object.return_value = MagicMock(etag='test-etag')
        mock_bucket_instance.sign_url.return_value = 'https://test-url.com'
        
        # Test data
        file_content = b'test file content'
        file_name = 'test.pdf'
        doctor_id = 'doctor123'
        patient_id = 'patient456'
        document_type = 'Lab Report'
        
        # Call the method
        result = self.oss_service.upload_medical_document(
            file_content, file_name, doctor_id, patient_id, document_type
        )
        
        # Assertions
        self.assertIn('oss_path', result)
        self.assertIn('file_name', result)
        self.assertIn('presigned_url', result)
        self.assertEqual(result['document_type'], document_type)
        self.assertEqual(result['etag'], 'test-etag')


class AlibabaAIServiceTest(AlibabaCloudTestCase):
    """Test cases for AI service"""
    
    @patch('alibaba_cloud.services.ai_service.requests.post')
    def test_extract_text_from_image(self, mock_post):
        """Test OCR text extraction"""
        # Mock the API response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'text': 'Extracted text from image',
            'confidence': 0.95,
            'words': ['Extracted', 'text', 'from', 'image']
        }
        mock_post.return_value = mock_response
        
        # Test data
        image_content = b'fake image content'
        
        # Call the method
        result = self.ai_service.extract_text_from_image(image_content)
        
        # Assertions
        self.assertTrue(result['success'])
        self.assertEqual(result['text'], 'Extracted text from image')
        self.assertEqual(result['confidence'], 0.95)
    
    @patch('alibaba_cloud.services.ai_service.requests.post')
    def test_analyze_medical_text(self, mock_post):
        """Test medical text analysis"""
        # Mock the API response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'entities': ['patient', 'doctor'],
            'medications': ['aspirin'],
            'diagnoses': ['hypertension'],
            'procedures': ['blood test']
        }
        mock_post.return_value = mock_response
        
        # Test data
        text = "Patient has hypertension and takes aspirin daily."
        
        # Call the method
        result = self.ai_service.analyze_medical_text(text)
        
        # Assertions
        self.assertTrue(result['success'])
        self.assertIn('medications', result)
        self.assertIn('diagnoses', result)


class AlibabaCloudAPITest(APITestCase):
    """Test cases for API endpoints"""
    
    def setUp(self):
        # Create a test user
        self.user = get_user_model().objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.user.firebase_uid = 'test-firebase-uid'
        self.user.save()
    
    @patch('alibaba_cloud.views.AlibabaOSSService')
    def test_upload_document_endpoint(self, mock_oss_service):
        """Test document upload endpoint"""
        # Mock the OSS service
        mock_service_instance = MagicMock()
        mock_oss_service.return_value = mock_service_instance
        mock_service_instance.upload_medical_document.return_value = {
            'oss_path': 'test/path',
            'file_name': 'test.pdf',
            'presigned_url': 'https://test-url.com'
        }
        
        # Mock authentication
        self.client.force_authenticate(user=self.user)
        
        # Create test file
        from django.core.files.uploadedfile import SimpleUploadedFile
        test_file = SimpleUploadedFile(
            "test.pdf",
            b"file content",
            content_type="application/pdf"
        )
        
        # Make request
        response = self.client.post('/api/alibaba/upload/', {
            'file': test_file,
            'patient_id': '123',
            'document_type': 'Lab Report'
        })
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('oss_path', response.data)
    
    def test_upload_document_unauthorized(self):
        """Test upload endpoint without authentication"""
        response = self.client.post('/api/alibaba/upload/', {})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
