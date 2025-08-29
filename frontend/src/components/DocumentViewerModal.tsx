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

  // Helper function to get file extension
  const getFileExtension = (fileName: string): string => {
    return fileName.split('.').pop()?.toLowerCase() || '';
  };

  // Helper function to check if file is text-based
  const isTextFile = (fileName: string): boolean => {
    const ext = getFileExtension(fileName);
    return ['txt', 'md', 'csv', 'json', 'xml', 'html', 'css', 'js'].includes(ext);
  };

  // Load text content for text files
  useEffect(() => {
    if (isTextFile(document.fileName) && 'url' in document && (document as any).url) {
      setIsLoadingText(true);
      fetch((document as any).url)
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
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

        <div className="p-6 space-y-4">
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

          {'url' in document && (document as any).url ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden h-[70vh]">
              {isTextFile(document.fileName) ? (
                // Text file display
                <div className="p-4 bg-white h-full overflow-auto">
                  {isLoadingText ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-gray-500">Loading text content...</div>
                    </div>
                  ) : textContent ? (
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono bg-gray-50 p-4 rounded border">
                      {textContent}
                    </pre>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-gray-500">Unable to load text content</div>
                    </div>
                  )}
                </div>
              ) : (
                // Default iframe for other file types
                <iframe
                  src={(document as any).url}
                  title={document.fileName}
                  className="w-full h-full"
                />
              )}
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                Read-only preview. Upload the file through the uploader to view contents.
              </p>
            </div>
          )}

          {document.summary && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Attached Summary</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{document.summary}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            {isTextFile(document.fileName) && textContent && (
              <button
                onClick={() => {
                  const blob = new Blob([textContent], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = document.fileName;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
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


