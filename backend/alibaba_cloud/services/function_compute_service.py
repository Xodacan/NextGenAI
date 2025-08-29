import requests
import json
import base64
from typing import Dict, List, Optional
from .config import FUNCTION_COMPUTE_CONFIG, ALIBABA_CLOUD_CONFIG


class AlibabaFunctionComputeService:
    """Alibaba Cloud Function Compute service for Word document generation"""
    
    def __init__(self):
        self.access_key_id = ALIBABA_CLOUD_CONFIG['ACCESS_KEY_ID']
        self.access_key_secret = ALIBABA_CLOUD_CONFIG['ACCESS_KEY_SECRET']
        self.endpoint = FUNCTION_COMPUTE_CONFIG['ENDPOINT']
        self.service_name = FUNCTION_COMPUTE_CONFIG['SERVICE_NAME']
        self.function_name = FUNCTION_COMPUTE_CONFIG['FUNCTION_NAME']
        self.region = FUNCTION_COMPUTE_CONFIG['REGION']
    
    def generate_medical_report(self, patient_data: Dict, document_type: str = 'comprehensive') -> Dict:
        """
        Generate a medical report in Word format using Function Compute
        
        Args:
            patient_data: Patient information and medical data
            document_type: Type of report (comprehensive, discharge, lab_summary, etc.)
            
        Returns:
            Dict containing the generated document information
        """
        try:
            payload = {
                "patient_data": patient_data,
                "document_type": document_type,
                "template": "medical_report_template",
                "format": "docx",
                "include_charts": True,
                "include_tables": True
            }
            
            response = requests.post(
                f"{self.endpoint}/services/{self.service_name}/functions/{self.function_name}/invoke",
                json=payload,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {self.access_key_id}',
                    'X-Fc-Region': self.region
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    'success': True,
                    'document_url': result.get('document_url', ''),
                    'document_id': result.get('document_id', ''),
                    'file_size': result.get('file_size', 0),
                    'generation_time': result.get('generation_time', 0)
                }
            else:
                return {
                    'success': False,
                    'error': f'Document generation error: {response.status_code}'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Document generation error: {str(e)}'
            }
    
    def generate_discharge_summary(self, patient_id: str, admission_data: Dict, treatment_data: Dict) -> Dict:
        """
        Generate a discharge summary document
        
        Args:
            patient_id: Patient identifier
            admission_data: Admission information
            treatment_data: Treatment and progress information
            
        Returns:
            Dict containing the generated discharge summary
        """
        try:
            payload = {
                "function_type": "discharge_summary",
                "patient_id": patient_id,
                "admission_data": admission_data,
                "treatment_data": treatment_data,
                "template": "discharge_summary_template",
                "include_medications": True,
                "include_follow_up": True
            }
            
            response = requests.post(
                f"{self.endpoint}/services/{self.service_name}/functions/{self.function_name}/invoke",
                json=payload,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {self.access_key_id}',
                    'X-Fc-Region': self.region
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    'success': True,
                    'document_url': result.get('document_url', ''),
                    'document_id': result.get('document_id', ''),
                    'summary_text': result.get('summary_text', ''),
                    'medications_list': result.get('medications_list', []),
                    'follow_up_instructions': result.get('follow_up_instructions', '')
                }
            else:
                return {
                    'success': False,
                    'error': f'Discharge summary generation error: {response.status_code}'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Discharge summary generation error: {str(e)}'
            }
    
    def generate_lab_report_summary(self, lab_results: List[Dict], patient_info: Dict) -> Dict:
        """
        Generate a lab report summary document
        
        Args:
            lab_results: List of lab test results
            patient_info: Patient information
            
        Returns:
            Dict containing the generated lab report summary
        """
        try:
            payload = {
                "function_type": "lab_report_summary",
                "lab_results": lab_results,
                "patient_info": patient_info,
                "template": "lab_report_template",
                "include_reference_ranges": True,
                "include_abnormal_flags": True,
                "include_trends": True
            }
            
            response = requests.post(
                f"{self.endpoint}/services/{self.service_name}/functions/{self.function_name}/invoke",
                json=payload,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {self.access_key_id}',
                    'X-Fc-Region': self.region
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    'success': True,
                    'document_url': result.get('document_url', ''),
                    'document_id': result.get('document_id', ''),
                    'summary_text': result.get('summary_text', ''),
                    'abnormal_results': result.get('abnormal_results', []),
                    'trend_analysis': result.get('trend_analysis', {})
                }
            else:
                return {
                    'success': False,
                    'error': f'Lab report generation error: {response.status_code}'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Lab report generation error: {str(e)}'
            }
    
    def generate_consultation_note(self, consultation_data: Dict, doctor_notes: str) -> Dict:
        """
        Generate a consultation note document
        
        Args:
            consultation_data: Consultation information
            doctor_notes: Doctor's notes and observations
            
        Returns:
            Dict containing the generated consultation note
        """
        try:
            payload = {
                "function_type": "consultation_note",
                "consultation_data": consultation_data,
                "doctor_notes": doctor_notes,
                "template": "consultation_note_template",
                "include_assessment": True,
                "include_plan": True
            }
            
            response = requests.post(
                f"{self.endpoint}/services/{self.service_name}/functions/{self.function_name}/invoke",
                json=payload,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {self.access_key_id}',
                    'X-Fc-Region': self.region
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    'success': True,
                    'document_url': result.get('document_url', ''),
                    'document_id': result.get('document_id', ''),
                    'assessment': result.get('assessment', ''),
                    'treatment_plan': result.get('treatment_plan', ''),
                    'follow_up_date': result.get('follow_up_date', '')
                }
            else:
                return {
                    'success': False,
                    'error': f'Consultation note generation error: {response.status_code}'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Consultation note generation error: {str(e)}'
            }
    
    def get_document_status(self, document_id: str) -> Dict:
        """
        Check the status of a document generation request
        
        Args:
            document_id: Document identifier
            
        Returns:
            Dict containing document status
        """
        try:
            response = requests.get(
                f"{self.endpoint}/services/{self.service_name}/functions/{self.function_name}/documents/{document_id}/status",
                headers={
                    'Authorization': f'Bearer {self.access_key_id}',
                    'X-Fc-Region': self.region
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    'success': True,
                    'status': result.get('status', ''),
                    'progress': result.get('progress', 0),
                    'estimated_completion': result.get('estimated_completion', ''),
                    'document_url': result.get('document_url', '')
                }
            else:
                return {
                    'success': False,
                    'error': f'Status check error: {response.status_code}'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Status check error: {str(e)}'
            }
