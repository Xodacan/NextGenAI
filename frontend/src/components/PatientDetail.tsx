import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { ArrowLeft, FileText, CheckCircle, AlertCircle, User, FolderOpen, Edit2, Save, XCircle } from 'lucide-react';

import DocumentUploadModal from './DocumentUploadModal';
import DocumentViewerModal from './DocumentViewerModal';
import ConfirmationModal from './ConfirmationModal';
import SummaryEditorInline from './SummaryEditorInline';

interface PatientDetailProps {
  patientId: string;
  onBack: () => void;
  onEditSummary: (summaryId: string) => void;
  initialTab?: 'details' | 'documents' | 'summary';
}

export default function PatientDetail({ patientId, onBack, onEditSummary, initialTab = 'details' }: PatientDetailProps) {
  const { patients, getPatientDocuments, getPatientSummary, generateSummary, deleteDocument, deleteSummaryDirect, updatePatient, isGeneratingSummary, generatingSummaryFor, showGlobalNotice } = useData();
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [viewerDocIndex, setViewerDocIndex] = useState<number | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'documents' | 'summary'>(initialTab);
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>('all');
  
  // Patient editing state
  const [isEditingPatient, setIsEditingPatient] = useState(false);
  const [editedPatient, setEditedPatient] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    admissionDate: '',
    occupantType: 'Room' as 'Room' | 'Bed' | 'ER Patient',
    occupantValue: '',
    status: 'Active' as 'Active' | 'Pending Discharge' | 'Discharged'
  });
  const [isUpdatingPatient, setIsUpdatingPatient] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  

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

  const patient = patients.find(p => p.id === patientId);
  const documents = getPatientDocuments(patientId);
  const summary = getPatientSummary(patientId);

  // Check if we're generating a summary for this patient
  const isGeneratingForThisPatient = isGeneratingSummary && generatingSummaryFor === patientId;



  // Patient editing functions
  const startEditingPatient = () => {
    if (patient) {
      setEditedPatient({
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth,
        admissionDate: patient.admissionDate,
        occupantType: patient.occupantType,
        occupantValue: patient.occupantValue,
        status: 'Active' // This won't be used since status is always editable
      });
      setIsEditingPatient(true);
    }
  };

  const cancelEditingPatient = () => {
    setIsEditingPatient(false);
    setEditedPatient({
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      admissionDate: '',
      occupantType: 'Room',
      occupantValue: '',
      status: 'Active'
    });
  };

  const savePatientChanges = async () => {
    if (!patient) return;
    
    setIsUpdatingPatient(true);
    try {
      await updatePatient(patient.id, editedPatient);
      showGlobalNotice('success', 'Patient Updated', 'Patient details updated successfully', true);
      setIsEditingPatient(false);
    } catch (error) {
      showGlobalNotice('error', 'Failed to Update Patient', `Failed to update patient: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    } finally {
      setIsUpdatingPatient(false);
    }
  };

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!patient) return;
    
    const nextStatus = e.target.value as typeof patient.status;
    if (nextStatus === patient.status) return;
    
    setIsUpdatingStatus(true);
    try {
      await updatePatient(patient.id, { status: nextStatus });
      showGlobalNotice('success', 'Status Updated', 'Patient status updated successfully', true);
    } catch (error) {
      showGlobalNotice('error', 'Failed to Update Status', `Failed to update status: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    } finally {
      setIsUpdatingStatus(false);
    }
  };



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
            <div className="flex items-center space-x-3">
            <h2 className="text-2xl font-bold text-gray-900">
              {patient.firstName} {patient.lastName}
            </h2>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-sm font-semibold rounded-md border ${
                  patient.status === 'Active'
                    ? 'bg-green-50 text-green-800 border-green-200'
                    : patient.status === 'Pending Discharge'
                    ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
                    : 'bg-gray-50 text-gray-800 border-gray-200'
                }`}>
                  {patient.status}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowUploadModal(true)}
            disabled={isGeneratingForThisPatient}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <img src="/src/assets/Icons_Buttons_UploadDocuments.png" alt="Upload" className="h-4 w-4 mr-2" />
            Upload Document
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
                onClick={() => setActiveTab('summary')}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <img src="/src/assets/Icons_Actions_View.png" alt="View" className="h-4 w-4 mr-2" />
                View Summary
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
              {summary && summary.status === 'Draft' && (
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                  {summary.status}
                </span>
              )}
              {summary && summary.status === 'Pending Review' && (
                <span className="px-2 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: '#FF9D00', color: 'white' }}>Pending Review</span>
              )}
              {summary && summary.status === 'Approved' && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Approved</span>
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
          {/* Alternative Discharge Summary Display */}
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
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
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

          {/* Personal Details Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Personal Details</h3>
                <div className="flex items-center space-x-2">
                  {!isEditingPatient ? (
                    <button
                      onClick={startEditingPatient}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit Details
                    </button>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={savePatientChanges}
                        disabled={isUpdatingPatient}
                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Save className="h-4 w-4 mr-1" />
                        {isUpdatingPatient ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={cancelEditingPatient}
                        disabled={isUpdatingPatient}
                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Name Fields */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  {isEditingPatient ? (
                    <input
                      type="text"
                      value={editedPatient.firstName}
                      onChange={(e) => setEditedPatient(prev => ({ ...prev, firstName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter first name"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">{patient.firstName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  {isEditingPatient ? (
                    <input
                      type="text"
                      value={editedPatient.lastName}
                      onChange={(e) => setEditedPatient(prev => ({ ...prev, lastName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter last name"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">{patient.lastName}</p>
                  )}
                </div>

                {/* Date of Birth */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                  {isEditingPatient ? (
                    <input
                      type="date"
                      value={editedPatient.dateOfBirth}
                      onChange={(e) => setEditedPatient(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">{new Date(patient.dateOfBirth).toLocaleDateString()}</p>
                  )}
                </div>

                {/* Admission Date */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Admission Date</label>
                  {isEditingPatient ? (
                    <input
                      type="date"
                      value={editedPatient.admissionDate}
                      onChange={(e) => setEditedPatient(prev => ({ ...prev, admissionDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">{new Date(patient.admissionDate).toLocaleDateString()}</p>
                  )}
                </div>

                {/* Location Type */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Location Type</label>
                  {isEditingPatient ? (
                    <select
                      value={editedPatient.occupantType}
                      onChange={(e) => setEditedPatient(prev => ({ ...prev, occupantType: e.target.value as 'Room' | 'Bed' | 'ER Patient' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Room">Room</option>
                      <option value="Bed">Bed</option>
                      <option value="ER Patient">ER Patient</option>
                    </select>
                  ) : (
                    <p className="text-gray-900 font-medium">{patient.occupantType}</p>
                  )}
                  </div>

                {/* Location Value */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  {isEditingPatient ? (
                    <input
                      type="text"
                      value={editedPatient.occupantValue}
                      onChange={(e) => setEditedPatient(prev => ({ ...prev, occupantValue: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., A-204, B-156"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">{patient.occupantValue}</p>
                  )}
                  </div>

                                {/* Status - Always Editable */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                    <div className="flex items-center space-x-3">
                      <select
                        value={patient.status}
                        onChange={handleStatusChange}
                        disabled={isUpdatingStatus}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                      >
                        <option value="Active">Active</option>
                      <option value="Pending Discharge">Pending Discharge</option>
                        <option value="Discharged">Discharged</option>
                      </select>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        patient.status === 'Active'
                          ? 'bg-green-100 text-green-800'
                          : patient.status === 'Pending Discharge'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                      {isUpdatingStatus ? 'Updating...' : patient.status}
                      </span>
              </div>
            </div>

                {/* Patient ID (Read-only) */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Patient ID</label>
                  <p className="text-gray-900 font-medium font-mono text-sm bg-gray-50 px-3 py-2 rounded-lg">{patient.id}</p>
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
                        onClick={() => deleteDocument(patientId, index, (type, message) => {
                          if (type === 'success') {
                            showGlobalNotice('success', 'Document Deleted', message, true);
                          } else {
                            showGlobalNotice('error', 'Failed to Delete Document', message, true);
                          }
                        })}
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
        <div className="h-full flex flex-col">
          {summary ? (
            <SummaryEditorInline
              summary={summary}
              patientId={patientId}
              onDeleteSummary={(summaryId) => {
                setConfirmationModal({
                  isOpen: true,
                  title: 'Delete Discharge Summary',
                  message: 'Are you sure you want to delete this discharge summary? This action cannot be undone.',
                  onConfirm: async () => {
                    try {
                      await deleteSummaryDirect(summaryId);
                      showGlobalNotice('success', 'Summary Deleted', 'Discharge summary has been deleted successfully', true);
                    } catch (error) {
                      showGlobalNotice('error', 'Failed to Delete Summary', `Failed to delete summary: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
                    }
                  },
                  isDestructive: true
                });
              }}
            />
          ) : (
            /* No Summary Available */
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
              <div className="text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Discharge Summary Available</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Use the "Generate Summary" button in the main summary section to create a discharge summary from your clinical documents.
                </p>
                {documents.length === 0 && (
                  <p className="text-sm text-gray-500">
                    Upload clinical documents first to enable summary generation.
                  </p>
                )}
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
