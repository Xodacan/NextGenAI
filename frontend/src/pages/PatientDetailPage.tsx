import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PatientDetail from '../components/PatientDetail';

export default function PatientDetailPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();

  if (!patientId) {
    return <div className="p-6">Patient not found</div>;
  }

  const handleBack = () => {
    navigate('/patients');
  };

  const handleViewDocuments = () => {
    navigate(`/patients/${patientId}/documents`);
  };

  const handleEditSummary = (summaryId: string) => {
    navigate(`/patients/${patientId}/summary/${summaryId}`);
  };

  return (
    <div className="p-6">
      <PatientDetail 
        patientId={patientId}
        onBack={handleBack}
        onViewDocuments={handleViewDocuments}
        onEditSummary={handleEditSummary}
      />
    </div>
  );
} 