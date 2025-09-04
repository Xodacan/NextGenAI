import { useState, useEffect } from 'react';
import { Save, XCircle } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { getIdToken } from '../firebase/auth';
import SourceAttributionViewer from './SourceAttributionViewer';

interface SummaryEditorInlineProps {
  summary: any;
  patientId: string;
  onDeleteSummary: (summaryId: string) => void;
}

export default function SummaryEditorInline({ summary, patientId, onDeleteSummary }: SummaryEditorInlineProps) {
  const { updateSummary, showGlobalNotice } = useData();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const [showApprovalConfirmation, setShowApprovalConfirmation] = useState(false);
  const [showSourceViewer, setShowSourceViewer] = useState(false);

  // Initialize content when summary changes
  useEffect(() => {
    if (summary) {
      setContent(summary.finalContent || summary.generatedContent || '');
    }
  }, [summary]);

  // Check if user can edit this summary
  const canEdit = summary && summary.status !== 'Approved';

  const handleSave = async () => {
    if (!summary || !user) return;

    setIsSaving(true);
    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`http://localhost:8000/api/patients/${patientId}/update-summary/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          finalContent: content,
          status: 'Pending Review'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to save summary' }));
        throw new Error(errorData.detail || 'Failed to save summary');
      }

      const responseData = await response.json();
      // The backend returns the summary data in a nested structure
      const updatedSummary = responseData.summary;
      
      // Update the local state with the new summary data
      await updateSummary(summary.id, {
        finalContent: updatedSummary.finalContent,
        status: updatedSummary.status,
        approvalTimestamp: updatedSummary.approvalTimestamp
      });
      
      // Don't call onSummaryUpdate() here as it triggers refreshSummaries()
      // which can override our local state update. The updateSummary() call
      // already updates the local state, so the UI should reflect the change immediately.
      
      setIsEditing(false);
      showGlobalNotice('success', 'Summary Saved', 'Summary has been saved successfully', true);
    } catch (error) {
      console.error('Error saving summary:', error);
      showGlobalNotice('error', 'Failed to Save Summary', `Failed to save summary: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!summary || !user) return;

    setIsApproving(true);
    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`http://localhost:8000/api/patients/${patientId}/update-summary/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'Approved',
          approvalTimestamp: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to approve summary' }));
        throw new Error(errorData.detail || 'Failed to approve summary');
      }

      const responseData = await response.json();
      // The backend returns the summary data in a nested structure
      const updatedSummary = responseData.summary;
      
      // Update the local state with the new summary data
      await updateSummary(summary.id, {
        finalContent: updatedSummary.finalContent,
        status: updatedSummary.status,
        approvalTimestamp: updatedSummary.approvalTimestamp
      });
      
      // Don't call onSummaryUpdate() here as it triggers refreshSummaries()
      // which can override our local state update. The updateSummary() call
      // already updates the local state, so the UI should reflect the change immediately.
      
      setShowApprovalConfirmation(false);
      showGlobalNotice('success', 'Summary Approved', 'Summary has been approved and finalized', true);
    } catch (error) {
      console.error('Error approving summary:', error);
      showGlobalNotice('error', 'Failed to Approve Summary', `Failed to approve summary: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    } finally {
      setIsApproving(false);
    }
  };

  const confirmApproval = () => {
    setShowApprovalConfirmation(true);
  };

  const isCurrentlyEditing = isEditing && canEdit;

  return (
    <div className="h-full flex flex-col space-y-6">

      {/* Summary Header with Status and Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
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
                  <img src="/src/assets/Icons_Buttons_PendingReview.png" alt="Pending Review" className="h-4 w-4" style={{ color: '#FF9D00' }} />
                  <span className="px-2 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: '#FF9D00', color: 'white' }}>Pending Review</span>
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
          
          {/* Approve button - far right in line with heading */}
          {summary?.status === 'Pending Review' && !isCurrentlyEditing && (
            <button
              onClick={confirmApproval}
              disabled={isApproving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isApproving ? 'Approving...' : 'Approve'}
            </button>
          )}
        </div>

        {/* Small Tab Section */}
        <div className="mb-4">
          <div className="flex space-x-1 border-b border-gray-200">
            {!isCurrentlyEditing && (
              <button
                onClick={() => setShowSourceViewer(true)}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-b-2 hover:border-blue-500 transition-colors"
              >
                <img src="/src/assets/Icons_Actions_View.png" alt="Sources" className="h-4 w-4 inline mr-2" />
                Sources
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons - Restructured Layout */}
        <div className="flex items-center justify-between mb-4">
          {/* Left side - Edit/Save button (far left below heading) */}
          <div className="flex items-center">
            {!isCurrentlyEditing ? (
              canEdit ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <img src="/src/assets/Icons_Buttons_Edit.png" alt="Edit" className="h-4 w-4 mr-2" />
                  Edit Summary
                </button>
              ) : (
                <div className="text-sm text-gray-500">
                  Summary finalized - view only
                </div>
              )
            ) : (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>

          {/* Right side - Delete/Cancel button (far right aligned with edit/save button) */}
          <div className="flex items-center">
            {!isCurrentlyEditing ? (
              <button
                onClick={() => onDeleteSummary(summary.id)}
                className="inline-flex items-center px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                title="Delete summary"
              >
                <img src="/src/assets/Icons_Buttons_Trash.png" alt="Delete" className="h-4 w-4 mr-2" />
                Delete Summary
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(false)}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Summary Content */}
        <div className="flex-1 flex flex-col space-y-4">
          {isCurrentlyEditing ? (
            <div className="flex-1 flex flex-col">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="flex-1 w-full min-h-96 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Enter discharge summary content..."
              />
            </div>
          ) : (
            <div className="flex-1 bg-gray-50 p-4 rounded-lg overflow-y-auto">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {summary.finalContent || summary.generatedContent}
              </p>
            </div>
          )}
        </div>

        {summary.approvalTimestamp && (
          <div className="mt-3 text-xs text-gray-500">
            Approved on {new Date(summary.approvalTimestamp).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Approval Confirmation Modal */}
      {showApprovalConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Approve Summary</h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-700">
                Are you sure you want to approve and finalize this discharge summary? This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end space-x-3 px-6 py-4 bg-gray-50 rounded-b-lg">
              <button
                onClick={() => setShowApprovalConfirmation(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isApproving}
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                disabled={isApproving}
              >
                {isApproving ? 'Approving...' : 'Approve & Finalize'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Source Attribution Viewer */}
      <SourceAttributionViewer
        sourceAttributions={summary.source_attributions || []}
        sourceUsage={summary.source_usage || {}}
        totalCharacters={summary.total_characters || summary.generatedContent?.length || 0}
        isOpen={showSourceViewer}
        onClose={() => setShowSourceViewer(false)}
      />
    </div>
  );
}
