import React, { useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useData, formatOccupant } from '../contexts/DataContext';
import AddPatientModal from './AddPatientModal';

interface PatientListProps {
  onSelectPatient: (id: string) => void;
}

export default function PatientList({ onSelectPatient }: PatientListProps) {
  const { patients, deletePatient } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingPatientId, setDeletingPatientId] = useState<string | null>(null);

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = `${patient.firstName} ${patient.lastName}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || patient.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDeletePatient = async (patientId: string, patientName: string) => {
    if (window.confirm(`Are you sure you want to delete ${patientName}? This will also delete all associated documents and summaries. This action cannot be undone.`)) {
      try {
        setDeletingPatientId(patientId);
        await deletePatient(patientId);
        console.log(`Patient ${patientName} deleted successfully`);
      } catch (error) {
        console.error('Error deleting patient:', error);
        alert(`Failed to delete patient: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setDeletingPatientId(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Patient Management</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <img src="/src/assets/Icons_Buttons_UploadDocuments.png" alt="Add Patient" className="h-4 w-4 mr-2" />
          Add Patient
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search patients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 h-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 h-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Pending Discharge">Pending Discharge</option>
            <option value="Discharged">Discharged</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Room
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Admission Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPatients.map(patient => (
                <tr key={patient.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {patient.firstName} {patient.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatOccupant(patient)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(patient.admissionDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      patient.status === 'Active' 
                        ? 'bg-green-100 text-green-800'
                        : patient.status === 'Pending Discharge'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {patient.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => onSelectPatient(patient.id)}
                        className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                      >
                        <img src="/src/assets/Icons_Actions_View.png" alt="View" className="h-4 w-4 mr-1" />
                        View Details
                      </button>
                      <button
                        onClick={() => handleDeletePatient(patient.id, `${patient.firstName} ${patient.lastName}`)}
                        disabled={deletingPatientId === patient.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
                        title="Delete patient"
                      >
                        <img src="/src/assets/Icons_Buttons_Delete.png" alt="Delete" className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <AddPatientModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}