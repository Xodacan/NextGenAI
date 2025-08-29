import React, { useState, useEffect, useRef } from 'react';
import { FileText, Eye, Download, Brain, Loader } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import DocumentViewerModal from './DocumentViewerModal';
import { useAuth } from '../contexts/AuthContext';
import { getIdToken } from '../firebase/auth';

interface DocumentManagementProps {
  patientId: string | null;
  highlightSummaryId?: string;
}

export default function DocumentManagement({ patientId, highlightSummaryId }: DocumentManagementProps) {
  const { documents, getPatientDocuments, getPatientSummary, patients } = useData();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [documentSummaries, setDocumentSummaries] = useState<Record<string, string>>({});
  const summaryRef = useRef<HTMLDivElement>(null);

  const relevantDocuments = patientId 
    ? getPatientDocuments(patientId)
    : documents.filter(doc => 
        doc.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.documentType.toLowerCase().includes(searchTerm.toLowerCase())
      );

  // Helper function to get patient name
  const getPatientName = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient';
  };

  // Helper function to get treating doctor name
  const getTreatingDoctorName = (practitionerId: string) => {
    // For now, assume the practitionerId refers to the current doctor
    // In a real implementation, you might have a separate doctors/users table
    if (practitionerId === user?.id) {
      return user.displayName || user.fullName || 'Current Doctor';
    }
    return practitionerId || 'Unknown Doctor';
  };

  // Get patient summary if we have a patientId
  const patientSummary = patientId ? getPatientSummary(patientId) : null;

  // Scroll to summary section if coming from summaries page
  useEffect(() => {
    if (highlightSummaryId && patientSummary && summaryRef.current) {
      setTimeout(() => {
        summaryRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
        // Add highlight effect
        summaryRef.current?.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50');
        setTimeout(() => {
          summaryRef.current?.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50');
        }, 3000);
      }, 500);
    }
  }, [highlightSummaryId, patientSummary]);

  const generateDocumentSummary = async (documentId: string) => {
    setIsGeneratingSummary(true);
    
    try {
      const document = relevantDocuments.find(doc => doc.id === documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      // Get patient information for context
      const patient = patients.find(p => p.id === document.patientId);
      const patientName = patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient';

      // Call OpenAI API through our backend
      const response = await fetch('http://localhost:8000/api/openai/analyze-document/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getIdToken()}`,
        },
        body: JSON.stringify({
          patient_id: document.patientId,
          document_name: document.fileName,
          document_type: document.documentType,
          oss_path: `patients/${document.patientId}/${document.fileName}` // Assuming this is the OSS path
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze document');
      }

      const data = await response.json();
      
      if (data.success) {
        // Poll for completion
        const pollInterval = setInterval(async () => {
          const statusResponse = await fetch(`http://localhost:8000/api/openai/document-analysis/${data.analysis_id}/`, {
            headers: {
              'Authorization': `Bearer ${await getIdToken()}`,
            },
          });
          
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            
            if (statusData.analysis.status === 'completed') {
              clearInterval(pollInterval);
              setDocumentSummaries(prev => ({
                ...prev,
                [documentId]: statusData.analysis.analysis_summary
              }));
              setIsGeneratingSummary(false);
            } else if (statusData.analysis.status === 'failed') {
              clearInterval(pollInterval);
              throw new Error('Document analysis failed');
            }
          }
        }, 2000); // Poll every 2 seconds
        
        // Timeout after 60 seconds
        setTimeout(() => {
          clearInterval(pollInterval);
          setIsGeneratingSummary(false);
        }, 60000);
      } else {
        throw new Error(data.error || 'Failed to start analysis');
      }

    } catch (error) {
      console.error('Error generating summary:', error);
      // Fallback to a basic summary if OpenAI fails
      const fallbackSummary = `AI-Generated Summary: Unable to generate detailed summary at this time. Please review the document manually for key clinical findings and recommendations.`;
      
      setDocumentSummaries(prev => ({
        ...prev,
        [documentId]: fallbackSummary
      }));
    } finally {
      setIsGeneratingSummary(false);
    }
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

      {/* Summary Section - Show above documents when viewing a specific patient */}
      {patientId && patientSummary && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" ref={summaryRef}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Discharge Summary</h3>
            <div className="flex items-center space-x-2">
              {patientSummary.status === 'Draft' && (
                <>
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-yellow-600">Draft</span>
                </>
              )}
              {patientSummary.status === 'Pending Review' && (
                <>
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-blue-600">Pending Review</span>
                </>
              )}
              {patientSummary.status === 'Approved' && (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-600">Approved</span>
                </>
              )}
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700 line-clamp-3">
              {patientSummary.finalContent || patientSummary.generatedContent}
            </p>
            <button
              onClick={() => window.location.href = `/patients/${patientId}`}
              className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {patientSummary.status === 'Approved' ? 'View Summary' : 'Edit Summary'} →
            </button>
          </div>
          
          {patientSummary.approvalTimestamp && (
            <div className="mt-3 text-xs text-gray-500">
              Approved on {new Date(patientSummary.approvalTimestamp).toLocaleDateString()}
            </div>
          )}
        </div>
      )}

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
                  {!patientId && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient Name
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Treating Doctor
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
                      {!patientId && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {getPatientName(document.patientId)}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getTreatingDoctorName(document.practitionerId)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(document.uploadTimestamp).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => setSelectedDoc(document.id)}
                          className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                        >
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
                        <td colSpan={patientId ? 5 : 6} className="px-6 py-4 bg-purple-50 border-l-4 border-purple-200">
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

      {selectedDoc && (
        <DocumentViewerModal
          document={relevantDocuments.find(d => d.id === selectedDoc)!}
          onClose={() => setSelectedDoc(null)}
        />
      )}
    </div>
  );
}