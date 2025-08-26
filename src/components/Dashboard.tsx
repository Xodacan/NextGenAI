import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Header from './Header';
import Sidebar from './Sidebar';
import PatientList from './PatientList';
import PatientDetail from './PatientDetail';
import DocumentManagement from './DocumentManagement';
import SummaryEditor from './SummaryEditor';

export type View = 'patients' | 'documents' | 'summaries';

export default function Dashboard() {
  const [currentView, setCurrentView] = useState<View>('patients');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedSummaryId, setSelectedSummaryId] = useState<string | null>(null);

  const renderContent = () => {
    switch (currentView) {
      case 'patients':
        if (selectedPatientId) {
          return (
            <PatientDetail 
              patientId={selectedPatientId}
              onBack={() => setSelectedPatientId(null)}
              onViewDocuments={() => setCurrentView('documents')}
              onEditSummary={(summaryId) => {
                setSelectedSummaryId(summaryId);
                setCurrentView('summaries');
              }}
            />
          );
        }
        return <PatientList onSelectPatient={setSelectedPatientId} />;
      
      case 'documents':
        return <DocumentManagement patientId={selectedPatientId} />;
      
      case 'summaries':
        if (selectedSummaryId) {
          return (
            <SummaryEditor 
              summaryId={selectedSummaryId}
              onBack={() => {
                setSelectedSummaryId(null);
                setCurrentView('patients');
              }}
            />
          );
        }
        return <div>Summary list view</div>;
      
      default:
        return <PatientList onSelectPatient={setSelectedPatientId} />;
    }
  };

  return (
    <div className="h-screen flex bg-gray-50">
      <Sidebar 
        currentView={currentView} 
        onViewChange={(view) => {
          setCurrentView(view);
          if (view !== 'patients') {
            setSelectedPatientId(null);
          }
          if (view !== 'summaries') {
            setSelectedSummaryId(null);
          }
        }} 
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}