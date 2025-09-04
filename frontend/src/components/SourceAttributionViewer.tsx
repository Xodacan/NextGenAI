import React, { useState } from 'react';
import { X, ExternalLink } from 'lucide-react';

interface SourceAttributionViewerProps {
  sourceAttributions: any[];
  sourceUsage: any;
  totalCharacters: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function SourceAttributionViewer({ 
  sourceAttributions, 
  sourceUsage, 
  totalCharacters, 
  isOpen, 
  onClose 
}: SourceAttributionViewerProps) {
  if (!isOpen) return null;

  const handleViewFullSources = () => {
    // Navigate to dedicated source page
    // For now, we'll just close the modal
    onClose();
    // TODO: Implement navigation to dedicated source page
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Source Attribution & Document Analysis</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        <div className="px-6 py-4 overflow-y-auto max-h-[70vh]">
          <div className="space-y-6">
            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">
                        {sourceAttributions?.length || 0}
                      </span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-900">Documents Used</p>
                    <p className="text-xs text-blue-700">Source files analyzed</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-green-600 font-semibold text-sm">
                        {totalCharacters.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-900">Total Characters</p>
                    <p className="text-xs text-green-700">Content processed</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-purple-600 font-semibold text-sm">
                        {Object.keys(sourceUsage).length}
                      </span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-purple-900">Active Sources</p>
                    <p className="text-xs text-purple-700">Documents with content used</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Source Documents Detail */}
            {sourceAttributions && sourceAttributions.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-gray-900">Source Document Analysis</h4>
                  <button
                    onClick={handleViewFullSources}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Full Sources
                  </button>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {sourceAttributions.map((source, index) => {
                    const usageCount = sourceUsage[source.filename || source.fileName] || 0;
                    const percentage = totalCharacters > 0 ? (usageCount / totalCharacters * 100) : 0;
                    
                    return (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h5 className="text-sm font-medium text-gray-900 mb-1">
                              {source.filename || source.fileName || `Document ${index + 1}`}
                            </h5>
                            <p className="text-xs text-gray-500">
                              {source.fileType || 'Document'} • {source.fileSize ? `${(source.fileSize / 1024).toFixed(1)} KB` : 'Size unknown'}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-blue-600">
                              {percentage.toFixed(1)}%
                            </div>
                            <div className="text-xs text-gray-500">usage</div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>Characters used:</span>
                            <span className="font-medium">{usageCount.toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            ></div>
                          </div>
                          {source.sections && source.sections.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 mb-1">Key sections used:</p>
                              <div className="flex flex-wrap gap-1">
                                {source.sections.slice(0, 3).map((section: string, sectionIndex: number) => (
                                  <span key={sectionIndex} className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                                    {section}
                                  </span>
                                ))}
                                {source.sections.length > 3 && (
                                  <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                                    +{source.sections.length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📄</span>
                </div>
                <p className="text-lg font-medium text-gray-900 mb-2">No Source Attribution Data</p>
                <p className="text-sm">Source attribution information is not available for this summary.</p>
              </div>
            )}

            {/* Additional Information */}
            {sourceAttributions && sourceAttributions.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h5 className="text-sm font-semibold text-gray-900 mb-2">Generation Information</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600">
                  <div>
                    <span className="font-medium">Model used:</span> AI-powered document analysis
                  </div>
                  <div>
                    <span className="font-medium">Processing method:</span> Intelligent content extraction
                  </div>
                  <div>
                    <span className="font-medium">Confidence level:</span> High accuracy
                  </div>
                  <div>
                    <span className="font-medium">Last updated:</span> {new Date().toLocaleDateString()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleViewFullSources}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Full Sources
          </button>
        </div>
      </div>
    </div>
  );
}