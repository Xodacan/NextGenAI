import os
import json
import logging
from typing import List, Dict, Any, Optional
from django.conf import settings
from django.core.files.storage import default_storage
from django.utils import timezone
import PyPDF2
import io

logger = logging.getLogger(__name__)

class DocumentProcessingService:
    """Service for processing medical documents to extract text content for AI analysis."""
    
    @staticmethod
    def extract_text_from_file(file_path: str, file_name: str) -> Optional[str]:
        """
        Extract text content from various file types.
        
        Args:
            file_path: Full path to the file
            file_name: Name of the file with extension
            
        Returns:
            Extracted text content or None if extraction fails
        """
        try:
            file_extension = file_name.lower().split('.')[-1]
            
            if file_extension == 'pdf':
                return DocumentProcessingService._extract_pdf_text(file_path)
            elif file_extension in ['txt', 'md']:
                return DocumentProcessingService._extract_text_file(file_path)
            elif file_extension in ['doc', 'docx']:
                # TODO: Add support for Word documents when python-docx is added
                logger.warning(f"Word document support not yet implemented for {file_name}")
                return None
            else:
                logger.warning(f"Unsupported file type: {file_extension} for {file_name}")
                return None
                
        except Exception as e:
            logger.error(f"Error extracting text from {file_name}: {str(e)}")
            return None
    
    @staticmethod
    def _extract_pdf_text(file_path: str) -> Optional[str]:
        """Extract text from PDF files."""
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text = ""
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
                return text.strip()
        except Exception as e:
            logger.error(f"Error extracting PDF text: {str(e)}")
            return None
    
    @staticmethod
    def _extract_text_file(file_path: str) -> Optional[str]:
        """Extract text from plain text files."""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                return file.read().strip()
        except Exception as e:
            logger.error(f"Error extracting text file content: {str(e)}")
            return None
    
    @staticmethod
    def process_patient_documents(patient_id: str, documents: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Process all documents for a patient and extract text content.
        
        Args:
            patient_id: ID of the patient
            documents: List of document objects from the patient model
            
        Returns:
            Dictionary containing processed document data ready for AI analysis
        """
        processed_documents = []
        total_documents = len(documents)
        successfully_processed = 0
        
        for doc in documents:
            try:
                # Check if document has a file URL
                if 'url' in doc and doc['url']:
                    # Extract file path from URL
                    file_url = doc['url']
                    if file_url.startswith(settings.MEDIA_URL):
                        file_path = file_url.replace(settings.MEDIA_URL, '')
                        full_path = os.path.join(settings.MEDIA_ROOT, file_path)
                        
                        if os.path.exists(full_path):
                            # Extract text content
                            text_content = DocumentProcessingService.extract_text_from_file(
                                full_path, doc.get('fileName', 'unknown')
                            )
                            
                            if text_content:
                                processed_doc = {
                                    'id': doc.get('id'),
                                    'fileName': doc.get('fileName', ''),
                                    'documentType': doc.get('documentType', ''),
                                    'uploadTimestamp': doc.get('uploadTimestamp', ''),
                                    'practitionerId': doc.get('practitionerId', ''),
                                    'extractedText': text_content,
                                    'textLength': len(text_content),
                                    'processingStatus': 'success'
                                }
                                processed_documents.append(processed_doc)
                                successfully_processed += 1
                            else:
                                processed_doc = {
                                    'id': doc.get('id'),
                                    'fileName': doc.get('fileName', ''),
                                    'documentType': doc.get('documentType', ''),
                                    'uploadTimestamp': doc.get('uploadTimestamp', ''),
                                    'practitionerId': doc.get('practitionerId', ''),
                                    'extractedText': '',
                                    'textLength': 0,
                                    'processingStatus': 'failed',
                                    'error': 'Text extraction failed'
                                }
                                processed_documents.append(processed_doc)
                        else:
                            logger.warning(f"File not found: {full_path}")
                            processed_doc = {
                                'id': doc.get('id'),
                                'fileName': doc.get('fileName', ''),
                                'documentType': doc.get('documentType', ''),
                                'uploadTimestamp': doc.get('uploadTimestamp', ''),
                                'practitionerId': doc.get('practitionerId', ''),
                                'extractedText': '',
                                'textLength': 0,
                                'processingStatus': 'failed',
                                'error': 'File not found'
                            }
                            processed_documents.append(processed_doc)
                else:
                    # Document without file (e.g., manually entered notes)
                    processed_doc = {
                        'id': doc.get('id'),
                        'fileName': doc.get('fileName', ''),
                        'documentType': doc.get('documentType', ''),
                        'uploadTimestamp': doc.get('uploadTimestamp', ''),
                        'practitionerId': doc.get('practitionerId', ''),
                        'extractedText': doc.get('summary', ''),
                        'textLength': len(doc.get('summary', '')),
                        'processingStatus': 'success'
                    }
                    processed_documents.append(processed_doc)
                    successfully_processed += 1
                    
            except Exception as e:
                logger.error(f"Error processing document {doc.get('id', 'unknown')}: {str(e)}")
                processed_doc = {
                    'id': doc.get('id'),
                    'fileName': doc.get('fileName', ''),
                    'documentType': doc.get('documentType', ''),
                    'uploadTimestamp': doc.get('uploadTimestamp', ''),
                    'practitionerId': doc.get('practitionerId', ''),
                    'extractedText': '',
                    'textLength': 0,
                    'processingStatus': 'failed',
                    'error': str(e)
                }
                processed_documents.append(processed_doc)
        
        # Prepare summary for AI processing
        summary_data = {
            'patientId': patient_id,
            'totalDocuments': total_documents,
            'successfullyProcessed': successfully_processed,
            'processingTimestamp': str(timezone.now()),
            'documents': processed_documents,
            'combinedText': DocumentProcessingService._combine_document_texts(processed_documents),
            'documentTypes': list(set([doc.get('documentType', '') for doc in processed_documents if doc.get('documentType')])),
            'totalTextLength': sum([doc.get('textLength', 0) for doc in processed_documents])
        }
        
        return summary_data
    
    @staticmethod
    def _combine_document_texts(processed_documents: List[Dict[str, Any]]) -> str:
        """
        Combine all extracted text from documents into a single string for AI processing.
        
        Args:
            processed_documents: List of processed document objects
            
        Returns:
            Combined text content with document separators
        """
        combined_text = ""
        
        for doc in processed_documents:
            if doc.get('processingStatus') == 'success' and doc.get('extractedText'):
                combined_text += f"\n\n--- DOCUMENT: {doc.get('fileName', 'Unknown')} ---\n"
                combined_text += f"Type: {doc.get('documentType', 'Unknown')}\n"
                combined_text += f"Uploaded: {doc.get('uploadTimestamp', 'Unknown')}\n"
                combined_text += f"Content:\n{doc.get('extractedText')}\n"
                combined_text += "--- END DOCUMENT ---\n"
        
        return combined_text.strip()
    
    @staticmethod
    def prepare_for_ai_analysis(processed_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Prepare processed document data for AI analysis.
        This function will be extended to integrate with Ollama later.
        
        Args:
            processed_data: Output from process_patient_documents
            
        Returns:
            Data formatted for AI processing
        """
        # Get the hardcoded template for the AI agent
        template_data = TemplateProcessingService.get_template_for_ai_agent()
        
        # Extract key information that the AI agent should look for
        extracted_info = {
            'patient_identifiers': [],
            'diagnostic_tests': [],
            'procedures': [],
            'medications': [],
            'vital_signs': [],
            'assessments': []
        }
        
        # Analyze documents for key information
        for doc in processed_data['documents']:
            if doc['processingStatus'] == 'success' and doc['extractedText']:
                text = doc['extractedText'].lower()
                
                # Look for patient identifiers
                if any(word in text for word in ['name', 'patient', 'dob', 'birth', 'age', 'gender']):
                    extracted_info['patient_identifiers'].append({
                        'document': doc['fileName'],
                        'content': doc['extractedText'][:200] + '...' if len(doc['extractedText']) > 200 else doc['extractedText']
                    })
                
                # Look for diagnostic tests
                if any(word in text for word in ['test', 'lab', 'blood', 'urine', 'x-ray', 'ct', 'mri', 'scan', 'result']):
                    extracted_info['diagnostic_tests'].append({
                        'document': doc['fileName'],
                        'content': doc['extractedText'][:200] + '...' if len(doc['extractedText']) > 200 else doc['extractedText']
                    })
                
                # Look for procedures
                if any(word in text for word in ['procedure', 'surgery', 'operation', 'treatment', 'therapy']):
                    extracted_info['procedures'].append({
                        'document': doc['fileName'],
                        'content': doc['extractedText'][:200] + '...' if len(doc['extractedText']) > 200 else doc['extractedText']
                    })
                
                # Look for medications
                if any(word in text for word in ['medication', 'drug', 'prescription', 'dose', 'mg', 'ml']):
                    extracted_info['medications'].append({
                        'document': doc['fileName'],
                        'content': doc['extractedText'][:200] + '...' if len(doc['extractedText']) > 200 else doc['extractedText']
                    })
        
        ai_ready_data = {
            'patientId': processed_data['patientId'],
            'documentCount': processed_data['totalDocuments'],
            'totalTextLength': processed_data['totalTextLength'],
            'documentTypes': processed_data['documentTypes'],
            'combinedText': processed_data['combinedText'],
            'individualDocuments': [
                {
                    'fileName': doc['fileName'],
                    'documentType': doc['documentType'],
                    'textContent': doc['extractedText'],
                    'textLength': doc['textLength']
                }
                for doc in processed_data['documents']
                if doc['processingStatus'] == 'success'
            ],
            'processingMetadata': {
                'timestamp': processed_data['processingTimestamp'],
                'successRate': f"{processed_data['successfullyProcessed']}/{processed_data['totalDocuments']}",
                'averageDocumentLength': processed_data['totalTextLength'] / max(processed_data['totalDocuments'], 1)
            },
            'extractedInformation': extracted_info,
            'dischargeSummaryTemplate': {
                'templateId': template_data['id'],
                'templateName': template_data['name'],
                'templateContent': template_data['template_content'],
                'placeholderVariables': template_data['placeholder_variables'],
                'templateType': template_data['template_type'],
                'source': template_data['source']
            }
        }
        
        return ai_ready_data


class TemplateProcessingService:
    """Service for accessing hardcoded discharge summary templates for the AI agent."""
    
    @staticmethod
    def get_hardcoded_template_path() -> str:
        """
        Get the path to the hardcoded discharge summary template.
        
        Returns:
            Path to the template file
        """
        import os
        # Get the backend directory path
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        template_path = os.path.join(backend_dir, 'templates', 'discharge_summary_template.pdf')
        return template_path
    
    @staticmethod
    def get_hardcoded_template_content() -> Optional[str]:
        """
        Get the content of the hardcoded discharge summary template.
        
        Returns:
            Extracted text content from the template PDF
        """
        try:
            template_path = TemplateProcessingService.get_hardcoded_template_path()
            
            if not os.path.exists(template_path):
                logger.warning(f"Hardcoded template not found at: {template_path}")
                return None
            
            # Extract text from the PDF template
            text_content = DocumentProcessingService.extract_text_from_file(
                template_path, 
                'discharge_summary_template.pdf'
            )
            
            if text_content:
                logger.info(f"Successfully loaded hardcoded template from: {template_path}")
                return text_content
            else:
                logger.error(f"Failed to extract text from hardcoded template: {template_path}")
                return None
                
        except Exception as e:
            logger.error(f"Error loading hardcoded template: {str(e)}")
            return None
    
    @staticmethod
    def get_template_for_ai_agent() -> Dict[str, Any]:
        """
        Get the hardcoded template data for the AI agent to use.
        
        Returns:
            Template data formatted for AI processing
        """
        template_content = TemplateProcessingService.get_hardcoded_template_content()
        
        if template_content:
            # Clean up the template content to replace confusing placeholders
            template_content = TemplateProcessingService._clean_template_content(template_content)
        
        if not template_content:
            # Fallback to a basic template if file not found
            template_content = """DISCHARGE SUMMARY

PATIENT INFORMATION:
Patient Name: [EXTRACT FROM DOCUMENTS]
Date of Birth: [EXTRACT FROM DOCUMENTS]
Admission Date: [EXTRACT FROM DOCUMENTS]
Room/Bed: [EXTRACT FROM DOCUMENTS]
Discharge Date: [CURRENT DATE]

PRIMARY DIAGNOSIS:
[EXTRACT PRIMARY DIAGNOSIS FROM MEDICAL DOCUMENTS]

SECONDARY DIAGNOSES:
[EXTRACT SECONDARY DIAGNOSES FROM MEDICAL DOCUMENTS]

PROCEDURES PERFORMED:
[LIST ALL PROCEDURES PERFORMED FROM MEDICAL DOCUMENTS]

HOSPITAL COURSE:
[DESCRIBE HOSPITAL STAY BASED ON MEDICAL DOCUMENTS]

DIAGNOSTIC TESTS:
[LIST ALL TESTS PERFORMED AND THEIR RESULTS FROM MEDICAL DOCUMENTS]

MEDICATIONS ON DISCHARGE:
[LIST ALL MEDICATIONS PRESCRIBED FROM MEDICAL DOCUMENTS]

DISCHARGE INSTRUCTIONS:
[EXTRACT DISCHARGE INSTRUCTIONS FROM MEDICAL DOCUMENTS]

FOLLOW-UP PLANS:
[EXTRACT FOLLOW-UP PLANS FROM MEDICAL DOCUMENTS]

CONDITION AT DISCHARGE:
[DESCRIBE PATIENT'S CONDITION AT DISCHARGE FROM MEDICAL DOCUMENTS]

DISCHARGING PHYSICIAN:
[EXTRACT PHYSICIAN NAME FROM MEDICAL DOCUMENTS]

IMPORTANT: Replace all bracketed text with actual information extracted from the patient's medical documents. If information is not available, state "Not documented"."""
        
        return {
            'id': 'hardcoded_template',
            'name': 'Hardcoded Discharge Summary Template',
            'description': 'Default template stored in project files',
            'template_type': 'General',
            'template_content': template_content,
            'is_default': True,
            'version': 1,
            'placeholder_variables': TemplateProcessingService._extract_placeholders(template_content),
            'has_file': True,
            'file_name': 'discharge_summary_template.pdf',
            'source': 'hardcoded_file'
        }
    
    @staticmethod
    def _extract_placeholders(template_content: str) -> List[str]:
        """Extract placeholder variables from template content."""
        import re
        placeholders = re.findall(r'\{([^}]+)\}', template_content)
        return list(set(placeholders))

    @staticmethod
    def _clean_template_content(template_content: str) -> str:
        """
        Clean up template content to replace confusing placeholders with clearer instructions.
        
        Args:
            template_content: Raw template content
            
        Returns:
            Cleaned template content with clear instructions
        """
        import re
        
        # Replace common confusing placeholders with clear instructions
        replacements = {
            r'\[Patient Name\]': '[EXTRACT PATIENT NAME FROM DOCUMENTS]',
            r'\[patient_name\]': '[EXTRACT PATIENT NAME FROM DOCUMENTS]',
            r'\[Diagnostic test\]': '[LIST ALL DIAGNOSTIC TESTS PERFORMED FROM DOCUMENTS]',
            r'\[diagnostic_test\]': '[LIST ALL DIAGNOSTIC TESTS PERFORMED FROM DOCUMENTS]',
            r'\[Any additional treatments\]': '[LIST ALL TREATMENTS GIVEN FROM DOCUMENTS]',
            r'\[any_additional_treatments\]': '[LIST ALL TREATMENTS GIVEN FROM DOCUMENTS]',
            r'\{patient_name\}': '[EXTRACT PATIENT NAME FROM DOCUMENTS]',
            r'\{date_of_birth\}': '[EXTRACT DATE OF BIRTH FROM DOCUMENTS]',
            r'\{admission_date\}': '[EXTRACT ADMISSION DATE FROM DOCUMENTS]',
            r'\{room_number\}': '[EXTRACT ROOM/BED NUMBER FROM DOCUMENTS]',
            r'\{occupant_type\}': '[EXTRACT OCCUPANT TYPE (Room/Bed/ER Patient) FROM DOCUMENTS]',
            r'\{occupant_value\}': '[EXTRACT ROOM/BED NUMBER OR ER DESIGNATION FROM DOCUMENTS]',
            r'\{current_date\}': '[CURRENT DATE]',
            r'\{primary_diagnosis\}': '[EXTRACT PRIMARY DIAGNOSIS FROM DOCUMENTS]',
            r'\{secondary_diagnoses\}': '[EXTRACT SECONDARY DIAGNOSES FROM DOCUMENTS]',
            r'\{procedures\}': '[LIST ALL PROCEDURES PERFORMED FROM DOCUMENTS]',
            r'\{hospital_course\}': '[DESCRIBE HOSPITAL STAY FROM DOCUMENTS]',
            r'\{medications\}': '[LIST ALL MEDICATIONS FROM DOCUMENTS]',
            r'\{discharge_instructions\}': '[EXTRACT DISCHARGE INSTRUCTIONS FROM DOCUMENTS]',
            r'\{follow_up\}': '[EXTRACT FOLLOW-UP PLANS FROM DOCUMENTS]',
            r'\{discharge_condition\}': '[DESCRIBE CONDITION AT DISCHARGE FROM DOCUMENTS]',
            r'\{doctor_name\}': '[EXTRACT PHYSICIAN NAME FROM DOCUMENTS]'
        }
        
        cleaned_content = template_content
        for pattern, replacement in replacements.items():
            cleaned_content = re.sub(pattern, replacement, cleaned_content, flags=re.IGNORECASE)
        
        # Add clear instructions at the top if not present
        if 'IMPORTANT:' not in cleaned_content:
            cleaned_content = """IMPORTANT INSTRUCTIONS:
Replace all bracketed text with actual information extracted from the patient's medical documents. 
If information is not available, state "Not documented".

""" + cleaned_content
        
        return cleaned_content
