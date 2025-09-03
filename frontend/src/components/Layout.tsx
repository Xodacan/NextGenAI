import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import Navigation from './Navigation';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { isGeneratingSummary, generatingSummaryFor } = useData();
  const [dismissedGlobalPopup, setDismissedGlobalPopup] = useState(false);

  // Reset dismissed state when generation starts
  React.useEffect(() => {
    if (isGeneratingSummary) {
      setDismissedGlobalPopup(false);
    }
  }, [isGeneratingSummary]);

  if (!user) {
    return <div>{children}</div>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Navigation />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          {children}
        </main>
      </div>
      
      {/* Global Loading Overlay for Summary Generation */}
      {isGeneratingSummary && !dismissedGlobalPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center relative">
            <button
              onClick={() => setDismissedGlobalPopup(true)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              title="Dismiss (generation will continue in background)"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              OpenRoom is generating your summary
            </h3>
            <p className="text-gray-600 mb-4">
              We're analyzing your clinical documents and creating a comprehensive discharge summary. 
              This may take a few moments.
            </p>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-blue-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Processing documents</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-blue-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <span>Analyzing content</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-blue-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                <span>Generating summary</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              💡 You can dismiss this notification and continue using OpenRoom while we work on your summary
            </p>
          </div>
        </div>
      )}
    </div>
  );
} 