import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getIdToken } from '../firebase/auth';

interface SummaryEditorProps {
  summaryId: string;
  onBack: () => void;
}

export default function SummaryEditor({ summaryId, onBack }: SummaryEditorProps) {
  const { summaries, updateSummary, patients, refreshSummaries } = useData();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const summary = summaries.find(s => s.id === summaryId);
  const patient = summary ? patients.find(p => p.id === summary.patientId) : null;

  // Initialize content when summary changes
  useEffect(() => {
    if (summary) {
      // Prioritize finalContent (edited content) over generatedContent
      const contentToShow = summary.finalContent || summary.generatedContent || '';
      setContent(contentToShow);
      
      console.log('Summary loaded:', {
        id: summary.id,
        status: summary.status,
        hasFinalContent: !!summary.finalContent,
        hasGeneratedContent: !!summary.generatedContent,
        contentLength: contentToShow.length,
        finalContent: summary.finalContent?.substring(0, 100) + '...',
        generatedContent: summary.generatedContent?.substring(0, 100) + '...',
        contentStateSet: contentToShow
      });
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

  const handleSave = async () => {
    if (!content.trim()) {
      alert('Summary content cannot be empty');
      return;
    }

    console.log('Saving summary:', {
      summaryId,
      currentContent: content,
      contentLength: content.length,
      originalFinalContent: summary?.finalContent,
      originalGeneratedContent: summary?.generatedContent,
      summaryStatus: summary?.status
    });

    setIsSaving(true);
    try {
      // Update the summary with new content and set status to Pending Review
      await updateSummary(summaryId, {
        finalContent: content,
        status: 'Pending Review'
      });
      
      console.log('Summary saved successfully with content:', content.substring(0, 100) + '...');
      // Show success message
      alert('Summary saved successfully!');
      // Keep editing mode ON for Pending Review status
      // This allows doctors to continue editing before finalizing
    } catch (error) {
      console.error('Error saving summary:', error);
      alert(`Failed to save summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      // Finalize the summary - make it non-editable
      await updateSummary(summaryId, {
        status: 'Approved',
        approvedBy: user?.email || user?.fullName || 'Unknown',
        approvalTimestamp: new Date().toISOString()
      });
      
      console.log('Summary approved and finalized successfully');
      // Show success message
      alert('Summary approved successfully!');
      setIsEditing(false); // Make it view-only after approval
    } catch (error) {
      console.error('Error approving summary:', error);
      alert(`Failed to approve summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsApproving(false);
    }
  };

  // Determine if editing is allowed based on status
  const canEdit = summary?.status === 'Draft' || summary?.status === 'Pending Review';
  
  // Determine if editing is currently active
  const isCurrentlyEditing = isEditing && canEdit;
  
  // Determine if summary is finalized (non-editable)
  const isFinalized = summary?.status === 'Approved';

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
            {/* Status Display */}
            <div className="flex items-center space-x-2">
              {summary?.status === 'Draft' && (
                <>
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-yellow-600">Draft</span>
                </>
              )}
              {summary?.status === 'Pending Review' && (
                <>
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-blue-600">Pending Review</span>
                </>
              )}
              {summary?.status === 'Approved' && (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-600">Approved</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          {!isFinalized && (
            <>
              {!isCurrentlyEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {summary?.status === 'Pending Review' ? 'Continue Editing' : 'Edit Summary'}
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              )}
              
              {summary?.status === 'Pending Review' && (
                <button
                  onClick={handleApprove}
                  disabled={isApproving}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {isApproving ? 'Finalizing...' : 'Approve & Finalize'}
                </button>
              )}
            </>
          )}
          
          {isCurrentlyEditing && (
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
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
          {isCurrentlyEditing ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="Enter or edit the discharge summary..."
            />
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                {content || 'No summary content available.'}
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
        
        {summary.status === 'Pending Review' && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This summary has been reviewed and is pending final approval. Make any final edits before approving.
            </p>
          </div>
        )}
        
        {summary.status === 'Approved' && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>Note:</strong> This summary has been approved and finalized. It is now view-only and cannot be edited.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}