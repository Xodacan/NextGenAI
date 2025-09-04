import React, { useState } from 'react';
import { X, Upload, FileText, Loader } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { getIdToken } from '../firebase/auth';

interface DocumentUploadModalProps {
  patientId: string;
  onClose: () => void;
}

export default function DocumentUploadModal({ patientId, onClose }: DocumentUploadModalProps) {
  const { addDocument, refreshPatients, showGlobalNotice } = useData();
  const { user } = useAuth();
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [documentType, setDocumentType] = useState('Lab Results');
  const [isLoading, setIsLoading] = useState(false);

  const documentTypes = [
    'Admission Form',
    'Lab Results',
    'Radiology Report',
    'Progress Note',
    'Medication Record',
    'Consultation Note',
    'Discharge Planning',
    'Text Document',
    'Other'
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsLoading(true);

    try {
      const token = await getIdToken();
      console.log('Got token:', token ? 'Token exists' : 'No token');
      console.log('User:', user);
      
      // Upload each file using new backend system
      for (const file of selectedFiles) {
        console.log('Processing file:', file.name);

        // Upload document using new backend system
        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentType', documentType);
        
        const patientDocResponse = await fetch(`http://localhost:8000/api/patients/${patientId}/documents/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            // Don't set Content-Type for FormData - browser will set it with boundary
          },
          body: formData,
        });

        if (!patientDocResponse.ok) {
          const errorText = await patientDocResponse.text();
          console.error('Patient doc response error:', errorText);
          throw new Error(`Failed to add document entry for ${file.name}: ${patientDocResponse.status} ${errorText}`);
        }
        
        // Get the response data
        const responseData = await patientDocResponse.json();
        console.log('Document uploaded successfully:', responseData);
      }

      // Refresh the documents list to show the newly uploaded files
      await refreshPatients();

      // Show success notification
      const fileNames = selectedFiles.map(file => file.name).join(', ');
      showGlobalNotice('success', 'Document Uploaded', `${fileNames} uploaded successfully`, true);

      onClose();
    } catch (error) {
      console.error('Upload failed:', error);
      const fileNames = selectedFiles.map(file => file.name).join(', ');
      showGlobalNotice('error', 'Upload Failed', `Failed to upload ${fileNames}. Please try again.`, true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Upload Clinical Document</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document Type
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {documentTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragOver 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 mb-2">
              Drag and drop files here, or click to browse
            </p>
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.txt"
              onChange={handleFileSelect}
              className="hidden"
              id="file-input"
            />
            <label
              htmlFor="file-input"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
            >
              Browse Files
            </label>
            <p className="text-xs text-gray-500 mt-2">
              Supported: PDF, DOCX, DOC, JPG, PNG, TXT
            </p>
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Selected Files:</p>
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-700 truncate">{file.name}</span>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-6">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <span>Upload {selectedFiles.length > 0 && `(${selectedFiles.length})`}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}