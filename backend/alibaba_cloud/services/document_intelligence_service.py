import requests
import json
import base64
from typing import Dict, List, Optional
from .config import DOCUMENT_INTELLIGENCE_CONFIG, ALIBABA_CLOUD_CONFIG


class AlibabaDocumentIntelligenceService:
    """Alibaba Cloud Document Intelligence service for medical document analysis"""
    
    def __init__(self):
        self.access_key_id = ALIBABA_CLOUD_CONFIG['ACCESS_KEY_ID']
        self.access_key_secret = ALIBABA_CLOUD_CONFIG['ACCESS_KEY_SECRET']
        self.endpoint = DOCUMENT_INTELLIGENCE_CONFIG['ENDPOINT']
        self.project_name = DOCUMENT_INTELLIGENCE_CONFIG['PROJECT_NAME']
        self.api_version = DOCUMENT_INTELLIGENCE_CONFIG['API_VERSION']
    
    def analyze_medical_document(self, document_content: bytes, document_type: str = 'medical') -> Dict:
        """
        Analyze medical documents using Document Intelligence API
        
        Args:
            document_content: Document content as bytes
            document_type: Type of document (medical, lab_report, prescription, etc.)
            
        Returns:
            Dict containing analysis results
        """
        try:
            # Encode document to base64
            document_base64 = base64.b64encode(document_content).decode('utf-8')
            
            # Prepare request payload
            payload = {
                "project": self.project_name,
                "document": {
                    "content": document_base64,
                    "type": document_type
                },
                "features": [
                    "text_extraction",
                    "entity_recognition",
                    "key_value_extraction",
                    "table_extraction"
                ]
            }
            
            # Make API call
            response = requests.post(
                f"{self.endpoint}/v{self.api_version}/analyze",
                json=payload,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {self.access_key_id}',
                    'X-Alibaba-Cloud-Region': ALIBABA_CLOUD_CONFIG['REGION_ID']
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    'success': True,
                    'extracted_text': result.get('text', ''),
                    'entities': result.get('entities', []),
                    'key_value_pairs': result.get('key_value_pairs', {}),
                    'tables': result.get('tables', []),
                    'confidence': result.get('confidence', 0.0)
                }
            else:
                return {
                    'success': False,
                    'error': f'Document Intelligence API error: {response.status_code}'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Document analysis error: {str(e)}'
            }
    
    def extract_medical_entities(self, text: str) -> Dict:
        """
        Extract medical entities from text using NLP
        
        Args:
            text: Medical text to analyze
            
        Returns:
            Dict containing extracted medical entities
        """
        try:
            payload = {
                "project": self.project_name,
                "text": text,
                "entity_types": [
                    "medication",
                    "diagnosis",
                    "procedure",
                    "symptom",
                    "vital_sign",
                    "lab_result"
                ]
            }
            
            response = requests.post(
                f"{self.endpoint}/v{self.api_version}/extract_entities",
                json=payload,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {self.access_key_id}',
                    'X-Alibaba-Cloud-Region': ALIBABA_CLOUD_CONFIG['REGION_ID']
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    'success': True,
                    'medications': result.get('medications', []),
                    'diagnoses': result.get('diagnoses', []),
                    'procedures': result.get('procedures', []),
                    'symptoms': result.get('symptoms', []),
                    'vital_signs': result.get('vital_signs', []),
                    'lab_results': result.get('lab_results', [])
                }
            else:
                return {
                    'success': False,
                    'error': f'Entity extraction error: {response.status_code}'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Entity extraction error: {str(e)}'
            }
    
    def generate_medical_summary(self, documents: List[str], summary_type: str = 'comprehensive') -> Dict:
        """
        Generate medical summary from multiple documents
        
        Args:
            documents: List of medical document texts
            summary_type: Type of summary (comprehensive, brief, structured)
            
        Returns:
            Dict containing generated summary
        """
        try:
            combined_text = "\n\n".join(documents)
            
            payload = {
                "project": self.project_name,
                "text": combined_text,
                "summary_type": summary_type,
                "max_length": 1000,
                "include_key_points": True,
                "include_medications": True,
                "include_diagnoses": True
            }
            
            response = requests.post(
                f"{self.endpoint}/v{self.api_version}/summarize",
                json=payload,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {self.access_key_id}',
                    'X-Alibaba-Cloud-Region': ALIBABA_CLOUD_CONFIG['REGION_ID']
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    'success': True,
                    'summary': result.get('summary', ''),
                    'key_points': result.get('key_points', []),
                    'medications': result.get('medications', []),
                    'diagnoses': result.get('diagnoses', []),
                    'confidence': result.get('confidence', 0.0)
                }
            else:
                return {
                    'success': False,
                    'error': f'Summary generation error: {response.status_code}'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Summary generation error: {str(e)}'
            }
    
    def classify_document_type(self, document_content: bytes) -> Dict:
        """
        Classify the type of medical document
        
        Args:
            document_content: Document content as bytes
            
        Returns:
            Dict containing document classification
        """
        try:
            document_base64 = base64.b64encode(document_content).decode('utf-8')
            
            payload = {
                "project": self.project_name,
                "document": {
                    "content": document_base64
                },
                "classification_types": [
                    "lab_report",
                    "prescription",
                    "medical_record",
                    "discharge_summary",
                    "imaging_report",
                    "consultation_note"
                ]
            }
            
            response = requests.post(
                f"{self.endpoint}/v{self.api_version}/classify",
                json=payload,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {self.access_key_id}',
                    'X-Alibaba-Cloud-Region': ALIBABA_CLOUD_CONFIG['REGION_ID']
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    'success': True,
                    'document_type': result.get('document_type', ''),
                    'confidence': result.get('confidence', 0.0),
                    'alternative_types': result.get('alternative_types', [])
                }
            else:
                return {
                    'success': False,
                    'error': f'Document classification error: {response.status_code}'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Document classification error: {str(e)}'
            }
