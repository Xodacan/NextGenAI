import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, ClipboardList, Home, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import OpenRoomLogo from '../assets/OpenRoomLogo.png';

export default function Navigation() {
  const location = useLocation();
  const { user, institution, logout } = useAuth();
  const { globalNotice } = useData();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/patients', label: 'Patients', icon: Users },
    { path: '/summaries', label: 'Summaries', icon: ClipboardList },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 p-6">
      <div className="mb-8">
        <img src={OpenRoomLogo} alt="OpenRoomAI" className="h-8" />
        <p className="text-sm text-gray-600">Healthcare Management</p>
        

        
        {/* Welcome Message */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-600">
            Welcome back, {(() => {
              if (!user) return 'Doctor';
              // Use displayName from backend if available, fall back to fullName, then email
              if (user.displayName) return user.displayName;
              if (user.fullName && user.fullName !== 'Unknown User') return user.fullName;
              // Derive name from email before '@' and capitalize first letter
              const nameFromEmail = user.email?.split('@')[0] || 'Doctor';
              return nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);
            })()}!
          </p>
        </div>
      </div>
      
      <nav className="space-y-2 mb-8">
        {menuItems.map(item => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 pt-4">
        <button
          onClick={logout}
          className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <LogOut className="h-5 w-5 text-gray-400" />
          <span className="font-medium">Logout</span>
        </button>
        
        {/* Global Notifications Area */}
        {globalNotice.isVisible && (
          <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-start space-x-2">
              <div className="flex-shrink-0 mt-0.5">
                {globalNotice.type === 'success' && (
                  <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                {globalNotice.type === 'success-blue' && (
                  <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                {globalNotice.type === 'error' && (
                  <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                {globalNotice.type === 'info' && (
                  <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                {globalNotice.type === 'loading' && (
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-gray-900 leading-tight">
                  {globalNotice.title}
                </h4>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed break-words">
                  {globalNotice.message}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
} 