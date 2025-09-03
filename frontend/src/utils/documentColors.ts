// Document type color definitions for highlighting in discharge summaries
export interface DocumentTypeColor {
  bgColor: string;
  textColor: string;
  borderColor: string;
  lightBg: string;
}

export const DOCUMENT_TYPE_COLORS: Record<string, DocumentTypeColor> = {
  'Lab Results': {
    bgColor: 'bg-blue-300',
    textColor: 'text-blue-900',
    borderColor: 'border-blue-500',
    lightBg: 'bg-blue-100'
  },
  'Radiology Report': {
    bgColor: 'bg-green-300',
    textColor: 'text-green-900',
    borderColor: 'border-green-500',
    lightBg: 'bg-green-100'
  },
  'Progress Notes': {
    bgColor: 'bg-purple-300',
    textColor: 'text-purple-900',
    borderColor: 'border-purple-500',
    lightBg: 'bg-purple-100'
  },
  'Discharge Instructions': {
    bgColor: 'bg-orange-300',
    textColor: 'text-orange-900',
    borderColor: 'border-orange-500',
    lightBg: 'bg-orange-100'
  },
  'Medication List': {
    bgColor: 'bg-red-300',
    textColor: 'text-red-900',
    borderColor: 'border-red-500',
    lightBg: 'bg-red-100'
  },
  'Vital Signs': {
    bgColor: 'bg-yellow-300',
    textColor: 'text-yellow-900',
    borderColor: 'border-yellow-500',
    lightBg: 'bg-yellow-100'
  },
  'Consultation Notes': {
    bgColor: 'bg-indigo-300',
    textColor: 'text-indigo-900',
    borderColor: 'border-indigo-500',
    lightBg: 'bg-indigo-100'
  },
  'Surgery Notes': {
    bgColor: 'bg-pink-300',
    textColor: 'text-pink-900',
    borderColor: 'border-pink-500',
    lightBg: 'bg-pink-100'
  },
  'Emergency Department Notes': {
    bgColor: 'bg-cyan-300',
    textColor: 'text-cyan-900',
    borderColor: 'border-cyan-500',
    lightBg: 'bg-cyan-100'
  },
  'Nursing Notes': {
    bgColor: 'bg-teal-300',
    textColor: 'text-teal-900',
    borderColor: 'border-teal-500',
    lightBg: 'bg-teal-100'
  },
  'Pathology Report': {
    bgColor: 'bg-amber-300',
    textColor: 'text-amber-900',
    borderColor: 'border-amber-500',
    lightBg: 'bg-amber-100'
  },
  'Physical Examination': {
    bgColor: 'bg-lime-300',
    textColor: 'text-lime-900',
    borderColor: 'border-lime-500',
    lightBg: 'bg-lime-100'
  },
  'History and Physical': {
    bgColor: 'bg-emerald-300',
    textColor: 'text-emerald-900',
    borderColor: 'border-emerald-500',
    lightBg: 'bg-emerald-100'
  },
  'Operative Report': {
    bgColor: 'bg-rose-300',
    textColor: 'text-rose-900',
    borderColor: 'border-rose-500',
    lightBg: 'bg-rose-100'
  },
  'Discharge Summary': {
    bgColor: 'bg-gray-300',
    textColor: 'text-gray-900',
    borderColor: 'border-gray-500',
    lightBg: 'bg-gray-100'
  },
  'System Generated': {
    bgColor: 'bg-slate-300',
    textColor: 'text-slate-900',
    borderColor: 'border-slate-500',
    lightBg: 'bg-slate-100'
  },
  // Default fallback
  'Unknown': {
    bgColor: 'bg-gray-300',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-500',
    lightBg: 'bg-gray-100'
  }
};

export function getDocumentTypeColor(documentType: string): DocumentTypeColor {
  return DOCUMENT_TYPE_COLORS[documentType] || DOCUMENT_TYPE_COLORS['Unknown'];
}

export function getDocumentTypeColorClass(documentType: string, type: keyof DocumentTypeColor): string {
  return getDocumentTypeColor(documentType)[type];
}
