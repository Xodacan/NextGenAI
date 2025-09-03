import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PatientDetail from '../components/PatientDetail';

export default function PatientDetailPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

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

  // Get the initial tab from location state
  const initialTab = location.state?.activeTab || 'details';

  return (
    <div className="p-6">
      <PatientDetail 
        patientId={patientId}
        onBack={handleBack}
        onViewDocuments={handleViewDocuments}
        onEditSummary={handleEditSummary}
        initialTab={initialTab}
      />
    </div>
  );
} 