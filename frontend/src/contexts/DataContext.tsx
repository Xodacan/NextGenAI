import React, { createContext, useContext, useState, useEffect } from 'react';
import { getIdToken } from '../firebase/auth';
import { useAuth } from './AuthContext';

export interface Patient {
  id: string;
  doctor_firebase_uid?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  admissionDate: string;
  occupantType: 'Room' | 'Bed' | 'ER Patient';
  occupantValue: string;
  status: 'Active' | 'Pending Discharge' | 'Discharged';
  documents?: ClinicalDocument[]; // derived from backend JSON if needed
}

// Helper function to format occupant display
export const formatOccupant = (patient: Patient): string => {
  if (patient.occupantType === 'ER Patient') {
    return 'ER Patient';
  }
  return `${patient.occupantType} ${patient.occupantValue}`;
};

export interface ClinicalDocument {
  id: string;
  patientId: string;
  practitionerId: string;
  documentType: string;
  fileName: string;
  uploadTimestamp: string;
  summary?: string;
}

export interface DischargeSummary {
  id: string;
  patientId: string;
  status: 'Draft' | 'Pending Review' | 'Approved';
  generatedContent: string;
  finalContent?: string;
  createdTimestamp: string;
  approvedBy?: string;
  approvalTimestamp?: string;
}

interface DataContextType {
  patients: Patient[];
  documents: ClinicalDocument[];
  summaries: DischargeSummary[];
  addPatient: (patient: Omit<Patient, 'id'>) => Promise<void>;
  updatePatient: (id: string, updates: Partial<Patient>) => Promise<void>;
  addDocument: (document: Omit<ClinicalDocument, 'id' | 'uploadTimestamp'>) => Promise<void>;
  deleteDocument: (patientId: string, docIndex: number) => Promise<void>;
  generateSummary: (patientId: string) => Promise<string>;
  updateSummary: (id: string, updates: Partial<DischargeSummary>) => void;
  getPatientDocuments: (patientId: string) => ClinicalDocument[];
  getPatientSummary: (patientId: string) => DischargeSummary | undefined;
  refreshSummary: (summaryId: string) => Promise<void>;
  refreshPatients: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [documents, setDocuments] = useState<ClinicalDocument[]>([]);
  const [summaries, setSummaries] = useState<DischargeSummary[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    // Initialize with mock data
    setPatients([
      {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1965-03-15',
        admissionDate: '2024-01-15',
        occupantType: 'Room',
        occupantValue: 'A-204',
        status: 'Active'
      },
      {
        id: '2',
        firstName: 'Emily',
        lastName: 'Davis',
        dateOfBirth: '1978-11-22',
        admissionDate: '2024-01-18',
        occupantType: 'Bed',
        occupantValue: 'B-156',
        status: 'Pending Discharge'
      }
    ]);

    // When auth user changes, refresh or clear data
    const fetchPatients = async () => {
      if (!user) {
        console.log('No user, skipping fetchPatients');
        return;
      }
      
      try {
        const token = await getIdToken();
        console.log('DataContext - Got token:', token ? 'Token exists' : 'No token');
        console.log('DataContext - User:', user);
        
        if (!token) {
          console.log('No token available, cannot fetch patients');
          return;
        }
        
        const res = await fetch('http://localhost:8000/api/patients/', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('DataContext - Response status:', res.status);
        console.log('DataContext - Response headers:', Object.fromEntries(res.headers.entries()));
        
        if (res.ok) {
          const data = await res.json();
          console.log('DataContext - Patients data:', data);
          const mappedPatients: Patient[] = data.map((p: any) => ({
            id: String(p.id),
            doctor_firebase_uid: p.doctor_firebase_uid,
            firstName: p.first_name,
            lastName: p.last_name,
            dateOfBirth: p.date_of_birth,
            admissionDate: p.admission_date,
            occupantType: p.occupant_type || 'Room',
            occupantValue: p.occupant_value || '',
            status: p.status,
          }));
          setPatients(mappedPatients);

          const allDocs: ClinicalDocument[] = [];
          data.forEach((p: any) => {
            const docs: any[] = Array.isArray(p.documents) ? p.documents : [];
            docs.forEach((d: any, idx: number) => {
              allDocs.push({
                id: `${p.id}-${idx + 1}`,
                patientId: String(p.id),
                practitionerId: d.practitionerId ?? '',
                documentType: d.documentType ?? '',
                fileName: d.fileName ?? '',
                uploadTimestamp: d.uploadTimestamp ?? new Date().toISOString(),
                summary: d.summary,
              });
            });
          });
          setDocuments(allDocs);
        } else {
          const errorText = await res.text();
          console.error('DataContext - Failed to fetch patients:', res.status, errorText);
        }
      } catch (e) {
        console.error('DataContext - Exception fetching patients:', e);
      }
    };
    fetchPatients();
  }, [user]);

