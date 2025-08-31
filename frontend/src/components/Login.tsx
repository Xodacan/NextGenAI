import React, { useState, useEffect } from 'react';
import { Lock, Mail, AlertCircle, Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Mock institutions for login selection
  const institutions = [
    { id: 'mgh', name: 'Massachusetts General Hospital', domain: 'mgh.harvard.edu' },
    { id: 'mayo', name: 'Mayo Clinic', domain: 'mayo.edu' },
    { id: 'jhh', name: 'Johns Hopkins Hospital', domain: 'jhmi.edu' },
    { id: 'cleveland', name: 'Cleveland Clinic', domain: 'ccf.org' },
    { id: 'stanford', name: 'Stanford Health Care', domain: 'stanfordhealthcare.org' }
  ];

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Auto-select institution based on email domain
  useEffect(() => {
    if (email.includes('@')) {
      const domain = email.split('@')[1];
      const matchingInstitution = institutions.find(inst => 
        domain.includes(inst.domain.split('.')[0])
      );
      if (matchingInstitution) {
        setSelectedInstitution(matchingInstitution.id);
      }
    }
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!selectedInstitution) {
      setError('Please select your institution');
      return;
    }
    
    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        navigate('/dashboard');
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto rounded-xl flex items-center justify-center">
            <img src="../src/assets/OpenroomLogo.png" alt="OpenRoomAI"  />
          </div>

          <p className="mt-2 text-sm text-gray-600">
            Intelligent Healthcare Documentation Platform
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow-lg rounded-xl">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="institution" className="block text-sm font-medium text-gray-700 mb-2">
                Select Your Institution
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building2 className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  id="institution"
                  value={selectedInstitution}
                  onChange={(e) => setSelectedInstitution(e.target.value)}
                  className="appearance-none relative block w-full pl-10 pr-8 py-3 border border-gray-300 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Choose your hospital...</option>
                  {institutions.map(institution => (
                    <option key={institution.id} value={institution.id}>
                      {institution.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10"
                  placeholder="doctor@hospital.com"
                />
              </div>
              {selectedInstitution && (
                <p className="mt-1 text-xs text-blue-600">
                  Logging into {institutions.find(i => i.id === selectedInstitution)?.name}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10"
                  placeholder="Password"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          
          {/* Demo Credentials */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center mb-3">Demo Credentials:</p>
            <div className="space-y-2 text-xs">
              <div className="bg-gray-50 p-2 rounded">
                <p className="font-medium text-gray-700">Massachusetts General Hospital</p>
                <p className="text-gray-600">doctor@mgh.harvard.edu / demo123</p>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <p className="font-medium text-gray-700">Mayo Clinic</p>
                <p className="text-gray-600">doctor@mayo.edu / demo123</p>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <p className="font-medium text-gray-700">Johns Hopkins Hospital</p>
                <p className="text-gray-600">doctor@jhmi.edu / demo123</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}