import React, { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Eye, EyeOff } from 'lucide-react';
import { getDocumentTypeColor } from '../utils/documentColors';

interface SourceAttribution {
  source_type: string;
  full_type: string;
  content: string;
  source_document: string;
}

interface SourceAttributionViewerProps {
  sourceAttributions: { [key: string]: SourceAttribution };
  highlightedSummary: string;
}

export default function SourceAttributionViewer({ 
  sourceAttributions, 
  highlightedSummary 
}: SourceAttributionViewerProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [showSourceText, setShowSourceText] = useState<Set<string>>(new Set());

  const toggleSection = (key: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedSections(newExpanded);
  };

  const toggleSourceText = (key: string) => {
    const newShowSource = new Set(showSourceText);
    if (newShowSource.has(key)) {
      newShowSource.delete(key);
    } else {
      newShowSource.add(key);
    }
    setShowSourceText(newShowSource);
  };

  // Group attributions by document type
  const groupedAttributions = Object.entries(sourceAttributions).reduce((acc, [key, attribution]) => {
    const docType = attribution.full_type;
    if (!acc[docType]) {
      acc[docType] = [];
    }
    acc[docType].push({ key, ...attribution });
    return acc;
  }, {} as { [key: string]: Array<{ key: string } & SourceAttribution> });

  if (Object.keys(sourceAttributions).length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Source Attribution</h3>
        <div className="text-center py-8 text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>No source attribution data available</p>
          <p className="text-sm mt-2">Source tracking may not have been enabled during summary generation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Source Attribution</h3>
        <p className="text-sm text-gray-600 mb-4">
          This shows where each piece of information in the discharge summary came from in the original documents.
        </p>
        
        <div className="space-y-4">
          {Object.entries(groupedAttributions)
            .sort(([,a], [,b]) => b.length - a.length) // Sort by number of attributions
            .map(([docType, attributions]) => {
              const colors = getDocumentTypeColor(docType);
              const isExpanded = expandedSections.has(docType);
              
              return (
                <div key={docType} className="border border-gray-200 rounded-lg">
                  <button
                    onClick={() => toggleSection(docType)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded ${colors.bgColor} border ${colors.borderColor}`}></div>
                      <span className="font-medium text-gray-900">{docType}</span>
                      <span className="text-sm text-gray-500">({attributions.length} items)</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                  
                  {isExpanded && (
                    <div className="border-t border-gray-200 p-4 space-y-3">
                      {attributions.map(({ key, content, source_document }) => {
                        const showSource = showSourceText.has(key);
                        
                        return (
                          <div key={key} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 mb-1">
                                  Summary Content:
                                </p>
                                <p className="text-sm text-gray-700 bg-white p-2 rounded border">
                                  {content}
                                </p>
                              </div>
                              <button
                                onClick={() => toggleSourceText(key)}
                                className="ml-3 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                title={showSource ? "Hide source text" : "Show source text"}
                              >
                                {showSource ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                            
                            {showSource && (
                              <div className="mt-3">
                                <p className="text-sm font-medium text-gray-900 mb-1">
                                  Source Document Text:
                                </p>
                                <div className="text-sm text-gray-600 bg-white p-2 rounded border max-h-32 overflow-y-auto">
                                  {source_document}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