  const addPatient = async (patient: Omit<Patient, 'id'>) => {
    const token = await getIdToken();
    if (!token) return;
    
    const payload = {
      doctor_firebase_uid: user!.id, // Use the logged-in doctor's Firebase UID
      first_name: patient.firstName,
      last_name: patient.lastName,
      date_of_birth: patient.dateOfBirth,
      admission_date: patient.admissionDate,
      occupant_type: patient.occupantType,
      occupant_value: patient.occupantValue,
      status: patient.status,
      documents: [],
    };
    const res = await fetch('http://localhost:8000/api/patients/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const p = await res.json();
      const newPatient: Patient = {
        id: String(p.id),
        doctor_firebase_uid: p.doctor_firebase_uid,
        firstName: p.first_name,
        lastName: p.last_name,
        dateOfBirth: p.date_of_birth,
        admissionDate: p.admission_date,
        occupantType: p.occupant_type || 'Room',
        occupantValue: p.occupant_value || '',
        status: p.status,
      };
      setPatients(prev => [...prev, newPatient]);
    }
  };

  const updatePatient = async (id: string, updates: Partial<Patient>) => {
    const token = await getIdToken();
    if (!token) return;
    const payload: any = {};
    if (updates.firstName !== undefined) payload.first_name = updates.firstName;
    if (updates.lastName !== undefined) payload.last_name = updates.lastName;
    if (updates.dateOfBirth !== undefined) payload.date_of_birth = updates.dateOfBirth;
    if (updates.admissionDate !== undefined) payload.admission_date = updates.admissionDate;
    if (updates.occupantType !== undefined) payload.occupant_type = updates.occupantType;
    if (updates.occupantValue !== undefined) payload.occupant_value = updates.occupantValue;
    if (updates.status !== undefined) payload.status = updates.status;
    const res = await fetch(`http://localhost:8000/api/patients/${id}/`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const p = await res.json();
      setPatients(prev => prev.map(item => item.id === id ? {
        id: String(p.id),
        firstName: p.first_name,
        lastName: p.last_name,
        dateOfBirth: p.date_of_birth,
        admissionDate: p.admission_date,
        occupantType: p.occupant_type || 'Room',
        occupantValue: p.occupant_value || '',
        status: p.status,
      } : item));
    }
  };

  const addDocument = async (document: Omit<ClinicalDocument, 'id' | 'uploadTimestamp'>) => {
    const token = await getIdToken();
    if (!token) return;
    const payload = {
      documentType: document.documentType,
      fileName: document.fileName,
      practitionerId: document.practitionerId,
      uploadTimestamp: new Date().toISOString(),
    };
    const res = await fetch(`http://localhost:8000/api/patients/${document.patientId}/documents/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      const docs = data.documents as any[];
      // Project into ClinicalDocument for this patient
      const projected: ClinicalDocument[] = docs.map((d: any, idx: number) => ({
        id: String(idx + 1),
        patientId: document.patientId,
        practitionerId: d.practitionerId ?? '',
        documentType: d.documentType ?? '',
        fileName: d.fileName ?? '',
        uploadTimestamp: d.uploadTimestamp ?? new Date().toISOString(),
        summary: d.summary,
      }));
      setDocuments(prev => {
        const filtered = prev.filter(d => d.patientId !== document.patientId);
        return [...filtered, ...projected];
      });
    }
  };

  const deleteDocument = async (patientId: string, docIndex: number) => {
    const token = await getIdToken();
    if (!token) return;
    const res = await fetch(`http://localhost:8000/api/patients/${patientId}/documents/${docIndex}/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      const docs = data.documents as any[];
      const projected: ClinicalDocument[] = docs.map((d: any, idx: number) => ({
        id: `${patientId}-${idx + 1}`,
        patientId,
        practitionerId: d.practitionerId ?? '',
        documentType: d.documentType ?? '',
        fileName: d.fileName ?? '',
        uploadTimestamp: d.uploadTimestamp ?? new Date().toISOString(),
        summary: d.summary,
      }));
      setDocuments(prev => {
        const filtered = prev.filter(d => d.patientId !== patientId);
        return [...filtered, ...projected];
      });
    }
  };

