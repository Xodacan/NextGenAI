from langchain_ollama import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate
import os
from typing import Dict, Any
import logging

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
You are a medical professional tasked with generating a comprehensive discharge summary. Your role is to:

1. CAREFULLY READ AND ANALYZE all provided medical documents
2. EXTRACT REAL PATIENT INFORMATION including:
   - Patient's actual name, age, gender
   - Real diagnostic tests performed and their results
   - Actual procedures, treatments, and medications given
   - Real medical history and current condition
   - Actual discharge instructions provided

3. USE THE TEMPLATE AS A GUIDE, but fill in ALL placeholders with REAL INFORMATION from the documents
4. NEVER use placeholder text like [Patient Name], [Diagnostic test], [Any additional treatments] - replace these with actual data
5. If information is missing from documents, state "Not documented" rather than fabricating details

IMPORTANT: The template below is just a structure guide. You must replace ALL placeholder text with actual patient information extracted from the medical documents.

Template structure (fill in with real data):
{discharge_template}

Medical documents to analyze:
{documents}

Instructions: Generate a complete discharge summary using the template structure above, but fill in every field with actual patient information from the documents. Do not leave any placeholder text - replace everything with real data or "Not documented" if information is unavailable.
"""

    prompt = ChatPromptTemplate.from_template(system_template)
    model = OllamaLLM(
        model=model_name,
        num_predict=num_predict,
        temperature=temperature,
        top_p=top_p,
    )
    chain = prompt | model

    try:
        result = chain.invoke({
            "documents": documents_text,
            "question": "generate a discharge summary according to the template provided, using the medical documents",
            "discharge_template": template_text or "",
        })
        return str(result)
    except Exception as exc:
        return f"Error generating summary: {exc}"


class OllamaService:
    """Service for integrating with Ollama for medical summary generation."""
    
    @staticmethod
    def generate_patient_summary(patient_data: Dict[str, Any], template_content: str) -> str:
        """
        Generate a discharge summary for a patient using Ollama.
        
        Args:
            patient_data: Patient data including documents
            template_content: Discharge summary template content
            
        Returns:
            Generated discharge summary text
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
                "document_count": patient_data.get("documentCount", 0),
                "document_types": patient_data.get("documentTypes", []),
                "total_text_length": patient_data.get("totalTextLength", 0),
                "processing_metadata": patient_data.get("processingMetadata", {})
            }
            
            # Add specific instructions for the agent
            enhanced_template = f"""
IMPORTANT INSTRUCTIONS FOR THE AGENT:

1. CAREFULLY READ ALL MEDICAL DOCUMENTS provided below
2. EXTRACT REAL PATIENT INFORMATION from the documents:
   - Patient's actual name, age, gender, and demographics
   - Real diagnostic tests performed and their results
   - Actual procedures, treatments, and medications administered
   - Real medical history and current condition
   - Actual discharge instructions and follow-up plans

3. USE THIS TEMPLATE STRUCTURE as a guide, but fill in ALL fields with REAL DATA from the documents
4. NEVER use placeholder text like [Patient Name], [Diagnostic test], [Any additional treatments]
5. Replace ALL placeholders with actual patient information extracted from the medical documents
6. If information is missing, state "Not documented" rather than leaving placeholders

KEY INFORMATION TO EXTRACT:
{chr(10).join([f"- {category.replace('_', ' ').title()}: {len(items)} items found" for category, items in patient_data.get('extractedInformation', {}).items() if items])}

TEMPLATE TO FILL WITH REAL DATA:
{template_content}

DOCUMENTS TO ANALYZE:
{chr(10).join([f"=== {doc['title']} ({doc['type']}) ==={chr(10)}{doc['content'][:1000]}{'...' if len(doc['content']) > 1000 else ''}" for doc in documents])}

REMEMBER: Fill in every field with actual patient information. No placeholder text should remain in the final summary. Use the extracted information above to guide your analysis."""
            
            # Generate summary using Ollama with enhanced template
            summary = generate_discharge_summary_from_object(
                patient_record=patient_info,
                template_text=enhanced_template,
                model_name="mistral",     # Using Mistral model
                num_predict=2048,      # Increased for longer summaries
                temperature=0.2,       # Lower temperature for more focused output
                top_p=0.9
            )
            
            logger.info(f"Successfully generated summary for patient {patient_data.get('patientId')}")
            return summary
            
        except Exception as e:
            logger.error(f"Error generating summary with Ollama: {str(e)}")
            return f"Error generating summary: {str(e)}"
    
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
