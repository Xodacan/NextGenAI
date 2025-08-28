import React from 'react';
import { useNavigate } from 'react-router-dom';
import PatientList from '../components/PatientList';

export default function PatientsPage() {
  const navigate = useNavigate();

  const handleSelectPatient = (patientId: string) => {
    navigate(`/patients/${patientId}`);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Patients</h1>
      <PatientList onSelectPatient={handleSelectPatient} />
    </div>
  );
} 