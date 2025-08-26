import React, { useState } from 'react';
import { FileText, Eye, Download, Brain, Loader } from 'lucide-react';
import { useData } from '../contexts/DataContext';

interface DocumentManagementProps {
  patientId: string | null;
}

export default function DocumentManagement({ patientId }: DocumentManagementProps) {
  const { documents, getPatientDocuments } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [documentSummaries, setDocumentSummaries] = useState<Record<string, string>>({});

  const relevantDocuments = patientId 
    ? getPatientDocuments(patientId)
    : documents.filter(doc => 
        doc.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.documentType.toLowerCase().includes(searchTerm.toLowerCase())
      );

  const generateDocumentSummary = async (documentId: string) => {
    setIsGeneratingSummary(true);
    
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const mockSummary = `AI-Generated Summary: This clinical document contains key findings regarding patient care. Major points include diagnostic results, treatment recommendations, and clinical observations. The document shows [specific medical findings] with recommendations for [treatment approach]. Follow-up care includes [care instructions].`;
    
    setDocumentSummaries(prev => ({
      ...prev,
      [documentId]: mockSummary
    }));
    
    setIsGeneratingSummary(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Document Management</h2>
        {!patientId && (
          <div className="flex items-center space-x-4">
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {relevantDocuments.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
            <p className="text-gray-500">
              {patientId ? 'This patient has no uploaded documents.' : 'No documents match your search.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Upload Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {relevantDocuments.map(document => (
                  <React.Fragment key={document.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {document.fileName}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {document.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {document.documentType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(document.uploadTimestamp).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button className="text-blue-600 hover:text-blue-900 inline-flex items-center">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </button>
                        <button className="text-green-600 hover:text-green-900 inline-flex items-center">
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </button>
                        <button
                          onClick={() => generateDocumentSummary(document.id)}
                          disabled={isGeneratingSummary}
                          className="text-purple-600 hover:text-purple-900 inline-flex items-center disabled:opacity-50"
                        >
                          {isGeneratingSummary ? (
                            <Loader className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Brain className="h-4 w-4 mr-1" />
                          )}
                          Summarize
                        </button>
                      </td>
                    </tr>
                    {documentSummaries[document.id] && (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 bg-purple-50 border-l-4 border-purple-200">
                          <div className="text-sm text-gray-700">
                            <h4 className="font-medium text-purple-800 mb-2">AI-Generated Summary:</h4>
                            <p>{documentSummaries[document.id]}</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}