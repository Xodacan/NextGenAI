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
  fileName: string;
  documentType: string;
  uploadTimestamp: string;
  practitionerId: string;
  patientId: string;
  summary?: string;
  url?: string;
  status?: string;
  finalContent?: string;
  approvedBy?: string;
  approvalTimestamp?: string;
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
  isLoading: boolean;
  isGeneratingSummary: boolean;
  generatingSummaryFor: string | null; // patientId of the summary being generated
  getPatientDocuments: (patientId: string) => ClinicalDocument[];
  getPatientSummary: (patientId: string) => DischargeSummary | undefined;
  addPatient: (patient: Omit<Patient, 'id'>) => Promise<void>;
  updatePatient: (id: string, updates: Partial<Patient>) => Promise<void>;
  deletePatient: (patientId: string) => Promise<void>;
  addDocument: (document: Omit<ClinicalDocument, 'id' | 'uploadTimestamp'>) => Promise<void>;
  deleteDocument: (patientId: string, documentIndex: number) => void;
  generateSummary: (patientId: string) => Promise<string>;
  updateSummary: (id: string, updates: Partial<DischargeSummary>) => Promise<void>;
  deleteSummary: (summaryId: string) => Promise<void>;
  refreshPatients: () => Promise<void>;
  refreshSummaries: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [documents, setDocuments] = useState<ClinicalDocument[]>([]);
  const [summaries, setSummaries] = useState<DischargeSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [generatingSummaryFor, setGeneratingSummaryFor] = useState<string | null>(null);
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
          const allSummaries: DischargeSummary[] = [];
          
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
                url: d.url,
                status: d.status,
                finalContent: d.finalContent,
              });
              
              // Check if this document is a discharge summary and add to summaries
              if (d.documentType === 'Discharge Summary' && d.summary) {
                allSummaries.push({
                  id: `summary-${p.id}-${idx + 1}`,
                  patientId: String(p.id),
                  status: d.status || 'Draft',  // Use status from document if available
                  generatedContent: d.summary,
                  finalContent: d.finalContent || d.summary,  // Use finalContent if available
                  createdTimestamp: d.uploadTimestamp || new Date().toISOString(),
                  approvedBy: d.approvedBy,
                  approvalTimestamp: d.approvalTimestamp
                });
              }
            });
          });
          
          setDocuments(allDocs);
          setSummaries(allSummaries);
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
        url: d.url,
        status: d.status,
        finalContent: d.finalContent,
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
        url: d.url,
        status: d.status,
        finalContent: d.finalContent,
      }));
      setDocuments(prev => {
        const filtered = prev.filter(d => d.patientId !== patientId);
        return [...filtered, ...projected];
      });
    }
  };

  const generateSummary = async (patientId: string): Promise<string> => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      // Set global loading state
      setIsGeneratingSummary(true);
      setGeneratingSummaryFor(patientId);
      
      const token = await getIdToken();
      if (!token) throw new Error('Failed to get authentication token');
      
      const res = await fetch(`http://localhost:8000/api/patients/${patientId}/generate-summary/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) {
        throw new Error(`Failed to generate summary: ${res.statusText}`);
      }
      
      const data = await res.json();
      
      // Create new summary document
      const summaryDoc: ClinicalDocument = {
        id: `summary-${patientId}`,
        patientId: patientId,
        practitionerId: user.email || user.fullName || 'Unknown',
        documentType: 'Discharge Summary',
        fileName: data.fileName || 'Discharge Summary',
        uploadTimestamp: new Date().toISOString(),
        summary: data.summary,
        url: data.url,
        status: 'Draft',
        finalContent: undefined,
        approvedBy: undefined,
        approvalTimestamp: undefined
      };
      
      // Add to documents
      setDocuments(prev => [...prev, summaryDoc]);
      
      // Create summary entry
    const newSummary: DischargeSummary = {
        id: `summary-${patientId}`,
        patientId: patientId,
      status: 'Draft',
        generatedContent: data.summary,
        finalContent: undefined,
        createdTimestamp: new Date().toISOString(),
        approvedBy: undefined,
        approvalTimestamp: undefined
    };

    setSummaries(prev => [...prev, newSummary]);
      
    return newSummary.id;
      
    } catch (error) {
      console.error('Error generating summary:', error);
      throw error;
    } finally {
      // Clear global loading state
      setIsGeneratingSummary(false);
      setGeneratingSummaryFor(null);
    }
  };

  const updateSummary = async (id: string, updates: Partial<DischargeSummary>) => {
    try {
      const summary = summaries.find(s => s.id === id);
      if (!summary) return;

      console.log('updateSummary called:', {
        id,
        currentStatus: summary.status,
        updates,
        hasFinalContent: 'finalContent' in updates,
        hasStatus: 'status' in updates,
        finalContentValue: updates.finalContent?.substring(0, 100) + '...',
        statusValue: updates.status
      });

      // First, update local state for immediate UI response
      setSummaries(prev => {
        const updated = prev.map(s => s.id === id ? { ...s, ...updates } : s);
        console.log('Summaries state updated locally:', {
          before: summary,
          after: updated.find(s => s.id === id),
          totalSummaries: updated.length
        });
        return updated;
      });

      // Also update the corresponding document in the documents state
      setDocuments(prev => {
        const updated = prev.map(doc => {
          if (doc.patientId === summary.patientId && doc.documentType === 'Discharge Summary') {
            const updatedDoc = { 
              ...doc, 
              summary: updates.finalContent || doc.summary,
              finalContent: updates.finalContent || doc.finalContent,
              status: updates.status || doc.status,
              approvedBy: updates.approvedBy || doc.approvedBy,
              approvalTimestamp: updates.approvalTimestamp || doc.approvalTimestamp
            };
            console.log('Document state updated locally:', {
              before: doc,
              after: updatedDoc
            });
            return updatedDoc;
          }
          return doc;
        });
        return updated;
      });

      // Now persist to backend
      const token = await getIdToken();
      if (!token) {
        console.error('No authentication token available');
        return;
      }

      const response = await fetch(`http://localhost:8000/api/patients/${summary.patientId}/update-summary/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Backend update successful:', result);

      console.log(`Summary ${id} updated successfully: ${Object.keys(updates).join(', ')}`);
      
    } catch (error) {
      console.error('Error updating summary:', error);
      
      // Revert local state changes on error
      console.log('Reverting local state changes due to backend error');
      setSummaries(prev => prev.map(s => s.id === id ? { ...s } : s));
      
      // Get the summary again to revert document changes
      const summaryToRevert = summaries.find(s => s.id === id);
      if (summaryToRevert) {
        setDocuments(prev => prev.map(doc => {
          if (doc.patientId === summaryToRevert.patientId && doc.documentType === 'Discharge Summary') {
            return { ...doc };
          }
          return doc;
        }));
      }
      
      // Re-throw error so UI can handle it
      throw error;
    }
  };

  const deleteSummary = async (summaryId: string) => {
    try {
      const summary = summaries.find(s => s.id === summaryId);
      if (!summary) return;

      console.log('Deleting summary:', {
        id: summaryId,
        patientId: summary.patientId,
        status: summary.status
      });

      // Remove from summaries state
      setSummaries(prev => prev.filter(s => s.id !== summaryId));

      // Remove the corresponding document from documents state
      setDocuments(prev => prev.filter(doc => 
        !(doc.patientId === summary.patientId && doc.documentType === 'Discharge Summary')
      ));

      console.log(`Summary ${summaryId} deleted successfully`);
      
    } catch (error) {
      console.error('Error deleting summary:', error);
    }
  };

  const deletePatient = async (patientId: string) => {
    try {
      const patient = patients.find(p => p.id === patientId);
      if (!patient) return;

      console.log('Deleting patient:', {
        id: patientId,
        name: `${patient.firstName} ${patient.lastName}`,
        status: patient.status
      });

      const token = await getIdToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`http://localhost:8000/api/patients/${patientId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Backend delete successful:', result);

      // Remove patient from local state
      setPatients(prev => prev.filter(p => p.id !== patientId));

      // Remove all documents and summaries for this patient
      setDocuments(prev => prev.filter(doc => doc.patientId !== patientId));
      setSummaries(prev => prev.filter(summary => summary.patientId !== patientId));

      console.log(`Patient ${patientId} deleted successfully`);
      
    } catch (error) {
      console.error('Error deleting patient:', error);
      throw error;
    }
  };

  const getPatientDocuments = (patientId: string) => {
    return documents.filter(d => d.patientId === patientId);
  };

  const getPatientSummary = (patientId: string) => {
    return summaries.find(s => s.patientId === patientId);
  };

  const refreshSummaries = async () => {
    if (!user) return;
    try {
      const token = await getIdToken();
      if (!token) return;
      
      // Get all patients to extract summaries from their documents
      const res = await fetch('http://localhost:8000/api/patients/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        const allSummaries: DischargeSummary[] = [];
        
        data.forEach((p: any) => {
          const docs: any[] = Array.isArray(p.documents) ? p.documents : [];
          
          // Find the discharge summary document for this patient
          const dischargeSummaryDoc = docs.find(d => d.documentType === 'Discharge Summary' && d.summary);
          
          if (dischargeSummaryDoc) {
            const summaryId = `summary-${p.id}`;
            
            // Check if we have local changes for this summary
            const existingSummary = summaries.find(s => s.id === summaryId);
            
            allSummaries.push({
              id: summaryId,
              patientId: String(p.id),
              // Preserve local status if it exists, otherwise use backend status
              status: existingSummary?.status || dischargeSummaryDoc.status || 'Draft',
              generatedContent: dischargeSummaryDoc.summary,
              // Preserve local finalContent if it exists, otherwise use backend finalContent
              finalContent: existingSummary?.finalContent || dischargeSummaryDoc.finalContent || dischargeSummaryDoc.summary,
              createdTimestamp: dischargeSummaryDoc.uploadTimestamp || new Date().toISOString(),
              // Preserve local approval data if it exists
              approvedBy: existingSummary?.approvedBy || dischargeSummaryDoc.approvedBy,
              approvalTimestamp: existingSummary?.approvalTimestamp || dischargeSummaryDoc.approvalTimestamp
            });
          }
          
          docs.forEach((d: any, idx: number) => {
            const docId = `${p.id}-${idx + 1}`;
            
            // Check if we have local changes for this document
            const existingDoc = documents.find(doc => doc.id === docId);
            
            allDocs.push({
              id: docId,
              patientId: String(p.id),
              practitionerId: d.practitionerId ?? '',
              documentType: d.documentType ?? '',
              fileName: d.fileName ?? '',
              uploadTimestamp: d.uploadTimestamp ?? new Date().toISOString(),
              summary: d.summary,
              // Preserve local changes if they exist
              url: existingDoc?.url || d.url,
              status: existingDoc?.status || d.status,
              finalContent: existingDoc?.finalContent || d.finalContent,
              approvedBy: existingDoc?.approvedBy || d.approvedBy,
              approvalTimestamp: existingDoc?.approvalTimestamp || d.approvalTimestamp
            });
          });
        });
        
        // Update summaries state
        setSummaries(allSummaries);
        
        // Also update documents to ensure consistency
        const allDocs: ClinicalDocument[] = [];
        data.forEach((p: any) => {
          const docs: any[] = Array.isArray(p.documents) ? p.documents : [];
          docs.forEach((d: any, idx: number) => {
            const docId = `${p.id}-${idx + 1}`;
            
            // Check if we have local changes for this document
            const existingDoc = documents.find(doc => doc.id === docId);
            
            allDocs.push({
              id: docId,
              patientId: String(p.id),
              practitionerId: d.practitionerId ?? '',
              documentType: d.documentType ?? '',
              fileName: d.fileName ?? '',
              uploadTimestamp: d.uploadTimestamp ?? new Date().toISOString(),
              summary: d.summary,
              // Preserve local changes if they exist
              url: existingDoc?.url || d.url,
              status: existingDoc?.status || d.status,
              finalContent: existingDoc?.finalContent || d.finalContent,
              approvedBy: existingDoc?.approvedBy || d.approvedBy,
              approvalTimestamp: existingDoc?.approvalTimestamp || d.approvalTimestamp
            });
            
            // Check if this document is a discharge summary and add to summaries
            if (d.documentType === 'Discharge Summary' && d.summary) {
              const summaryId = `summary-${p.id}-${idx + 1}`;
              
              // Check if we have local changes for this summary
              const existingSummary = summaries.find(s => s.id === summaryId);
              
              allSummaries.push({
                id: summaryId,
                patientId: String(p.id),
                // Preserve local status if it exists, otherwise use backend status
                status: existingSummary?.status || d.status || 'Draft',
                generatedContent: d.summary,
                // Preserve local finalContent if it exists, otherwise use backend finalContent
                finalContent: existingSummary?.finalContent || d.finalContent || d.summary,
                createdTimestamp: d.uploadTimestamp || new Date().toISOString(),
                // Preserve local approval data if it exists
                approvedBy: existingSummary?.approvedBy || d.approvedBy,
                approvalTimestamp: existingSummary?.approvalTimestamp || d.approvalTimestamp
              });
            }
          });
        });
        setDocuments(allDocs);
        
        console.log(`Refreshed ${allSummaries.length} summaries and ${allDocs.length} documents with local changes preserved`);
        
        // Debug: Log any summaries that have local changes
        const summariesWithLocalChanges = allSummaries.filter(s => {
          const existing = summaries.find(es => es.id === s.id);
          return existing && (
            existing.status !== s.status ||
            existing.finalContent !== s.finalContent ||
            existing.approvedBy !== s.approvedBy ||
            existing.approvalTimestamp !== s.approvalTimestamp
          );
        });
        
        if (summariesWithLocalChanges.length > 0) {
          console.log('Summaries with local changes preserved:', summariesWithLocalChanges.map(s => ({
            id: s.id,
            status: s.status,
            hasFinalContent: !!s.finalContent,
            approvedBy: s.approvedBy,
            approvalTimestamp: s.approvalTimestamp
          })));
        }
      }
    } catch (error) {
      console.error('Error refreshing summaries:', error);
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
        const allSummaries: DischargeSummary[] = [];
        
        data.forEach((p: any) => {
          const docs: any[] = Array.isArray(p.documents) ? p.documents : [];
          
          // Find the discharge summary document for this patient
          const dischargeSummaryDoc = docs.find(d => d.documentType === 'Discharge Summary' && d.summary);
          
          if (dischargeSummaryDoc) {
            const summaryId = `summary-${p.id}`;
            
            // Check if we have local changes for this summary
            const existingSummary = summaries.find(s => s.id === summaryId);
            
            allSummaries.push({
              id: summaryId,
              patientId: String(p.id),
              // Preserve local status if it exists, otherwise use backend status
              status: existingSummary?.status || dischargeSummaryDoc.status || 'Draft',
              generatedContent: dischargeSummaryDoc.summary,
              // Preserve local finalContent if it exists, otherwise use backend finalContent
              finalContent: existingSummary?.finalContent || dischargeSummaryDoc.finalContent || dischargeSummaryDoc.summary,
              createdTimestamp: dischargeSummaryDoc.uploadTimestamp || new Date().toISOString(),
              // Preserve local approval data if it exists
              approvedBy: existingSummary?.approvedBy || dischargeSummaryDoc.approvedBy,
              approvalTimestamp: existingSummary?.approvalTimestamp || dischargeSummaryDoc.approvalTimestamp
            });
          }
          
          docs.forEach((d: any, idx: number) => {
            const docId = `${p.id}-${idx + 1}`;
            
            // Check if we have local changes for this document
            const existingDoc = documents.find(doc => doc.id === docId);
            
            allDocs.push({
              id: docId,
              patientId: String(p.id),
              practitionerId: d.practitionerId ?? '',
              documentType: d.documentType ?? '',
              fileName: d.fileName ?? '',
              uploadTimestamp: d.uploadTimestamp ?? new Date().toISOString(),
              summary: d.summary,
              // Preserve local changes if they exist
              url: existingDoc?.url || d.url,
              status: existingDoc?.status || d.status,
              finalContent: existingDoc?.finalContent || d.finalContent,
              approvedBy: existingDoc?.approvedBy || d.approvedBy,
              approvalTimestamp: existingDoc?.approvalTimestamp || d.approvalTimestamp
            });
          });
        });
        
        setDocuments(allDocs);
        setSummaries(allSummaries);
      }
    } catch (error) {
      console.error('Error refreshing patients:', error);
    }
  };

  return (
    <DataContext.Provider value={{
      patients,
      documents,
      summaries,
      isLoading,
      isGeneratingSummary,
      generatingSummaryFor,
      addPatient,
      updatePatient,
      deletePatient,
      addDocument,
      deleteDocument,
      generateSummary,
      updateSummary,
      deleteSummary,
      getPatientDocuments,
      getPatientSummary,
      refreshPatients,
      refreshSummaries
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