import React, { useState, useEffect } from 'react';
import { X, FileText, Download } from 'lucide-react';
import { ClinicalDocument } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

// Component for displaying authenticated PDFs and HTML files
const AuthenticatedIframe: React.FC<{
  url: string;
  fileName: string;
  getIdToken: () => Promise<string | null>;
}> = ({ url, fileName, getIdToken }) => {
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);

  useEffect(() => {
    const loadAuthenticatedContent = async () => {
      try {
        console.log(`🔄 Loading authenticated content for: ${fileName}`);
        console.log(`🔗 URL: ${url}`);
        
        const token = await getIdToken();
        if (!token) {
          console.error('❌ No authentication token available');
          setError('No authentication token available');
          setIsLoading(false);
          return;
        }

        // Check if it's a PDF file
        const fileExt = fileName.toLowerCase().split('.').pop();
        setIsPdf(fileExt === 'pdf');
        console.log(`📄 File extension: ${fileExt}, isPdf: ${fileExt === 'pdf'}`);

        const fullUrl = `http://localhost:8000${url}`;
        console.log(`🌐 Full URL: ${fullUrl}`);

        // Create a blob URL from the authenticated response
        const response = await fetch(fullUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        console.log(`📡 Response status: ${response.status} ${response.statusText}`);
        console.log(`📋 Response headers:`, Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const blob = await response.blob();
        console.log(`📦 Blob created: ${blob.size} bytes, type: ${blob.type}`);
        
        const blobUrl = URL.createObjectURL(blob);
        console.log(`🔗 Blob URL created: ${blobUrl}`);
        
        setIframeSrc(blobUrl);
        setIsLoading(false);
        console.log('✅ Content loaded successfully');
      } catch (err) {
        console.error('❌ Error loading authenticated content:', err);
        setError(err instanceof Error ? err.message : 'Failed to load file');
        setIsLoading(false);
      }
    };

    loadAuthenticatedContent();

    // Cleanup blob URL on unmount
    return () => {
      if (iframeSrc) {
        URL.revokeObjectURL(iframeSrc);
      }
    };
  }, [url, getIdToken]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-gray-500">Loading {fileName}...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (!iframeSrc) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-gray-500">No content available</div>
      </div>
    );
  }

  // For PDFs, use object tag instead of iframe for better compatibility
  if (isPdf) {
    return (
      <div className="w-full h-full">
        {/* Try object tag first */}
        <object
          data={iframeSrc}
          type="application/pdf"
          className="w-full h-full"
        >
          {/* Fallback to iframe if object fails */}
          <iframe
            src={iframeSrc}
            title={fileName}
            className="w-full h-full border-0"
            style={{ minHeight: '600px' }}
          >
            {/* Final fallback */}
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <p className="text-gray-600 mb-4">PDF cannot be displayed in the browser.</p>
              <div className="space-x-2">
                <a 
                  href={iframeSrc} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Open PDF in New Tab
                </a>
                <a 
                  href={iframeSrc} 
                  download={fileName}
                  className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Download PDF
                </a>
              </div>
            </div>
          </iframe>
        </object>
      </div>
    );
  }

  // For HTML files, use iframe
  return (
    <iframe
      src={iframeSrc}
      title={fileName}
      className="w-full h-full border-0"
    />
  );
};

interface DocumentViewerModalProps {
  document: ClinicalDocument;
  onClose: () => void;
}

export default function DocumentViewerModal({ document, onClose }: DocumentViewerModalProps) {
  const { getIdToken } = useAuth();
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');

  // Helper function to get file extension
  const getFileExtension = (fileName: string): string => {
    return fileName.split('.').pop()?.toLowerCase() || '';
  };

  // Helper function to check if file is text-based
  const isTextFile = (fileName: string): boolean => {
    // First try viewerStrategy, fallback to file extension
    if (document.viewerStrategy === 'text') return true;
    const ext = getFileExtension(fileName);
    // Include PDFs since they're now converted to text on the backend
    return ['txt', 'md', 'csv', 'json', 'xml', 'html', 'css', 'js', 'log', 'pdf'].includes(ext);
  };

  // Helper function to check if file is PDF
  const isPdfFile = (fileName: string): boolean => {
    // First try viewerStrategy, fallback to file extension
    if (document.viewerStrategy === 'pdf') return true;
    return getFileExtension(fileName) === 'pdf';
  };

  // Helper function to check if file can be displayed in iframe
  const canDisplayInIframe = (fileName: string): boolean => {
    // First try viewerStrategy, fallback to file extension
    if (document.viewerStrategy === 'pdf' || document.viewerStrategy === 'html') return true;
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
      
      // Get authentication token and fetch document content
      getIdToken().then(token => {
        if (token) {
          fetch(getFullUrl(document.url), {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
            .then(async response => {
              if (!response.ok) {
                // Try to get detailed error message from response
                try {
                  const errorData = await response.json();
                  throw new Error(errorData.message || errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
                } catch (jsonError) {
                  // If response is not JSON, use status text
                  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
              }
              return response.text();
            })
            .then(text => {
              setTextContent(text);
              setIsLoadingText(false);
            })
            .catch(error => {
              console.error('Error loading text file:', error);
              setTextContent(`Error: ${error.message}`);
              setIsLoadingText(false);
            });
        } else {
          console.error('No authentication token available');
          setIsLoadingText(false);
        }
      }).catch(error => {
        console.error('Error getting authentication token:', error);
        setIsLoadingText(false);
      });
    }
  }, [document, getIdToken]);

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
              {/* Debug info */}
              <div className="p-2 bg-gray-100 text-xs text-gray-600">
                Debug: fileName={document.fileName}, viewerStrategy={document.viewerStrategy}, 
                isTextFile={isTextFile(document.fileName)}, 
                canDisplayInIframe={canDisplayInIframe(document.fileName)}
              </div>
              
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
                            {textContent?.replace(/\\n/g, '\n')}
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
                // Display PDFs and HTML files with authentication
                <div className="max-h-[60vh] overflow-hidden">
                  <AuthenticatedIframe 
                    url={document.url} 
                    fileName={document.fileName}
                    getIdToken={getIdToken}
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


