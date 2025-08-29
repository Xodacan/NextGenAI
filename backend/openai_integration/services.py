import os
import json
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime, date
from decimal import Decimal

import openai
from django.conf import settings
from django.utils import timezone

from .models import DocumentAnalysis, DischargeSummary
from alibaba_cloud.services.oss_service import AlibabaOSSService

logger = logging.getLogger(__name__)

class OpenAIService:
    """Service for OpenAI integration"""
    
    def __init__(self):
        self.client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        self.oss_service = AlibabaOSSService()
    
    def analyze_document(self, document_analysis: DocumentAnalysis) -> bool:
        """
        Analyze a document from Alibaba Cloud OSS using OpenAI
        """
        try:
            # Update status to processing
            document_analysis.status = 'processing'
            document_analysis.save()
            
            # Download document from OSS
            document_content = self.oss_service.download_document(document_analysis.oss_path)
            if not document_content:
                raise Exception("Failed to download document from OSS")
            
            # Store raw content
            document_analysis.raw_content = document_content
            document_analysis.save()
            
            # Extract text using OpenAI
            extracted_text = self._extract_text_from_document(document_content, document_analysis.document_type)
            document_analysis.extracted_text = extracted_text
            document_analysis.save()
            
            # Generate analysis summary
            analysis_summary = self._generate_document_summary(extracted_text, document_analysis.document_type)
            document_analysis.analysis_summary = analysis_summary
            document_analysis.status = 'completed'
            document_analysis.completed_at = timezone.now()
            document_analysis.save()
            
            return True
            
        except Exception as e:
            logger.error(f"Error analyzing document {document_analysis.id}: {str(e)}")
            document_analysis.status = 'failed'
            document_analysis.save()
            return False
    
    def _extract_text_from_document(self, content: str, document_type: str) -> str:
        """
        Extract structured text from document content using OpenAI
        """
        prompt = f"""
        Extract all relevant medical information from the following {document_type} document.
        
        Please extract and organize the following information SPECIFICALLY from the document content:
        - Patient demographics and identifiers (name, DOB, MRN, etc.)
        - Medical history and presenting symptoms
        - Vital signs and physical examination findings
        - Laboratory results and imaging findings
        - Diagnoses and treatment plans
        - Medications prescribed (with dosages and instructions)
        - Procedures performed
        - Discharge instructions and follow-up plans
        - Admission and discharge dates
        - Physician information
        
        Document content:
        {content[:8000]}  # Limit content length for API
        
        CRITICAL INSTRUCTIONS:
        1. Only extract information that is actually present in the document
        2. If a category of information is not found, clearly state "Not documented"
        3. Be specific and factual - extract actual medical terms, dosages, dates, etc.
        4. DO NOT use placeholder text like [extracted information] or [AI-analyzed data]
        5. DO NOT make assumptions or inferences
        6. If the document is unclear or incomplete, state "Insufficient information available"
        
        Please provide a structured summary of all medical information found in this document.
        """
        
        response = self.client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an experienced physician processing medical documents. Use medical best practices and clinical reasoning. Extract and organize medical information accurately and completely, considering drug interactions, standard care protocols, and ensuring medical accuracy. CRITICAL: Never use placeholder text. Only include specific, factual information extracted from the provided medical documents. If information is not available, clearly state 'Not documented'."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=2000,
            temperature=0
        )
        
        return response.choices[0].message.content
    
    def _generate_document_summary(self, extracted_text: str, document_type: str) -> str:
        """
        Generate a concise summary of the extracted medical information
        """
        prompt = f"""
        Create a concise medical summary of the following extracted information from a {document_type}:
        
        {extracted_text}
        
        Please provide a clear, professional summary focusing on:
        - Key clinical findings (extract actual findings from the document)
        - Important diagnostic information (extract actual diagnoses from the document)
        - Treatment provided (extract actual treatments from the document)
        - Critical observations or concerns (extract actual observations from the document)
        - Medications mentioned (extract actual medications from the document)
        - Follow-up instructions (extract actual instructions from the document)
        
        CRITICAL INSTRUCTIONS:
        1. Only include information that is actually present in the extracted text
        2. If specific information is not available, clearly state "Not documented"
        3. Be specific and factual - extract actual medical terms, dosages, procedures, etc.
        4. DO NOT use placeholder text like [extracted information] or [AI-analyzed data]
        5. DO NOT use generic phrases like "as per clinical notes" or "as indicated"
        6. If the extracted text is insufficient, state "Insufficient information available"
        
        Format the summary in a clear, structured manner suitable for medical professionals.
        """
        
        response = self.client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an experienced physician creating medical summaries. Use medical best practices and clinical reasoning. Create clear, professional medical summaries considering drug interactions, standard care protocols, and ensuring medical accuracy. CRITICAL: Never use placeholder text. Only include specific, factual information extracted from the provided medical documents. If information is not available, clearly state 'Not documented'."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000,
            temperature=0
        )
        
        return response.choices[0].message.content
    
    def generate_discharge_summary(self, patient_id: int, doctor_id: int, document_analysis_ids: List[int]) -> Optional[DischargeSummary]:
        """
        Generate a comprehensive discharge summary from multiple document analyses
        """
        try:
            # Get document analyses
            analyses = DocumentAnalysis.objects.filter(
                id__in=document_analysis_ids,
                patient_id=patient_id,
                status='completed'
            )
            
            if not analyses.exists():
                raise Exception("No completed document analyses found")
            
            # Combine all extracted text and summaries
            combined_content = self._combine_analysis_content(analyses)
            
            # Generate structured discharge summary
            summary_data = self._generate_structured_discharge_summary(combined_content, analyses.first().patient)
            
            # Create discharge summary record
            discharge_summary = DischargeSummary.objects.create(
                patient_id=patient_id,
                doctor_id=doctor_id,
                **summary_data
            )
            
            # Link to document analyses
            discharge_summary.generated_from_analyses.set(analyses)
            
            return discharge_summary
            
        except Exception as e:
            logger.error(f"Error generating discharge summary: {str(e)}")
            return None
    
    def _combine_analysis_content(self, analyses: List[DocumentAnalysis]) -> str:
        """
        Combine content from multiple document analyses
        """
        combined = []
        for analysis in analyses:
            combined.append(f"Document: {analysis.document_name} ({analysis.document_type})")
            combined.append(f"Summary: {analysis.analysis_summary}")
            combined.append("---")
        
        return "\n".join(combined)
    
    def _generate_structured_discharge_summary(self, combined_content: str, patient) -> Dict:
        """
        Generate a structured discharge summary using OpenAI
        """
        DISCHARGE_SUMMARY_PROMPT = """
You MUST use this EXACT format. Do NOT create your own format. Fill in the brackets with real data:

Discharge Summary Template

Patient Information and Admission Details
Patient Name: [extract exact name]
Date of Birth: [extract exact DOB]
Medical Record Number: [extract exact MRN]
Admission Date: [extract exact date]
Discharge Date: [extract exact date]

[Patient Name], a [age]-year-old [male/female] with a history of [relevant medical history], was admitted on [admission date] due to [primary reason for admission]. The patient presented with [chief complaints]. On admission, the patient was [stable/unstable] and in [mild/moderate/severe distress], requiring [oxygen therapy type and flow rate, etc.] due to [reason].

Summary of Clinical Course
Initial [relevant tests] revealed [findings], and [imaging study] showed [findings]. The patient was managed with [treatment plan]. The status improved, and by [date], the patient was successfully [action].

On [date], the patient developed [new symptoms], prompting further evaluation. [Diagnostic test] revealed [findings]. The patient was started on [medication], with resolution of symptoms by discharge. The hospital course was otherwise [unremarkable/significant for...], and the patient remained [stable/required additional interventions].

[Any additional treatments] was initiated. By [discharge date], the patient was deemed clinically stable for discharge with instructions to continue the management plan.

Discharge Medications
At discharge, the patient was prescribed:
1. [Medication Name] – [Dosage and instructions]
2. [Medication Name] – [Dosage and instructions]
3. [Home Medications, if continued] – [Dosage and instructions]

Follow-up Plan and Continuing Care
The patient was advised to follow up with [primary care physician/specialist] in [timeframe] for reassessment of [condition] and medication review.

Additionally, a referral to [specialist] was made for ongoing management and optimization of [treatment]. The patient was encouraged to attend [treatment] to improve [health condition].

Patient Education and Lifestyle Recommendations
Comprehensive discharge education was provided, emphasizing the importance of medication adherence, symptom monitoring, and lifestyle modifications. The patient was instructed to seek medical attention if experiencing [worsening symptoms].

Additional guidance was provided on [nutrition, hydration, physical activity, smoking cessation, or any other relevant aspects]. The patient was advised to maintain an [active lifestyle, dietary modifications. etc.] while avoiding [excessive exertion, environmental triggers, etc.].

Prognosis and Overall Status at Discharge
The patient's prognosis is [status], provided that [adherence to treatment plan, follow-up compliance, etc.]. The patient was discharged on [discharge date] with a structured care plan in place to support ongoing [condition] management and recovery.

Physician Name: [extract or leave blank]
Designation: [extract or leave blank]
Contact Information: [extract or leave blank]

CRITICAL INSTRUCTIONS:
1. DO NOT use placeholder text like [AI-analyzed condition], [AI-extracted treatments], or [AI-extracted medications]
2. DO NOT use generic phrases like "Based on analysis of X clinical documents"
3. DO NOT use phrases like "as per clinical notes" or "as indicated"
4. DO NOT use phrases like "AI-analyzed" or "DischargeAI"
5. ONLY include information that is actually present in the provided medical documents
6. If specific information is not available, clearly state "Not documented" or "Not available"
7. Be specific and factual - extract actual medical terms, diagnoses, medications, and procedures
8. If the documents don't contain enough information for a section, write "Insufficient information available" for that section
9. Write as if you are the attending physician

EXAMPLE OF WHAT NOT TO DO:
❌ "Based on analysis of 3 clinical documents, the patient presented with [AI-analyzed condition]"
❌ "Treatment included [AI-extracted treatments]"
❌ "Medications: [AI-extracted medications from documents]"
❌ "This summary was generated by DischargeAI"

EXAMPLE OF WHAT TO DO:
✅ "Patient presented with chest pain and shortness of breath"
✅ "Treatment included aspirin 325mg, nitroglycerin, and cardiac monitoring"
✅ "Medications: Aspirin 81mg daily, Metoprolol 25mg twice daily"

Here's an example of the correct format:
Patient Name: John Doe
Date of Birth: 15/03/1980

Consider drug interactions, standard care protocols, and ensure medical accuracy.
"""
        
        prompt = f"""
        {DISCHARGE_SUMMARY_PROMPT}
        
        Medical documents and analyses for patient {patient.first_name} {patient.last_name}:
        {combined_content}
        
        Please generate a complete discharge summary following the template exactly. Extract all available information from the provided medical documents and fill in every section of the template.
        """
        
        response = self.client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an experienced physician writing a discharge summary. Use medical best practices and clinical reasoning. Consider drug interactions, standard care protocols, and ensure medical accuracy. CRITICAL: Never use placeholder text like [AI-analyzed condition] or [AI-extracted treatments]. Only include specific, factual information extracted from the provided medical documents. If information is not available, clearly state 'Not documented' or 'Not available'."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=3000,
            temperature=0
        )
        
        summary_text = response.choices[0].message.content
        
        # Parse the structured response
        return self._parse_discharge_summary(summary_text)
    
    def _parse_discharge_summary(self, summary_text: str) -> Dict:
        """
        Parse the structured discharge summary text into a dictionary
        """
        lines = summary_text.split('\n')
        summary_data = {
            'admission_date': date.today(),  # Default values
            'discharge_date': date.today(),
            'primary_diagnosis': '',
            'secondary_diagnoses': '',
            'procedures_performed': '',
            'medications': '',
            'vital_signs': '',
            'lab_results': '',
            'imaging_results': '',
            'hospital_course': '',
            'discharge_condition': '',
            'discharge_instructions': '',
            'follow_up_plan': ''
        }
        
        # Extract key information from the formatted summary
        current_section = None
        section_content = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Extract admission and discharge dates
            if 'Admission Date:' in line:
                date_str = line.split('Admission Date:', 1)[1].strip()
                try:
                    # Try multiple date formats
                    from datetime import datetime
                    for fmt in ['%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y', '%Y/%m/%d']:
                        try:
                            parsed_date = datetime.strptime(date_str, fmt).date()
                            summary_data['admission_date'] = parsed_date
                            break
                        except:
                            continue
                except:
                    pass
            elif 'Discharge Date:' in line:
                date_str = line.split('Discharge Date:', 1)[1].strip()
                try:
                    from datetime import datetime
                    for fmt in ['%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y', '%Y/%m/%d']:
                        try:
                            parsed_date = datetime.strptime(date_str, fmt).date()
                            summary_data['discharge_date'] = parsed_date
                            break
                        except:
                            continue
                except:
                    pass
            
            # Extract CLINICAL SUMMARY section
            elif line.startswith('CLINICAL SUMMARY:'):
                current_section = 'clinical_summary'
                section_content = []
            elif current_section == 'clinical_summary' and (line.startswith('MEDICATIONS:') or line.startswith('FOLLOW-UP:')):
                summary_data['hospital_course'] = '\n'.join(section_content)
                current_section = None
            elif current_section == 'clinical_summary':
                section_content.append(line)
            
            # Extract MEDICATIONS section
            elif line.startswith('MEDICATIONS:'):
                current_section = 'medications'
                section_content = []
            elif current_section == 'medications' and line.startswith('FOLLOW-UP:'):
                summary_data['medications'] = '\n'.join(section_content)
                current_section = None
            elif current_section == 'medications':
                section_content.append(line)
            
            # Extract FOLLOW-UP section
            elif line.startswith('FOLLOW-UP:'):
                current_section = 'follow_up_plan'
                section_content = []
            elif current_section == 'follow_up_plan' and line.startswith('CONDITION AT DISCHARGE:'):
                summary_data['follow_up_plan'] = '\n'.join(section_content)
                current_section = None
            elif current_section == 'follow_up_plan':
                section_content.append(line)
            
            # Extract CONDITION AT DISCHARGE section
            elif line.startswith('CONDITION AT DISCHARGE:'):
                current_section = 'discharge_condition'
                section_content = []
            elif current_section == 'discharge_condition' and line.startswith('IMPORTANT INSTRUCTIONS:'):
                summary_data['discharge_condition'] = '\n'.join(section_content)
                current_section = None
            elif current_section == 'discharge_condition':
                section_content.append(line)
            
            # Extract IMPORTANT INSTRUCTIONS section
            elif line.startswith('IMPORTANT INSTRUCTIONS:'):
                current_section = 'discharge_instructions'
                section_content = []
            elif current_section == 'discharge_instructions' and (line.startswith('Physician Name:') or line.startswith('Generated by') or line.startswith('This summary')):
                summary_data['discharge_instructions'] = '\n'.join(section_content)
                current_section = None
            elif current_section == 'discharge_instructions':
                section_content.append(line)
        
        # Store the complete formatted summary
        summary_data['formatted_summary'] = summary_text
        
        return summary_data
