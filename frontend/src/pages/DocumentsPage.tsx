import React, { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DocumentManagement from '../components/DocumentManagement';

export default function DocumentsPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  if (!patientId) {
    return <div className="p-6">Patient not found</div>;
  }

  const handleBack = () => {
    navigate(`/patients/${patientId}`);
  };

  // Check if we're coming from summaries page (has summaryId in state)
  const summaryId = location.state?.summaryId;

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={handleBack}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Patient
        </button>
      </div>
      <DocumentManagement patientId={patientId} highlightSummaryId={summaryId} />
    </div>
  );
} 