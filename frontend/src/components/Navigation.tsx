import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, FileText, ClipboardList, Home, LogOut, Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import OpenRoomLogo from '../assets/OpenRoomLogo.png';

export default function Navigation() {
  const location = useLocation();
  const { user, institution, logout } = useAuth();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/institution', label: 'Institution', icon: Building2 },
    { path: '/patients', label: 'Patients', icon: Users },
    { path: '/documents', label: 'Documents', icon: FileText },
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
        
        {/* Institution Information */}
        {institution && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-3 mb-3">
              {institution.logo ? (
                <img 
                  src={institution.logo} 
                  alt={institution.name}
                  className="h-10 w-10 rounded-lg object-cover"
                />
              ) : (
                <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-gray-900">{institution.name}</p>
                <p className="text-xs text-gray-500">{institution.type}</p>
              </div>
            </div>
            
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs text-blue-800 font-medium mb-1">Your Institution</p>
              <p className="text-xs text-blue-600">
                Est. {institution.established || 'N/A'}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {institution.phone}
              </p>
            </div>
          </div>
        )}
        
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
      </div>
    </aside>
  );
} 