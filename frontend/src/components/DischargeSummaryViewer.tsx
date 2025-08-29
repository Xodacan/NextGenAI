import React from 'react';
import { FileText, Calendar, User, Pill, Stethoscope, CheckCircle } from 'lucide-react';

interface DischargeSummary {
  id: number;
  patient_name: string;
  admission_date: string;
  discharge_date: string;
  primary_diagnosis: string;
  secondary_diagnoses: string;
  procedures_performed: string;
  medications: string;
  vital_signs: string;
  lab_results: string;
  imaging_results: string;
  hospital_course: string;
  discharge_condition: string;
  discharge_instructions: string;
  follow_up_plan: string;
  formatted_summary: string;
  status: string;
  created_at: string;
  finalized_at: string;
}

interface DischargeSummaryViewerProps {
  summary: DischargeSummary;
  onClose: () => void;
}

export default function DischargeSummaryViewer({ summary, onClose }: DischargeSummaryViewerProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Discharge Summary</h2>
              <p className="text-sm text-gray-500">Patient: {summary.patient_name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              summary.status === 'finalized' ? 'bg-green-100 text-green-800' :
              summary.status === 'approved' ? 'bg-blue-100 text-blue-800' :
              summary.status === 'reviewed' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {summary.status.charAt(0).toUpperCase() + summary.status.slice(1)}
            </span>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {summary.formatted_summary ? (
            // Display the formatted summary
            <div className="prose max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed bg-gray-50 p-4 rounded-lg border">
                {summary.formatted_summary}
              </pre>
            </div>
          ) : (
            // Fallback to structured display
            <div className="space-y-6">
              {/* Patient Information */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Patient Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Patient Name</p>
                    <p className="text-gray-900">{summary.patient_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Primary Diagnosis</p>
                    <p className="text-gray-900">{summary.primary_diagnosis || 'Not specified'}</p>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Hospital Stay
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Admission Date</p>
                    <p className="text-gray-900">{summary.admission_date}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Discharge Date</p>
                    <p className="text-gray-900">{summary.discharge_date}</p>
                  </div>
                </div>
              </div>

              {/* Medications */}
              {summary.medications && (
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-purple-900 mb-3 flex items-center">
                    <Pill className="h-5 w-5 mr-2" />
                    Discharge Medications
                  </h3>
                  <div className="whitespace-pre-wrap text-gray-900">{summary.medications}</div>
                </div>
              )}

              {/* Hospital Course */}
              {summary.hospital_course && (
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-orange-900 mb-3 flex items-center">
                    <Stethoscope className="h-5 w-5 mr-2" />
                    Hospital Course
                  </h3>
                  <div className="whitespace-pre-wrap text-gray-900">{summary.hospital_course}</div>
                </div>
              )}

              {/* Follow-up Plan */}
              {summary.follow_up_plan && (
                <div className="bg-teal-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-teal-900 mb-3 flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Follow-up Plan
                  </h3>
                  <div className="whitespace-pre-wrap text-gray-900">{summary.follow_up_plan}</div>
                </div>
              )}

              {/* Discharge Instructions */}
              {summary.discharge_instructions && (
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-indigo-900 mb-3">
                    Patient Education & Instructions
                  </h3>
                  <div className="whitespace-pre-wrap text-gray-900">{summary.discharge_instructions}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Created: {new Date(summary.created_at).toLocaleDateString()}
            {summary.finalized_at && (
              <span className="ml-4">
                Finalized: {new Date(summary.finalized_at).toLocaleDateString()}
              </span>
            )}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Print
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
