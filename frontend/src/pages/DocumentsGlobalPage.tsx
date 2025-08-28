import React from 'react';
import DocumentManagement from '../components/DocumentManagement';

export default function DocumentsGlobalPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">All Documents</h1>
      <DocumentManagement patientId={null} />
    </div>
  );
} 