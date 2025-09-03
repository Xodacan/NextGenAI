import { getDocumentTypeColor } from './documentColors';

export interface HighlightedSegment {
  text: string;
  sourceType?: string;
  isHighlighted: boolean;
}

export interface SourceUsageStats {
  [documentType: string]: {
    characterCount: number;
    percentage: number;
    color: string;
  };
}

export function parseHighlightedSummary(highlightedSummary: string): HighlightedSegment[] {
  const segments: HighlightedSegment[] = [];
  const sourcePattern = /\[([A-Z&]+):\s*([^\]]+)\]/g;
  

  
  let lastIndex = 0;
  let match;
  
  while ((match = sourcePattern.exec(highlightedSummary)) !== null) {
    const [fullMatch, sourceType, content] = match;
    const startIndex = match.index;
    

    
    // Add text before the match if any
    if (startIndex > lastIndex) {
      const beforeText = highlightedSummary.slice(lastIndex, startIndex);
      if (beforeText.trim()) {
        segments.push({
          text: beforeText,
          isHighlighted: false
        });
      }
    }
    
    // Add the highlighted segment
    segments.push({
      text: content.trim(),
      sourceType: sourceType,
      isHighlighted: true
    });
    
    lastIndex = startIndex + fullMatch.length;
  }
  
  // Add remaining text after the last match
  if (lastIndex < highlightedSummary.length) {
    const remainingText = highlightedSummary.slice(lastIndex);
    if (remainingText.trim()) {
      segments.push({
        text: remainingText,
        isHighlighted: false
      });
    }
  }
  

  
  return segments;
}

export function calculateSourceUsageStats(
  sourceUsage: { [key: string]: number },
  totalCharacters: number
): SourceUsageStats {
  const stats: SourceUsageStats = {};
  
  for (const [documentType, characterCount] of Object.entries(sourceUsage)) {
    const percentage = totalCharacters > 0 ? (characterCount / totalCharacters) * 100 : 0;
    const color = getDocumentTypeColor(documentType).bgColor;
    
    stats[documentType] = {
      characterCount,
      percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal place
      color
    };
  }
  
  return stats;
}

export function mapSourceTypeToDocumentType(sourceType: string): string {
  const mapping: { [key: string]: string } = {
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
    'OP': 'Operative Report'
  };
  
  return mapping[sourceType] || sourceType;
}
