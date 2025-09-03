from langchain_ollama import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate
import os
from typing import Dict, Any
import logging
import time
import threading

logger = logging.getLogger(__name__)

def generate_discharge_summary_from_object(
    patient_record: dict,
    template_text: str = "",
    model_name: str = "mistral",
    num_predict: int = 1024,
    temperature: float = 0.3,
    top_p: float = 0.9,
) -> str:
    """
    Generate a discharge summary from a patient record object (e.g., fetched from SQL).

    The function is intentionally minimal and import-safe. It creates the model on demand
    and returns a plain string with the generated summary.

    Expected input shape (flexible, best-effort extraction):
    - patient_record["documents"] can be:
      - a list of strings
      - a list of dicts with any of the keys: "content", "text", "body", "note"
    - If no "documents" list is provided, the function will try to stringify common
      note fields on the root object: "history", "assessment", "plan", "medications",
      "allergies", "diagnoses", "labs", "imaging", "vitals", "discharge_instructions".

    Args:
        patient_record: dict representing a patient's medical data.
        question: instruction or question guiding the summary (e.g. "Generate a discharge summary").
        template_text: discharge summary template text. If empty, the agent will still summarize.
        model_name, num_predict, temperature, top_p: LLM generation parameters.

    Returns:
        str: the generated discharge summary.
    """

    def _to_text(record: dict) -> str:
        # Prefer an explicit documents list
        documents = record.get("documents")
        collected = []

        if isinstance(documents, list):
            for idx, item in enumerate(documents):
                if isinstance(item, str):
                    text = item.strip()
                    if text:
                        collected.append(f"===== Document {idx + 1} =====\n{text}")
                elif isinstance(item, dict):
                    # Try common text-bearing keys
                    for key in ("content", "text", "body", "note", "title"):
                        val = item.get(key)
                        if isinstance(val, str) and val.strip():
                            doc_title = item.get('title', f'Document {idx + 1}')
                            doc_type = item.get('type', 'Unknown Type')
                            collected.append(f"===== {doc_title} ({doc_type}) =====\n{val.strip()}")
                            break

        # If nothing was collected, fall back to common medical fields on the root
        if not collected and isinstance(record, dict):
            common_fields = [
                "history", "presenting_complaint", "assessment", "plan", "medications",
                "allergies", "diagnoses", "labs", "imaging", "vitals", "procedures",
                "progress_notes", "discharge_instructions",
            ]
            for field in common_fields:
                val = record.get(field)
                if isinstance(val, str) and val.strip():
                    collected.append(f"===== {field.replace('_', ' ').title()} =====\n{val.strip()}")

        return "\n\n".join(collected).strip()

    documents_text = _to_text(patient_record)
    if not documents_text:
        return "No medical document content provided."

    system_template = """
Generate a discharge summary using the template structure below. Extract real patient information from the medical documents and replace all placeholder text with actual data. If information is missing, write "Not documented".

Template:
{discharge_template}

Medical documents:
{documents}

Generate the discharge summary now:
"""

    prompt = ChatPromptTemplate.from_template(system_template)
    
    try:
        print(f"🤖 Creating Ollama LLM with model: {model_name}")
        model = OllamaLLM(
            model=model_name,
            base_url="http://localhost:11434",  # Explicitly set local Ollama URL
            num_predict=num_predict,
            temperature=temperature,
            top_p=top_p,
            timeout=300,  # 5 minute timeout for Ollama requests
        )
        print(f"✅ Ollama LLM created successfully")
        
        chain = prompt | model
        print(f"✅ Chain created successfully")

        print(f"📝 Invoking chain with documents length: {len(documents_text)}")
        result = chain.invoke({
            "documents": documents_text,
            "discharge_template": template_text or "",
        })
        print(f"✅ Chain invocation successful, result type: {type(result)}")
        return str(result)
        
    except Exception as exc:
        print(f"❌ Error in Ollama chain: {exc}")
        import traceback
        traceback.print_exc()
        return f"Error generating summary: {exc}"


