# Template Location for AI Agent

## Where to Place Your Discharge Summary Template

**Place your PDF template file here:**
```
backend/templates/discharge_summary_template.pdf
```

## File Structure
```
backend/
├── templates/
│   ├── discharge_summary_template.pdf  ← PUT YOUR TEMPLATE HERE
│   └── README.md (this file)
```

## How It Works

1. **Place your PDF template** in the `templates/` folder
2. **Name it exactly**: `discharge_summary_template.pdf`
3. **The AI agent automatically accesses it** when processing documents
4. **Text is extracted** from your PDF and used as the template
5. **Doctors cannot see or manage templates** - they're hidden from the frontend

## Template Requirements

- **File format**: PDF (recommended) or TXT
- **File name**: Must be exactly `discharge_summary_template.pdf`
- **Content**: Should include placeholders like `{patient_name}`, `{diagnosis}`, etc.
- **Size**: Keep under 10MB for optimal performance

## Example Template Content

Your PDF should contain something like:

```
DISCHARGE SUMMARY

Patient: {patient_name}
DOB: {date_of_birth}
Admission Date: {admission_date}
Room: {room_number}

PRIMARY DIAGNOSIS:
{primary_diagnosis}

HOSPITAL COURSE:
{hospital_course}

MEDICATIONS:
{medications}

DISCHARGE INSTRUCTIONS:
{discharge_instructions}

FOLLOW-UP:
{follow_up}
```

## What Happens Next

When you click "Generate Summary" for a patient:
1. Patient documents are processed
2. Your template is loaded from this folder
3. Text is extracted from your PDF
4. Template is combined with patient data
5. Everything is sent to the AI agent (Ollama) for processing

## Security

- **Templates are hidden from doctors** - no frontend access
- **Only the AI agent can access** the template during processing
- **Template is hardcoded** in your project files
- **No database storage** or web management needed
