import React from 'react';
import { LogOut, Bell, Building2, MapPin } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Header() {
  const { user, institution, logout } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <img src="../src/assets/OpenroomLogo.png" alt="OpenRoomAI" className="h-8" />
          
          {/* Institution Information */}
          {institution && (
            <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
              {institution.logo ? (
                <img 
                  src={institution.logo} 
                  alt={institution.name}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-blue-600" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-gray-900">{institution.name}</p>
                <p className="text-xs text-gray-500 flex items-center">
                  <MapPin className="h-3 w-3 mr-1" />
                  {institution.type}
                </p>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="h-5 w-5" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user?.displayName || user?.fullName}</p>
              <p className="text-xs text-gray-500">
                {user?.role} {institution && `• ${institution.name}`}
              </p>
            </div>
            
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              title="Sign out"
            >
              <img src="/src/assets/Icons_Miscellaneous_SignOut.png" alt="Sign Out" className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}