import React, { useState } from 'react';
import { useData, formatOccupant } from '../contexts/DataContext';
import { getIdToken } from '../firebase/auth';
import { ArrowLeft, FileText, CheckCircle, AlertCircle, User, FolderOpen } from 'lucide-react';

import DocumentUploadModal from './DocumentUploadModal';
import DocumentViewerModal from './DocumentViewerModal';
import HighlightedSummary from './HighlightedSummary';
import ConfirmationModal from './ConfirmationModal';

interface PatientDetailProps {
  patientId: string;
  onBack: () => void;
  onEditSummary: (summaryId: string) => void;
  initialTab?: 'details' | 'documents' | 'summary';
}

export default function PatientDetail({ patientId, onBack, onEditSummary, initialTab = 'details' }: PatientDetailProps) {
  const { patients, getPatientDocuments, getPatientSummary, generateSummary, deleteDocument, deleteSummaryDirect, updatePatient, isGeneratingSummary, generatingSummaryFor } = useData();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [viewerDocIndex, setViewerDocIndex] = useState<number | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDestructive: false
  });
  const [activeTab, setActiveTab] = useState<'details' | 'documents' | 'summary'>(initialTab);
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>('all');
  const [dismissedGenerationPopup, setDismissedGenerationPopup] = useState(false);

  const patient = patients.find(p => p.id === patientId);
  const documents = getPatientDocuments(patientId);
  const summary = getPatientSummary(patientId);

  // Check if we're generating a summary for this patient
  const isGeneratingForThisPatient = isGeneratingSummary && generatingSummaryFor === patientId;

  // Reset dismissed state when generation starts
  React.useEffect(() => {
    if (isGeneratingForThisPatient) {
      setDismissedGenerationPopup(false);
    }
  }, [isGeneratingForThisPatient]);

  if (!patient) {
    return <div>Patient not found</div>;
  }

  const handleGenerateSummary = async () => {
    if (documents.length === 0) {
      alert('Please upload at least one document before generating a summary.');
      return;
    }
    
    setShowSuccessMessage(false);
    try {
      await generateSummary(patientId);
      setSuccessMessage('Discharge summary generated successfully! OpenRoom has created a comprehensive summary based on your clinical documents. The summary is now visible in the Personal Details tab.');
      setShowSuccessMessage(true);
      
      // Don't redirect to summary editor - stay on patient details page
    } catch (error) {
      console.error('Failed to generate summary:', error);
      setSuccessMessage(`Failed to generate summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setShowSuccessMessage(true);
    } finally {
      // Hide success message after 8 seconds (longer for success message)
      setTimeout(() => setShowSuccessMessage(false), 8000);
    }
  };

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextStatus = e.target.value as typeof patient.status;
    if (nextStatus === patient.status) return;
    try {
      setIsUpdatingStatus(true);
      await updatePatient(patientId, { status: nextStatus });
    } catch (err) {
      console.error('Failed to update status', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {patient.firstName} {patient.lastName}
            </h2>
            <p className="text-gray-600">{formatOccupant(patient)}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={async () => {
              const patientName = `${patient.firstName} ${patient.lastName}`;
              const confirmed = window.confirm(`Are you sure you want to delete ${patientName}? This will also delete all associated documents and summaries. This action cannot be undone.`);
              
              if (!confirmed) {
                return; // Stay in patient details if cancelled
              }
              
              setShowSuccessMessage(false);
              try {
                // Call the backend directly instead of using the modal-based deletePatient
                const token = await getIdToken();
                if (!token) {
                  throw new Error('No authentication token available');
                }

                const response = await fetch(`http://localhost:8000/api/patients/${patientId}/`, {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                });

                if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
                }

                setSuccessMessage(`Patient ${patientName} has been deleted successfully.`);
                setShowSuccessMessage(true);
                setTimeout(() => {
                  setShowSuccessMessage(false);
                  onBack(); // Navigate back to patient list after successful deletion
                }, 2000);
              } catch (error) {
                setSuccessMessage(`Failed to delete patient: ${error instanceof Error ? error.message : 'Unknown error'}`);
                setShowSuccessMessage(true);
                setTimeout(() => setShowSuccessMessage(false), 8000);
              }
            }}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            title="Delete patient"
          >
            <img src="/src/assets/Icons_Buttons_Trash.png" alt="Delete" className="h-4 w-4 mr-2" />
            Delete Patient
          </button>
          
          {!summary ? (
            <div className="flex items-center space-x-3">
              <button
                onClick={handleGenerateSummary}
                disabled={isGeneratingForThisPatient || documents.length === 0}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isGeneratingForThisPatient ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <img src="/src/assets/Icons_Buttons_GenerateSummary.png" alt="Generate Summary" className="h-4 w-4 mr-2" />
                    Generate Summary
                  </>
                )}
              </button>
              

            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <button
                onClick={() => onEditSummary(summary.id)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <img src="/src/assets/Icons_Buttons_Edit.png" alt="Edit" className="h-4 w-4 mr-2" />
                {summary.status === 'Draft' ? 'Edit Summary' : 'View Summary'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'details'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>Personal Details</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'documents'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <FolderOpen className="h-4 w-4" />
              <span>Documents</span>
              {isGeneratingForThisPatient && dismissedGenerationPopup && (
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" title="Generating summary in background"></div>
              )}
            </div>
          </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'summary'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Summary</span>
              {(isGeneratingForThisPatient || documents.some(doc => doc.documentType === 'Discharge Summary')) && (
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              )}
              </div>
            </button>
        </nav>
      </div>



      {/* Success/Error Message Area */}
      {showSuccessMessage && (
        <div className={`border rounded-lg p-4 mb-6 ${
          successMessage.includes('Failed') 
            ? 'bg-red-50 border-red-200' 
            : 'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {successMessage.includes('Failed') ? (
                <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
              )}
              <p className={`text-sm ${
                successMessage.includes('Failed') ? 'text-red-800' : 'text-green-800'
              }`}>
                {successMessage}
              </p>
            </div>
            {!successMessage.includes('Failed') && summary && (
              <button
                onClick={() => onEditSummary(summary.id)}
                className="ml-4 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
              >
                View Summary
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="space-y-6">




          {/* Patient Information Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Information</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Date of Birth</p>
                    <p className="font-medium">{new Date(patient.dateOfBirth).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Admission Date</p>
                    <p className="font-medium">{new Date(patient.admissionDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Status</p>
                    <div className="flex items-center space-x-3">
                      <select
                        value={patient.status}
                        onChange={handleStatusChange}
                        disabled={isUpdatingStatus}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                      >
                        <option value="Active">Active</option>
                        <option value="Pending Discharge">Pending</option>
                        <option value="Discharged">Discharged</option>
                      </select>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        patient.status === 'Active'
                          ? 'bg-green-100 text-green-800'
                          : patient.status === 'Pending Discharge'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {isUpdatingStatus ? 'Updating…' : patient.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-medium">{formatOccupant(patient)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Patient ID</p>
                    <p className="font-medium font-mono text-sm">{patient.id}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-6">

          
          {/* Documents Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Clinical Documents</h3>
              <div className="flex items-center space-x-4">
                {/* Upload Button */}
                <button
                  onClick={() => setShowUploadModal(true)}
                  disabled={isGeneratingForThisPatient}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <img src="/src/assets/Icons_Buttons_UploadDocuments.png" alt="Upload" className="h-4 w-4 mr-2" />
                  Upload Document
                </button>
                
                {/* Document Type Filter */}
                <div className="flex items-center space-x-2">
                  <label htmlFor="documentTypeFilter" className="text-sm font-medium text-gray-700">
                    Filter by:
                  </label>
                  <select
                    id="documentTypeFilter"
                    value={documentTypeFilter}
                    onChange={(e) => setDocumentTypeFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="all">All Types</option>
                    {Array.from(new Set(documents.map(doc => doc.documentType)))
                      .filter(type => type && type.trim() !== '')
                      .sort()
                      .map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                  </select>
                </div>
                <span className="text-sm text-gray-500">
                  {documents.filter(doc => documentTypeFilter === 'all' || doc.documentType === documentTypeFilter).length} document(s)
                </span>
              </div>
            </div>
            
            {documents.filter(doc => documentTypeFilter === 'all' || doc.documentType === documentTypeFilter).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>{documentTypeFilter === 'all' ? 'No documents uploaded yet' : `No ${documentTypeFilter} documents found`}</p>
                <p className="text-sm">
                  {documentTypeFilter === 'all' 
                    ? 'Upload clinical documents to enable AI summary generation'
                    : `Try selecting a different document type or upload new ${documentTypeFilter} documents`
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents
                  .filter(doc => documentTypeFilter === 'all' || doc.documentType === documentTypeFilter)
                  .map((doc, index) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{doc.fileName}</p>
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {doc.documentType}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(doc.uploadTimestamp).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setViewerDocIndex(index)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View
                      </button>
                      <button
                        onClick={async () => {
                          setShowSuccessMessage(false);
                          try {
                            await deleteDocument(patientId, index);
                            const doc = documents[index];
                            const isDischargeSummary = doc?.documentType === 'Discharge Summary';
                            const message = isDischargeSummary 
                              ? 'Discharge summary has been deleted successfully.'
                              : `Document "${doc?.fileName}" has been deleted successfully.`;
                            setSuccessMessage(message);
                            setShowSuccessMessage(true);
                            setTimeout(() => setShowSuccessMessage(false), 5000);
                          } catch (error) {
                            setSuccessMessage(`Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`);
                            setShowSuccessMessage(true);
                            setTimeout(() => setShowSuccessMessage(false), 8000);
                          }
                        }}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                        title="Delete document"
                      >
                        <img src="/src/assets/Icons_Buttons_Trash.png" alt="Delete" className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* Discharge Summary Section with Edit/Delete Buttons */}
          {summary && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Discharge Summary</h3>
                <div className="flex items-center space-x-2">
                  {summary.status === 'Draft' && (
                    <>
                      <img src="/src/assets/Icons_Buttons_PendingReview.png" alt="Draft" className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm text-yellow-600">Draft</span>
                    </>
                  )}
                  {summary.status === 'Pending Review' && (
                    <>
                      <img src="/src/assets/Icons_Buttons_PendingReview.png" alt="Pending Review" className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-blue-600">Pending Review</span>
                    </>
                  )}
                  {summary.status === 'Approved' && (
                    <>
                      <img src="/src/assets/Icons_Buttons_SummaryComplete.png" alt="Approved" className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600">Approved</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700 line-clamp-3">
                  {summary.finalContent || summary.generatedContent}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  {summary.status !== 'Approved' ? (
                    <button
                      onClick={() => onEditSummary(summary.id)}
                      className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <img src="/src/assets/Icons_Buttons_Edit.png" alt="Edit" className="h-4 w-4 mr-2" />
                      {summary.status === 'Pending Review' ? 'Continue Editing' : 'Edit Summary'}
                    </button>
                  ) : (
                    <div className="text-sm text-gray-500">
                      Summary finalized - view only
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setConfirmationModal({
                        isOpen: true,
                        title: 'Delete Discharge Summary',
                        message: 'Are you sure you want to delete this discharge summary? This action cannot be undone.',
                        onConfirm: async () => {
                          setShowSuccessMessage(false);
                          try {
                            await deleteSummaryDirect(summary.id);
                            setSuccessMessage('Discharge summary has been deleted successfully.');
                            setShowSuccessMessage(true);
                            setTimeout(() => setShowSuccessMessage(false), 5000);
                          } catch (error) {
                            setSuccessMessage(`Failed to delete summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
                            setShowSuccessMessage(true);
                            setTimeout(() => setShowSuccessMessage(false), 8000);
                          }
                        },
                        isDestructive: true
                      });
                    }}
                    className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                    title="Delete summary"
                  >
                    <img src="/src/assets/Icons_Buttons_Trash.png" alt="Delete" className="h-4 w-4 mr-2" />
                    Delete
                  </button>
                </div>
              </div>
              
              {summary.approvalTimestamp && (
                <div className="mt-3 text-xs text-gray-500">
                  Approved on {new Date(summary.approvalTimestamp).toLocaleDateString()}
                </div>
              )}
            </div>
          )}

          {/* Blue Dot Notification - Generation Status */}
          {isGeneratingForThisPatient && !dismissedGenerationPopup && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <div>
                    <h4 className="font-medium text-blue-900">OpenRoom is generating your discharge summary</h4>
                    <p className="text-sm text-blue-700">This may take a few moments as we analyze your clinical documents</p>
                  </div>
                </div>
                <button
                  onClick={() => setDismissedGenerationPopup(true)}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                  title="Dismiss (generation will continue in background)"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-blue-600">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Processing clinical documents</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-blue-600">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Analyzing medical content</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-blue-600">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Generating comprehensive summary</span>
                </div>
              </div>
              
              <div className="mt-3 text-xs text-blue-600">
                💡 You can dismiss this notification and continue using other features while the summary generates in the background.
              </div>
            </div>
          )}

          {/* Discharge Summary Section */}
          {!summary && documents.some(doc => doc.documentType === 'Discharge Summary') && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Discharge Summary</h3>
                <span className="text-sm text-gray-500">Generated Summary</span>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                {(() => {
                  const dischargeDoc = documents.find(doc => doc.documentType === 'Discharge Summary');
                  if (dischargeDoc && dischargeDoc.summary) {
                    return (
                      <div>
                        <p className="text-sm text-gray-700 line-clamp-3">
                          {dischargeDoc.summary}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-sm text-gray-500">
                            Generated on {new Date(dischargeDoc.uploadTimestamp).toLocaleDateString()}
                          </span>
                          <button
                            onClick={() => {
                              const dischargeDocIndex = documents.findIndex(doc => doc.documentType === 'Discharge Summary');
                              if (dischargeDocIndex !== -1) {
                                setViewerDocIndex(dischargeDocIndex);
                              }
                            }}
                            className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            View Full Summary →
                          </button>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <p className="text-sm text-gray-500">
                      Discharge summary document found but content not available
                    </p>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Highlighted Summary - Only show if summary exists */}
          {summary && (
          <HighlightedSummary
            highlightedSummary={summary.highlighted_summary || summary.generatedContent}
            sourceUsage={summary.source_usage || {}}
            sourceAttributions={summary.source_attributions}
            totalCharacters={summary.total_characters || summary.generatedContent.length}
          />
          )}

          {/* No Summary Message */}
          {!summary && !documents.some(doc => doc.documentType === 'Discharge Summary') && !isGeneratingForThisPatient && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
              <div className="text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Discharge Summary Available</h3>
                <p className="text-sm text-gray-600">
                  Generate a discharge summary from the Documents tab to see it here.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {showUploadModal && (
        <DocumentUploadModal
          patientId={patientId}
          onClose={() => setShowUploadModal(false)}
        />
      )}
      {viewerDocIndex !== null && (
        <DocumentViewerModal
          document={documents[viewerDocIndex]}
          onClose={() => setViewerDocIndex(null)}
        />
      )}
      
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmationModal.onConfirm}
        title={confirmationModal.title}
        message={confirmationModal.message}
        isDestructive={confirmationModal.isDestructive}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}