class OllamaService:
    """Service for integrating with Ollama for medical summary generation."""
    
    @staticmethod
    def check_ollama_health() -> Dict[str, Any]:
        """
        Check if Ollama service is running and accessible.
        
        Returns:
            Dictionary with health status information
        """
        try:
            import requests
            
            # Try to connect to Ollama API
            response = requests.get("http://localhost:11434/api/tags", timeout=5)
            
            if response.status_code == 200:
                models = response.json().get('models', [])
                return {
                    'status': 'healthy',
                    'message': 'Ollama service is running',
                    'available_models': [model.get('name', 'unknown') for model in models],
                    'model_count': len(models)
                }
            else:
                return {
                    'status': 'unhealthy',
                    'message': f'Ollama API returned status {response.status_code}',
                    'available_models': [],
                    'model_count': 0
                }
                
        except requests.exceptions.ConnectionError:
            return {
                'status': 'unhealthy',
                'message': 'Cannot connect to Ollama service at localhost:11434',
                'available_models': [],
                'model_count': 0
            }
        except requests.exceptions.Timeout:
            return {
                'status': 'unhealthy',
                'message': 'Ollama service connection timed out',
                'available_models': [],
                'model_count': 0
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'message': f'Error checking Ollama health: {str(e)}',
                'available_models': [],
                'model_count': 0
            }
    
    @staticmethod
    def generate_patient_summary_with_sources(patient_data: Dict[str, Any], template_content: str) -> Dict[str, Any]:
        """
        Generate a discharge summary for a patient using Ollama with source tracking.
        
        Args:
            patient_data: Patient data including documents
            template_content: Discharge summary template content
            
        Returns:
            Dictionary containing:
            - summary: Generated discharge summary text
            - source_usage: Document type usage statistics
            - highlighted_summary: Summary with source highlights
        """
        try:
            # Prepare patient record for Ollama with better context
            documents = []
            for doc in patient_data.get("individualDocuments", []):
                if doc.get("textContent"):
                    documents.append({
                        "content": doc.get("textContent"),
                        "title": doc.get("fileName", "Unknown Document"),
                        "type": doc.get("documentType", "Unknown")
                    })
            
            # Extract patient demographics and medical information
            patient_info = {
                "documents": documents,
                "patient_id": patient_data.get("patientId", ""),
                "patient_name": patient_data.get("patientName", ""),
                "patient_dob": patient_data.get("patientDOB", ""),
                "patient_gender": patient_data.get("patientGender", ""),
                "admission_date": patient_data.get("admissionDate", ""),
                "room_number": patient_data.get("roomNumber", ""),
                "document_count": patient_data.get("documentCount", 0),
                "document_types": patient_data.get("documentTypes", []),
                "total_text_length": patient_data.get("totalTextLength", 0),
                "processing_metadata": patient_data.get("processingMetadata", {})
            }
            
            # Get current date for discharge
            from datetime import datetime
            current_date = datetime.now().strftime("%d/%m/%Y")
            
            # Debug: Log the template content being passed
            print(f"🔍 Template content length: {len(template_content)}")
            print(f"🔍 Template content preview: {template_content[:500]}...")
            
            # Generate summary using Ollama with original template
            # Try different model parameters for better source tracking compliance
            print(f"🕐 Starting Ollama generation with timeout protection...")
            start_time = time.time()
            
            try:
                summary = generate_discharge_summary_from_object(
                    patient_record=patient_info,
                    template_text=template_content,  # Use original template, not enhanced
                    model_name="llama3.2",   # Use available Llama model
                    num_predict=4096,      # Increased for longer summaries
                    temperature=0.1,       # Very low temperature for more focused output
                    top_p=0.8
                )
                
                elapsed_time = time.time() - start_time
                print(f"✅ Ollama generation completed in {elapsed_time:.2f} seconds")
                
            except Exception as e:
                elapsed_time = time.time() - start_time
                print(f"❌ Ollama generation failed after {elapsed_time:.2f} seconds: {e}")
                raise
            
            # Process the summary to extract source information
            source_usage = {}
            source_attributions = {}  # Store actual document content for each source
            highlighted_summary = summary
            clean_summary = summary
            
            # Debug: Log the raw summary to see what AI generated
            print(f"🔍 Raw AI Summary (first 500 chars): {summary[:500]}...")
            
            # Check if AI understood the source tracking instruction
            if "SOURCE_TRACKING_ENABLED: YES" in summary:
                print("✅ AI understood source tracking instruction")
            else:
                print("❌ AI did NOT understand source tracking instruction")
                # Try to inject source tags as a fallback
                summary = OllamaService._inject_source_tags_fallback(summary, documents)
            
            # Extract source tags and calculate usage
            import re
            # More flexible pattern to catch various formats
            source_patterns = [
                r'\[([A-Z&]+):\s*([^\]]+)\]',  # Standard format: [TYPE: content]
                r'\[([A-Z&]+):([^\]]+)\]',     # No space: [TYPE:content]
                r'\[([A-Z&]+)\s*:\s*([^\]]+)\]', # Extra spaces: [TYPE : content]
                r'\[([A-Z&]+)\s*:\s*([^\]]+)\]', # Mixed spaces: [TYPE: content]
            ]
            
            matches = []
            for pattern in source_patterns:
                pattern_matches = re.findall(pattern, summary)
                matches.extend(pattern_matches)
                if pattern_matches:
                    print(f"🔍 Pattern '{pattern}' found {len(pattern_matches)} matches")
            
            # Remove duplicates while preserving order
            seen = set()
            unique_matches = []
            for match in matches:
                if match not in seen:
                    seen.add(match)
                    unique_matches.append(match)
            matches = unique_matches
            
            print(f"🔍 Total unique source tags found: {len(matches)}")
            
            for source_type, content in matches:
                print(f"🔍 Found source tag: {source_type} -> {content[:50]}...")
                
                # Map source types to full document types
                source_mapping = {
                    'LAB': 'Lab Results',
                    'RAD': 'Radiology Report', 
                    'PROG': 'Progress Notes',
                    'DISCH': 'Discharge Instructions',
                    'MED': 'Medication List',
                    'VITALS': 'Vital Signs',
                    'CONSULT': 'Consultation Notes',
                    'SURG': 'Surgery Notes',
                    'ED': 'Emergency Department Notes',
                    'NURSING': 'Nursing Notes',
                    'PATH': 'Pathology Report',
                    'PE': 'Physical Examination',
                    'H&P': 'History and Physical',
                    'OP': 'Operative Report',
                    'SYSTEM': 'System Generated'  # For discharge date, etc.
                }
                
                full_type = source_mapping.get(source_type, source_type)
                if full_type not in source_usage:
                    source_usage[full_type] = 0
                source_usage[full_type] += len(content.strip())
                
                # Find the source document content for attribution
                source_doc_content = None
                for doc in documents:
                    if doc.get('type', '').lower() == full_type.lower():
                        source_doc_content = doc.get('content', '')
                        break
                
                # Store attribution information
                attribution_key = f"{source_type}_{content[:30].replace(' ', '_')}"
                source_attributions[attribution_key] = {
                    'source_type': source_type,
                    'full_type': full_type,
                    'content': content.strip(),
                    'source_document': source_doc_content[:500] if source_doc_content else "Source document not found"
                }
                
                print(f"🔍 Mapped {source_type} to {full_type}, added {len(content.strip())} characters")
            
            # Create clean summary (remove source tags)
            # Use the first pattern to clean the summary
            clean_summary = re.sub(source_patterns[0], r'\2', summary)
            
            # Remove excessive asterisks and formatting symbols to make it look like a typed document
            clean_summary = OllamaService._clean_document_formatting(clean_summary)
            
            # Also clean the highlighted summary
            highlighted_summary = OllamaService._clean_document_formatting(highlighted_summary)
            
            print(f"🔍 Final source usage: {source_usage}")
            print(f"🔍 Total characters: {len(clean_summary)}")
            print(f"🔍 Source character count: {sum(source_usage.values())}")
            
            logger.info(f"Successfully generated summary for patient {patient_data.get('patientId')}")
            return {
                'summary': clean_summary,
                'highlighted_summary': highlighted_summary,
                'source_usage': source_usage,
                'source_attributions': source_attributions,
                'total_characters': len(clean_summary),
                'source_character_count': sum(source_usage.values())
            }
            
        except Exception as e:
            logger.error(f"Error generating summary with Ollama: {str(e)}")
            return {
                'summary': f"Error generating summary: {str(e)}",
                'highlighted_summary': f"Error generating summary: {str(e)}",
                'source_usage': {},
                'source_attributions': {},
                'total_characters': 0,
                'source_character_count': 0
            }
    
    @staticmethod
    def _clean_document_formatting(text: str) -> str:
        """
        Clean up document formatting to make it look like a typed document.
        Removes excessive asterisks, bullet points, and other formatting symbols.
        
        Args:
            text: Raw text with formatting symbols
            
        Returns:
            Cleaned text that looks like a typed document
        """
        import re
        
        # Remove excessive asterisks (3 or more in a row)
        text = re.sub(r'\*{3,}', '', text)
        
        # Remove bullet points and list markers
        text = re.sub(r'^\s*[\*\-\+]\s+', '', text, flags=re.MULTILINE)
        
        # Remove excessive dashes
        text = re.sub(r'-{3,}', '', text)
        
        # Remove excessive equals signs
        text = re.sub(r'={3,}', '', text)
        
        # Remove excessive underscores
        text = re.sub(r'_{3,}', '', text)
        
        # Clean up multiple spaces
        text = re.sub(r' {2,}', ' ', text)
        
        # Clean up multiple newlines
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        # Remove leading/trailing whitespace from each line
        lines = text.split('\n')
        cleaned_lines = [line.strip() for line in lines]
        text = '\n'.join(cleaned_lines)
        
        return text.strip()

    @staticmethod
    def _inject_source_tags_fallback(summary: str, documents: list) -> str:
        """
        Fallback method to inject source tags into summary if AI failed to include them.
        
        Args:
            summary: Generated summary without source tags
            documents: List of source documents
            
        Returns:
            Summary with injected source tags
        """
        try:
            print("🔄 Attempting to inject source tags as fallback...")
            
            # Create a mapping of document types to their content
            doc_type_mapping = {}
            for doc in documents:
                doc_type = doc.get('type', 'Unknown')
                content = doc.get('content', '')
                if doc_type not in doc_type_mapping:
                    doc_type_mapping[doc_type] = []
                doc_type_mapping[doc_type].append(content)
            
            # Map document types to source tags
            type_mapping = {
                'Lab Results': 'LAB',
                'Radiology Report': 'RAD',
                'Progress Notes': 'PROG',
                'Discharge Instructions': 'DISCH',
                'Medication List': 'MED',
                'Vital Signs': 'VITALS',
                'Consultation Notes': 'CONSULT',
                'Surgery Notes': 'SURG',
                'Emergency Department Notes': 'ED',
                'Nursing Notes': 'NURSING',
                'Pathology Report': 'PATH',
                'Physical Examination': 'PE',
                'History and Physical': 'H&P',
                'Operative Report': 'OP'
            }
            
            # Try to inject source tags for common medical terms
            import re
            
            # Common patterns to tag - more comprehensive
            patterns_to_tag = [
                # Patient Information
                (r'Patient Name:\s*([^\n]+)', 'PROG'),
                (r'Name:\s*([^\n]+)', 'PROG'),
                (r'Date of Birth:\s*([^\n]+)', 'PROG'),
                (r'DOB:\s*([^\n]+)', 'PROG'),
                (r'Age:\s*([^\n]+)', 'PROG'),
                (r'Gender:\s*([^\n]+)', 'PROG'),
                (r'Room:\s*([^\n]+)', 'PROG'),
                (r'Bed:\s*([^\n]+)', 'PROG'),
                
                # Vital Signs
                (r'Blood Pressure:\s*([^\n]+)', 'VITALS'),
                (r'BP:\s*([^\n]+)', 'VITALS'),
                (r'Heart Rate:\s*([^\n]+)', 'VITALS'),
                (r'HR:\s*([^\n]+)', 'VITALS'),
                (r'Temperature:\s*([^\n]+)', 'VITALS'),
                (r'Temp:\s*([^\n]+)', 'VITALS'),
                (r'Respiratory Rate:\s*([^\n]+)', 'VITALS'),
                (r'RR:\s*([^\n]+)', 'VITALS'),
                (r'Oxygen Saturation:\s*([^\n]+)', 'VITALS'),
                (r'SpO2:\s*([^\n]+)', 'VITALS'),
                
                # Medications
                (r'Medications?:\s*([^\n]+)', 'MED'),
                (r'Medication List:\s*([^\n]+)', 'MED'),
                (r'Current Medications:\s*([^\n]+)', 'MED'),
                (r'Drugs:\s*([^\n]+)', 'MED'),
                
                # Lab Results
                (r'Lab Results?:\s*([^\n]+)', 'LAB'),
                (r'Laboratory:\s*([^\n]+)', 'LAB'),
                (r'Blood Work:\s*([^\n]+)', 'LAB'),
                (r'Troponin:\s*([^\n]+)', 'LAB'),
                (r'Creatinine:\s*([^\n]+)', 'LAB'),
                (r'Glucose:\s*([^\n]+)', 'LAB'),
                (r'Hemoglobin:\s*([^\n]+)', 'LAB'),
                (r'White Blood Cell:\s*([^\n]+)', 'LAB'),
                (r'WBC:\s*([^\n]+)', 'LAB'),
                
                # Imaging
                (r'Imaging:\s*([^\n]+)', 'RAD'),
                (r'X-ray:\s*([^\n]+)', 'RAD'),
                (r'Chest X-ray:\s*([^\n]+)', 'RAD'),
                (r'CXR:\s*([^\n]+)', 'RAD'),
                (r'CT:\s*([^\n]+)', 'RAD'),
                (r'MRI:\s*([^\n]+)', 'RAD'),
                (r'Ultrasound:\s*([^\n]+)', 'RAD'),
                (r'ECG:\s*([^\n]+)', 'RAD'),
                (r'EKG:\s*([^\n]+)', 'RAD'),
                
                # Clinical Information
                (r'Chief Complaint:\s*([^\n]+)', 'ED'),
                (r'CC:\s*([^\n]+)', 'ED'),
                (r'History of Present Illness:\s*([^\n]+)', 'H&P'),
                (r'HPI:\s*([^\n]+)', 'H&P'),
                (r'Physical Examination:\s*([^\n]+)', 'PE'),
                (r'PE:\s*([^\n]+)', 'PE'),
                (r'Assessment and Plan:\s*([^\n]+)', 'PROG'),
                (r'A&P:\s*([^\n]+)', 'PROG'),
                (r'Plan:\s*([^\n]+)', 'PROG'),
                (r'Assessment:\s*([^\n]+)', 'PROG'),
                
                # Discharge
                (r'Discharge Instructions:\s*([^\n]+)', 'DISCH'),
                (r'Discharge Plan:\s*([^\n]+)', 'DISCH'),
                (r'Follow-up:\s*([^\n]+)', 'DISCH'),
                (r'Follow up:\s*([^\n]+)', 'DISCH'),
                
                # Procedures
                (r'Procedure:\s*([^\n]+)', 'SURG'),
                (r'Surgery:\s*([^\n]+)', 'SURG'),
                (r'Operation:\s*([^\n]+)', 'SURG'),
                (r'PCI:\s*([^\n]+)', 'SURG'),
                (r'Catheterization:\s*([^\n]+)', 'SURG'),
                
                # Consultations
                (r'Consultation:\s*([^\n]+)', 'CONSULT'),
                (r'Consult:\s*([^\n]+)', 'CONSULT'),
                (r'Specialist:\s*([^\n]+)', 'CONSULT'),
                
                # Nursing
                (r'Nursing Care:\s*([^\n]+)', 'NURSING'),
                (r'Nursing Plan:\s*([^\n]+)', 'NURSING'),
                (r'Care Plan:\s*([^\n]+)', 'NURSING'),
            ]
            
            modified_summary = summary
            
            for pattern, source_tag in patterns_to_tag:
                def replace_with_tag(match):
                    content = match.group(1).strip()
                    if content and content != "Not documented":
                        return f"{match.group(0).split(':')[0]}: [{source_tag}: {content}]"
                    return match.group(0)
                
                modified_summary = re.sub(pattern, replace_with_tag, modified_summary, flags=re.IGNORECASE)
            
            print(f"🔄 Fallback injection completed. Modified summary length: {len(modified_summary)}")
            return modified_summary
            
        except Exception as e:
            print(f"❌ Error in fallback source tag injection: {e}")
            return summary
    
    @staticmethod
    def generate_patient_summary(patient_data: Dict[str, Any], template_content: str) -> str:
        """
        Generate a discharge summary for a patient using Ollama (backward compatibility).
        
        Args:
            patient_data: Patient data including documents
            template_content: Discharge summary template content
            
        Returns:
            Generated discharge summary text
        """
        result = OllamaService.generate_patient_summary_with_sources(patient_data, template_content)
        return result.get('summary', 'Error generating summary')
    
    @staticmethod
    def create_summary_file(patient_name: str, summary_content: str, doctor_id: str, patient_id: str) -> Dict[str, str]:
        """
        Create a summary file and upload it to Alibaba Cloud OSS.
        
        Args:
            patient_name: Name of the patient
            summary_content: Generated summary content
            doctor_id: Doctor's Firebase UID
            patient_id: Patient ID
            
        Returns:
            Dict containing filename and OSS information
        """
        try:
            # Clean patient name for filename
            clean_name = "".join(c for c in patient_name if c.isalnum() or c in (' ', '-', '_')).rstrip()
            clean_name = clean_name.replace(' ', '_')
            
            # Create filename
            filename = f"Discharge_summary_{clean_name}.txt"
            
            # Import OSS service
            from alibaba_cloud.services.oss_service import AlibabaOSSService
            
            # Initialize OSS service
            oss_service = AlibabaOSSService()
            
            # Convert summary content to bytes
            summary_bytes = summary_content.encode('utf-8')
            
            # Upload to OSS using the existing structure
            upload_result = oss_service.upload_medical_document(
                file_content=summary_bytes,
                file_name=filename,
                doctor_id=doctor_id,
                patient_id=patient_id,
                document_type="discharge_summaries"
            )
            
            logger.info(f"Successfully uploaded summary to OSS: {upload_result['oss_path']}")
            
            return {
                'filename': filename,
                'oss_path': upload_result['oss_path'],
                'url': upload_result['presigned_url'],
                'file_size': upload_result['file_size']
            }
            
        except Exception as e:
            logger.error(f"Error uploading summary to OSS: {str(e)}")
            # Fallback to local storage if OSS fails
            try:
                from django.conf import settings
                import os
                
                summaries_dir = os.path.join(settings.MEDIA_ROOT, 'summaries')
                os.makedirs(summaries_dir, exist_ok=True)
                
                file_path = os.path.join(summaries_dir, filename)
                
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(summary_content)
                
                logger.warning(f"Fallback: Created summary file locally: {filename}")
                return {
                    'filename': filename,
                    'oss_path': None,
                    'url': f'/media/summaries/{filename}',
                    'file_size': len(summary_content.encode('utf-8'))
                }
            except Exception as fallback_error:
                logger.error(f"Fallback local storage also failed: {str(fallback_error)}")
                return {
                    'filename': filename,
                    'oss_path': None,
                    'url': None,
                    'file_size': 0
                }