  const generateSummary = async (patientId: string): Promise<string> => {
    if (!user) throw new Error('User not authenticated');
    
    const token = await getIdToken();
    if (!token) throw new Error('No authentication token');
    
    // Get document analyses for this patient
    const patientDocs = documents.filter(d => d.patientId === patientId);
    if (patientDocs.length === 0) {
      throw new Error('No documents found for this patient. Please upload documents first.');
    }
    
    try {
      const response = await fetch('http://localhost:8000/api/openai/generate-discharge-summary/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          patient_id: patientId
          // analysis_ids will be handled by the backend for testing
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate summary');
      }

      const data = await response.json();
      
      if (data.success) {
        // Fetch the generated summary to get its details
        const summaryResponse = await fetch(`http://localhost:8000/api/openai/discharge-summary/${data.discharge_summary_id}/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          if (summaryData.success && summaryData.discharge_summary) {
            const summary = summaryData.discharge_summary;
            const newSummary: DischargeSummary = {
              id: String(summary.id),
              patientId: String(summary.patient_id || patientId),
              status: summary.status || 'Draft',
              generatedContent: summary.formatted_summary || '',
              finalContent: summary.formatted_summary || '',
              createdTimestamp: summary.created_at || new Date().toISOString(),
              approvalTimestamp: summary.finalized_at,
              approvedBy: summary.approved_by
            };
            
            setSummaries(prev => [...prev, newSummary]);
            return newSummary.id;
          }
        }
      }
      
      throw new Error('Failed to generate summary');
    } catch (error) {
      console.error('Error generating summary:', error);
      throw error;
    }
  };

  const updateSummary = (id: string, updates: Partial<DischargeSummary>) => {
    setSummaries(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const getPatientDocuments = (patientId: string) => {
    return documents.filter(d => d.patientId === patientId);
  };

  const getPatientSummary = (patientId: string) => {
    return summaries.find(s => s.patientId === patientId);
  };

  const refreshSummary = async (summaryId: string) => {
    if (!user) return;
    try {
      const token = await getIdToken();
      if (!token) return;
      
      const res = await fetch(`http://localhost:8000/api/openai/discharge-summary/${summaryId}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.discharge_summary) {
          const summary = data.discharge_summary;
          const updatedSummary: DischargeSummary = {
            id: String(summary.id),
            patientId: String(summary.patient_id || summary.patientId),
            status: summary.status || 'Draft',
            generatedContent: summary.formatted_summary || summary.generatedContent,
            finalContent: summary.formatted_summary || summary.finalContent,
            createdTimestamp: summary.created_at || summary.createdTimestamp,
            approvalTimestamp: summary.finalized_at || summary.approvalTimestamp,
            approvedBy: summary.approved_by || summary.approvedBy
          };
          
          setSummaries(prev => prev.map(s => s.id === summaryId ? updatedSummary : s));
        }
      }
    } catch (e) {
      console.error('Failed to refresh summary', e);
    }
  };

  const refreshPatients = async () => {
    if (!user) return;
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch('http://localhost:8000/api/patients/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        const mappedPatients: Patient[] = data.map((p: any) => ({
          id: String(p.id),
          firstName: p.first_name,
          lastName: p.last_name,
          dateOfBirth: p.date_of_birth,
          admissionDate: p.admission_date,
          occupantType: p.occupant_type || 'Room',
          occupantValue: p.occupant_value || '',
          status: p.status,
        }));
        setPatients(mappedPatients);

        const allDocs: ClinicalDocument[] = [];
        data.forEach((p: any) => {
          const docs: any[] = Array.isArray(p.documents) ? p.documents : [];
          docs.forEach((d: any, idx: number) => {
            allDocs.push({
              id: `${p.id}-${idx + 1}`,
              patientId: String(p.id),
              practitionerId: d.practitionerId ?? '',
              documentType: d.documentType ?? '',
              fileName: d.fileName ?? '',
              uploadTimestamp: d.uploadTimestamp ?? new Date().toISOString(),
              summary: d.summary,
            });
          });
        });
        setDocuments(allDocs);
      }
    } catch (e) {
      console.error('Failed to refresh patients', e);
    }
  };

  return (
    <DataContext.Provider value={{
      patients,
      documents,
      summaries,
      addPatient,
      updatePatient,
      addDocument,
      deleteDocument,
      generateSummary,
      updateSummary,
      getPatientDocuments,
      getPatientSummary,
      refreshSummary,
      refreshPatients
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}