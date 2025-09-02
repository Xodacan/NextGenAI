import React from 'react';
import { parseHighlightedSummary, calculateSourceUsageStats, mapSourceTypeToDocumentType } from '../utils/summaryHighlighter';
import { getDocumentTypeColor } from '../utils/documentColors';
import SourceAttributionViewer from './SourceAttributionViewer';

interface HighlightedSummaryProps {
  highlightedSummary: string;
  sourceUsage: { [key: string]: number };
  sourceAttributions?: { [key: string]: any };
  totalCharacters: number;
}

export default function HighlightedSummary({ 
  highlightedSummary, 
  sourceUsage, 
  sourceAttributions,
  totalCharacters 
}: HighlightedSummaryProps) {
  const segments = parseHighlightedSummary(highlightedSummary);
  const usageStats = calculateSourceUsageStats(sourceUsage, totalCharacters);
  

  
  return (
    <div className="space-y-6">
      {/* Source Usage Statistics */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Type Usage</h3>
        {Object.keys(usageStats).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No source tracking data available</p>
            <p className="text-sm mt-2">The AI may not have generated source tags in the summary</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(usageStats)
              .sort(([,a], [,b]) => b.percentage - a.percentage)
              .map(([documentType, stats]) => (
                <div key={documentType} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded ${stats.color}`}></div>
                    <span className="text-sm font-medium text-gray-700">{documentType}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${stats.color}`}
                        style={{ width: `${Math.min(stats.percentage, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-16 text-right">
                      {stats.percentage}%
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
      

      {/* Highlighted Summary Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Discharge Summary</h3>
        <div className="prose prose-sm max-w-none">
          {segments.map((segment, index) => {
            if (segment.isHighlighted && segment.sourceType) {
              const documentType = mapSourceTypeToDocumentType(segment.sourceType);
              const colors = getDocumentTypeColor(documentType);
              
              return (
                <span
                  key={index}
                  className={`${colors.bgColor} ${colors.textColor} px-2 py-1 rounded border ${colors.borderColor} relative group`}
                  title={`Source: ${documentType}`}
                >
                  {segment.text}
                  <div className="absolute bottom-full left-0 mb-2 px-2 py-1 text-xs bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                    {documentType}
                  </div>
                </span>
              );
            }
            
            return (
              <span key={index} className="text-gray-900">
                {segment.text}
              </span>
            );
          })}
        </div>
      </div>
      
      {/* Legend */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Legend</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {Object.entries(usageStats)
            .sort(([,a], [,b]) => b.percentage - a.percentage)
            .slice(0, 6) // Show top 6 document types
            .map(([documentType, stats]) => (
              <div key={documentType} className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded ${stats.color}`}></div>
                <span className="text-xs text-gray-600">{documentType}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Source Attribution Viewer */}
      {sourceAttributions && Object.keys(sourceAttributions).length > 0 && (
        <SourceAttributionViewer 
          sourceAttributions={sourceAttributions}
          highlightedSummary={highlightedSummary}
        />
      )}
    </div>
  );
}
