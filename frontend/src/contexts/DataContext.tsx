import React, { createContext, useContext, useState, useEffect } from 'react';
import { getIdToken } from '../firebase/auth';
import { useAuth } from './AuthContext';

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  admissionDate: string;
  roomNumber: string;
  status: 'Active' | 'Pending Discharge' | 'Discharged';
  documents?: ClinicalDocument[]; // derived from backend JSON if needed
}

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
  refreshPatients: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [documents, setDocuments] = useState<ClinicalDocument[]>([]);
  const [summaries, setSummaries] = useState<DischargeSummary[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    // When auth user changes, refresh or clear data
    const fetchPatients = async () => {
      if (!user) {
        setPatients([]);
        setDocuments([]);
        return;
      }
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
            roomNumber: p.room_number,
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
        console.error('Failed to load patients', e);
      }
    };
    fetchPatients();
  }, [user]);

  const addPatient = async (patient: Omit<Patient, 'id'>) => {
    const token = await getIdToken();
    if (!token) return;
    const payload = {
      first_name: patient.firstName,
      last_name: patient.lastName,
      date_of_birth: patient.dateOfBirth,
      admission_date: patient.admissionDate,
      room_number: patient.roomNumber,
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
        firstName: p.first_name,
        lastName: p.last_name,
        dateOfBirth: p.date_of_birth,
        admissionDate: p.admission_date,
        roomNumber: p.room_number,
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
    if (updates.roomNumber !== undefined) payload.room_number = updates.roomNumber;
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
        roomNumber: p.room_number,
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
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const patient = patients.find(p => p.id === patientId);
    const patientDocs = documents.filter(d => d.patientId === patientId);
    
    // Simulate AI-generated content
    const aiContent = `DISCHARGE SUMMARY

Patient: ${patient?.firstName} ${patient?.lastName}
DOB: ${patient?.dateOfBirth}
Admission Date: ${patient?.admissionDate}

CLINICAL SUMMARY:
Based on analysis of ${patientDocs.length} clinical documents, the patient presented with [AI-analyzed condition]. Treatment included [AI-extracted treatments]. Patient showed good response to therapy with stable vital signs.

MEDICATIONS:
- [AI-extracted medications from documents]
- Discharge prescriptions as per clinical notes

FOLLOW-UP:
- Primary care follow-up in 1 week
- Specialist consultation as indicated
- Return if symptoms worsen

CONDITION AT DISCHARGE: Stable, improved from admission

This summary was generated by DischargeAI and requires clinical review and approval.`;

    const newSummary: DischargeSummary = {
      id: Date.now().toString(),
      patientId,
      status: 'Draft',
      generatedContent: aiContent,
      createdTimestamp: new Date().toISOString()
    };

    setSummaries(prev => [...prev, newSummary]);
    return newSummary.id;
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
          roomNumber: p.room_number,
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