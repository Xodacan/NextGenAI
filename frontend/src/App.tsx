import React from 'react';
import { AuthProvider } from './contexts/MockAuthContext';
import { DataProvider } from './contexts/DataContext';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PatientsPage from './pages/PatientsPage';
import PatientDetailPage from './pages/PatientDetailPage';
import DocumentsPage from './pages/DocumentsPage';
import DocumentsGlobalPage from './pages/DocumentsGlobalPage';
import SummaryEditorPage from './pages/SummaryEditorPage';
import SummariesPage from './pages/SummariesPage';

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DashboardPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/patients"
              element={
                <ProtectedRoute>
                  <Layout>
                    <PatientsPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/patients/:patientId"
              element={
                <ProtectedRoute>
                  <Layout>
                    <PatientDetailPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
                          <Route
                path="/patients/:patientId/documents"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <DocumentsPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patients/:patientId/summary/:summaryId"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <SummaryEditorPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/documents"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <DocumentsGlobalPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
                            <Route
                path="/summaries"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <SummariesPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;