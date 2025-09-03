import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SummaryEditor from '../components/SummaryEditor';
import { useData } from '../contexts/DataContext';

export default function SummaryEditorPage() {
  const { patientId, summaryId } = useParams<{ patientId: string; summaryId: string }>();
  const navigate = useNavigate();
  const { refreshSummaries } = useData();

  if (!patientId || !summaryId) {
    return <div className="p-6">Summary not found</div>;
  }

  const handleBack = async () => {
    // Don't refresh summaries - this overwrites local changes
    // The local state is already updated and will persist
    // Navigate back to the summary tab of the patient
    navigate(`/patients/${patientId}`, { state: { activeTab: 'summary' } });
  };

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
      <SummaryEditor 
        summaryId={summaryId}
        onBack={handleBack}
      />
    </div>
  );
} 