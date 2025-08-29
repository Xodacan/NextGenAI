import React, { useState, useEffect } from 'react';
import { X, FileText, Download } from 'lucide-react';
import { ClinicalDocument } from '../contexts/DataContext';

interface DocumentViewerModalProps {
  document: ClinicalDocument;
  onClose: () => void;
}

export default function DocumentViewerModal({ document, onClose }: DocumentViewerModalProps) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');

  // Helper function to get file extension
  const getFileExtension = (fileName: string): string => {
    return fileName.split('.').pop()?.toLowerCase() || '';
  };

  // Helper function to check if file is text-based
  const isTextFile = (fileName: string): boolean => {
    const ext = getFileExtension(fileName);
    return ['txt', 'md', 'csv', 'json', 'xml', 'html', 'css', 'js', 'log'].includes(ext);
  };

  // Helper function to check if file is PDF
  const isPdfFile = (fileName: string): boolean => {
    return getFileExtension(fileName) === 'pdf';
  };

  // Helper function to check if file can be displayed in iframe
  const canDisplayInIframe = (fileName: string): boolean => {
    const ext = getFileExtension(fileName);
    return ['pdf', 'html', 'htm'].includes(ext);
  };

  // Helper function to get the full URL for the document
  const getFullUrl = (url: string): string => {
    if (url.startsWith('http')) {
      return url; // Already a full URL
    }
    // Construct full URL to backend server
    return `http://localhost:8000${url}`;
  };

  // Load text content for text files
  useEffect(() => {
    if (isTextFile(document.fileName) && document.url) {
      setIsLoadingText(true);
      fetch(getFullUrl(document.url))
        .then(response => response.text())
        .then(text => {
          setTextContent(text);
          setIsLoadingText(false);
        })
        .catch(error => {
          console.error('Error loading text file:', error);
          setIsLoadingText(false);
        });
    }
  }, [document]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <FileText className="h-5 w-5 text-gray-500" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{document.fileName}</h3>
              <p className="text-sm text-gray-500">{document.documentType}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Uploaded</p>
              <p className="font-medium">{new Date(document.uploadTimestamp).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Practitioner</p>
              <p className="font-medium">{document.practitionerId || 'Unknown'}</p>
            </div>
          </div>

          {document.url ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {isTextFile(document.fileName) ? (
                // Text file display with proper scrolling and view mode toggle
                <div>
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-700">Text Content</span>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => setViewMode('formatted')}
                        className={`px-3 py-1 text-xs rounded ${
                          viewMode === 'formatted' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Formatted
                      </button>
                      <button
                        onClick={() => setViewMode('raw')}
                        className={`px-3 py-1 text-xs rounded ${
                          viewMode === 'raw' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Raw
                      </button>
                    </div>
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto">
                    {isLoadingText ? (
                      <div className="flex items-center justify-center h-32">
                        <div className="text-gray-500">Loading text content...</div>
                      </div>
                    ) : textContent ? (
                      <div className="p-4">
                        {viewMode === 'formatted' ? (
                          <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                            {textContent}
                          </div>
                        ) : (
                          <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono bg-gray-50 p-4 rounded border m-0">
                            {textContent}
                          </pre>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-32">
                        <div className="text-gray-500">Unable to load text content</div>
                      </div>
                    )}
                  </div>
                </div>
              ) : canDisplayInIframe(document.fileName) ? (
                // Display PDFs and HTML files in iframe
                <div className="max-h-[60vh] overflow-hidden">
                  <iframe
                    src={getFullUrl(document.url)}
                    title={document.fileName}
                    className="w-full h-full border-0"
                  />
                </div>
              ) : (
                // For other file types, show download option and file info
                <div className="max-h-[60vh] overflow-y-auto p-6">
                  <div className="text-center space-y-4">
                    <FileText className="h-16 w-16 mx-auto text-gray-400" />
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">{document.fileName}</h4>
                      <p className="text-sm text-gray-500 mt-1">
                        This file type ({getFileExtension(document.fileName).toUpperCase()}) cannot be previewed directly.
                      </p>
                    </div>
                    <div className="flex justify-center">
                      <a
                        href={getFullUrl(document.url)}
                        download={document.fileName}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download File
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : document.summary ? (
            // Show summary content if no URL but summary exists
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-700">Summary Content</span>
                <div className="flex space-x-1">
                  <button
                    onClick={() => setViewMode('formatted')}
                    className={`px-3 py-1 text-xs rounded ${
                      viewMode === 'formatted' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Formatted
                  </button>
                  <button
                    onClick={() => setViewMode('raw')}
                    className={`px-3 py-1 text-xs rounded ${
                      viewMode === 'raw' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Raw
                  </button>
                </div>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                <div className="p-4">
                  {viewMode === 'formatted' ? (
                    <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {document.summary}
                    </div>
                  ) : (
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono bg-gray-50 p-3 rounded border m-0">
                      {document.summary}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // Show document metadata and any available content
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <div className="text-center space-y-4">
                <FileText className="h-16 w-16 mx-auto text-gray-400" />
                <div className="space-y-2">
                  <h4 className="text-lg font-medium text-gray-900">{document.fileName}</h4>
                  <p className="text-sm text-gray-500">
                    This document doesn't have viewable content or a file URL.
                  </p>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-left space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Document Information</p>
                  </div>
                  
                  {document.documentType && (
                    <div>
                      <p className="text-sm text-gray-500">Type: <span className="font-medium">{document.documentType}</span></p>
                    </div>
                  )}
                  
                  {document.practitionerId && (
                    <div>
                      <p className="text-sm text-gray-500">Uploaded by: <span className="font-medium">{document.practitionerId}</span></p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm text-gray-500">Uploaded: <span className="font-medium">{new Date(document.uploadTimestamp).toLocaleString()}</span></p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Patient ID: <span className="font-medium">{document.patientId}</span></p>
                  </div>
                </div>
                
                <p className="text-xs text-gray-400">
                  To view the actual file content, ensure the document was uploaded with a file attachment.
                </p>
              </div>
            </div>
          )}

          {document.summary && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-500 font-medium">Attached Summary</p>
                <div className="flex space-x-1">
                  <button
                    onClick={() => setViewMode('formatted')}
                    className={`px-2 py-1 text-xs rounded ${
                      viewMode === 'formatted' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Formatted
                  </button>
                  <button
                    onClick={() => setViewMode('raw')}
                    className={`px-2 py-1 text-xs rounded ${
                      viewMode === 'raw' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Raw
                  </button>
                </div>
              </div>
              <div className="max-h-[40vh] overflow-y-auto">
                {viewMode === 'formatted' ? (
                  <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {document.summary}
                  </div>
                ) : (
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono bg-gray-50 p-3 rounded border m-0">
                    {document.summary}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center space-x-2">
            {isTextFile(document.fileName) && textContent && (
              <button
                onClick={() => {
                  const blob = new Blob([textContent], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = window.document.createElement('a');
                  a.href = url;
                  a.download = document.fileName;
                  window.document.body.appendChild(a);
                  a.click();
                  window.document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Download TXT</span>
              </button>
            )}
          </div>
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


