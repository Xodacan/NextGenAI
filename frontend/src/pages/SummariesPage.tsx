import React, { useEffect } from 'react';
import { useData, formatOccupant } from '../contexts/DataContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { FileText, CheckCircle, Clock, Edit3, Trash2 } from 'lucide-react';

export default function SummariesPage() {
  const { summaries, patients, refreshSummaries, deleteSummary } = useData();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Refresh summaries when the page loads
    refreshSummaries();
  }, [refreshSummaries]);

  // Refresh summaries when returning to this page (e.g., after editing)
  useEffect(() => {
    const handleFocus = () => {
      refreshSummaries();
    };

    // Refresh when the page becomes visible again
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshSummaries]);

  const getStatusIcon = (status: string) => {
    switch (status) {
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

  const handleViewSummary = (patientId: string, summaryId: string) => {
    // Navigate directly to patient details page
    // This will show the patient's full information including the summary section
    navigate(`/patients/${patientId}`);
  };

  const handleDeleteSummary = async (summaryId: string, patientName: string) => {
    if (window.confirm(`Are you sure you want to delete the discharge summary for ${patientName}? This action cannot be undone.`)) {
      try {
        await deleteSummary(summaryId);
        console.log(`Summary ${summaryId} deleted successfully`);
      } catch (error) {
        console.error('Error deleting summary:', error);
        alert('Failed to delete summary. Please try again.');
      }
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">All Summaries</h1>
        <button
          onClick={() => refreshSummaries()}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {summaries.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No summaries found</h3>
            <p className="text-gray-500">No discharge summaries have been generated yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {summaries.map(summary => {
                  const patient = patients.find(p => p.id === summary.patientId);
                  return (
                    <tr key={summary.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {patient ? formatOccupant(patient) : 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(summary.status)}
                          <span className={`text-sm font-medium ${
                            summary.status === 'Draft' ? 'text-yellow-600' :
                            summary.status === 'Pending Review' ? 'text-blue-600' :
                            'text-green-600'
                          }`}>
                            {summary.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(summary.createdTimestamp).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleViewSummary(summary.patientId, summary.id)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View Patient
                          </button>
                          <button
                            onClick={() => handleDeleteSummary(summary.id, patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient')}
                            className="text-red-600 hover:text-red-900"
                            title="Delete summary"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 