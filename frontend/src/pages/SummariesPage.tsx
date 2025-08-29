import React from 'react';
import { useData, formatOccupant } from '../contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { FileText, CheckCircle, Clock, Edit3 } from 'lucide-react';

export default function SummariesPage() {
  const { summaries, patients } = useData();
  const navigate = useNavigate();

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
    navigate(`/patients/${patientId}/summary/${summaryId}`);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">All Summaries</h1>
      
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
                        <button
                          onClick={() => handleViewSummary(summary.patientId, summary.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </button>
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