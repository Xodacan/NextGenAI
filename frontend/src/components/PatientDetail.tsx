import React, { useState } from 'react';
import { ArrowLeft, FileText, Plus, Brain, CheckCircle, Clock, AlertCircle, Trash2 } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import DocumentUploadModal from './DocumentUploadModal';

interface PatientDetailProps {
  patientId: string;
  onBack: () => void;
  onViewDocuments: () => void;
  onEditSummary: (summaryId: string) => void;
}

export default function PatientDetail({ patientId, onBack, onViewDocuments, onEditSummary }: PatientDetailProps) {
  const { patients, getPatientDocuments, getPatientSummary, generateSummary, deleteDocument, updatePatient } = useData();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const patient = patients.find(p => p.id === patientId);
  const documents = getPatientDocuments(patientId);
  const summary = getPatientSummary(patientId);

  if (!patient) {
    return <div>Patient not found</div>;
  }

  const handleGenerateSummary = async () => {
    if (documents.length === 0) {
      alert('Please upload at least one document before generating a summary.');
      return;
    }
    
    setIsGenerating(true);
    try {
      const summaryId = await generateSummary(patientId);
      onEditSummary(summaryId);
    } catch (error) {
      console.error('Failed to generate summary:', error);
    } finally {
      setIsGenerating(false);
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
            <p className="text-gray-600">Room {patient.roomNumber}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Upload Document
          </button>
          
          {!summary ? (
            <button
              onClick={handleGenerateSummary}
              disabled={isGenerating || documents.length === 0}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Brain className="h-4 w-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Generate Summary'}
            </button>
          ) : (
            <button
              onClick={() => onEditSummary(summary.id)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FileText className="h-4 w-4 mr-2" />
              {summary.status === 'Draft' ? 'Edit Summary' : 'View Summary'}
            </button>
          )}
        </div>
      </div>

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

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Clinical Documents</h3>
              <span className="text-sm text-gray-500">{documents.length} document(s)</span>
            </div>
            
            {documents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No documents uploaded yet</p>
                <p className="text-sm">Upload clinical documents to enable AI summary generation</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc, index) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{doc.fileName}</p>
                        <p className="text-sm text-gray-500">{doc.documentType}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <p className="text-sm text-gray-500">
                        {new Date(doc.uploadTimestamp).toLocaleDateString()}
                      </p>
                      <button
                        onClick={() => deleteDocument(patientId, index)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                        title="Delete document"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {summary && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Discharge Summary</h3>
                <div className="flex items-center space-x-2">
                  {summary.status === 'Draft' && (
                    <>
                      <Clock className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm text-yellow-600">Draft</span>
                    </>
                  )}
                  {summary.status === 'Pending Review' && (
                    <>
                      <AlertCircle className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-blue-600">Pending Review</span>
                    </>
                  )}
                  {summary.status === 'Approved' && (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600">Approved</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700 line-clamp-3">
                  {summary.finalContent || summary.generatedContent}
                </p>
                <button
                  onClick={() => onEditSummary(summary.id)}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View Full Summary →
                </button>
              </div>
              
              {summary.approvalTimestamp && (
                <div className="mt-3 text-xs text-gray-500">
                  Approved on {new Date(summary.approvalTimestamp).toLocaleDateString()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showUploadModal && (
        <DocumentUploadModal
          patientId={patientId}
          onClose={() => setShowUploadModal(false)}
        />
      )}
    </div>
  );
}