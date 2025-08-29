import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, FileText, ClipboardList, Home, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import OpenRoomLogo from '../assets/OpenRoomLogo.png';

export default function Navigation() {
  const location = useLocation();
  const { logout } = useAuth();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
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