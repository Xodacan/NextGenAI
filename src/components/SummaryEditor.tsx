import React, { useState } from 'react';
import { ArrowLeft, Save, CheckCircle, Clock, Edit3 } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

interface SummaryEditorProps {
  summaryId: string;
  onBack: () => void;
}

export default function SummaryEditor({ summaryId, onBack }: SummaryEditorProps) {
  const { summaries, updateSummary, patients } = useData();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState('');

  const summary = summaries.find(s => s.id === summaryId);
  const patient = summary ? patients.find(p => p.id === summary.patientId) : null;

  React.useEffect(() => {
    if (summary) {
      setContent(summary.finalContent || summary.generatedContent);
      setIsEditing(summary.status === 'Draft');
    }
  }, [summary]);

  if (!summary || !patient) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Summary not found</p>
        <button
          onClick={onBack}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          Go back
        </button>
      </div>
    );
  }

  const handleSave = () => {
    updateSummary(summaryId, {
      finalContent: content,
      status: 'Pending Review'
    });
    setIsEditing(false);
  };

  const handleApprove = () => {
    updateSummary(summaryId, {
      status: 'Approved',
      approvedBy: user?.id,
      approvalTimestamp: new Date().toISOString()
    });
  };

  const getStatusIcon = () => {
    switch (summary.status) {
      case 'Draft':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'Pending Review':
        return <Edit3 className="h-5 w-5 text-blue-500" />;
      case 'Approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return null;
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
              Discharge Summary - {patient.firstName} {patient.lastName}
            </h2>
            <div className="flex items-center space-x-2 mt-1">
              {getStatusIcon()}
              <span className={`text-sm font-medium ${
                summary.status === 'Draft' ? 'text-yellow-600' :
                summary.status === 'Pending Review' ? 'text-blue-600' :
                'text-green-600'
              }`}>
                {summary.status}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {summary.status === 'Draft' && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              {isEditing ? 'Cancel Edit' : 'Edit'}
            </button>
          )}
          
          {isEditing && (
            <button
              onClick={handleSave}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </button>
          )}
          
          {summary.status === 'Pending Review' && user?.role === 'Doctor' && (
            <button
              onClick={handleApprove}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve & Finalize
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Summary Content</h3>
          <p className="text-sm text-gray-500 mt-1">
            {isEditing ? 'Edit the discharge summary content below' : 'Review the discharge summary'}
          </p>
        </div>
        
        <div className="p-6">
          {isEditing ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={20}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder="Enter discharge summary content..."
            />
          ) : (
            <div className="prose max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-900 leading-relaxed">
                {content}
              </pre>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Created:</span>
            <p className="text-gray-600">{new Date(summary.createdTimestamp).toLocaleString()}</p>
          </div>
          
          {summary.approvalTimestamp && (
            <div>
              <span className="font-medium text-gray-700">Approved:</span>
              <p className="text-gray-600">{new Date(summary.approvalTimestamp).toLocaleString()}</p>
            </div>
          )}
          
          <div>
            <span className="font-medium text-gray-700">Status:</span>
            <p className={`font-medium ${
              summary.status === 'Draft' ? 'text-yellow-600' :
              summary.status === 'Pending Review' ? 'text-blue-600' :
              'text-green-600'
            }`}>
              {summary.status}
            </p>
          </div>
        </div>
        
        {summary.status === 'Draft' && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> This summary was generated by AI and requires clinical review and approval before finalization.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}