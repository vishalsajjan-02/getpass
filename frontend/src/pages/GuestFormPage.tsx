
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import GuestForm from '../components/GuestForm';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

const GuestFormPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.role !== 'guest') {
      navigate('/guest-login');
    }
  }, [user, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user || user.role !== 'guest') {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-green-50 to-emerald-100">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto"></div>
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Header with logout */}
      <div className="absolute top-4 right-4 z-20">
        <Button 
          variant="outline" 
          onClick={handleLogout}
          className="bg-white/90 backdrop-blur-sm hover:bg-white border-gray-200"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>

      {/* Guest Form */}
      <GuestForm />
    </div>
  );
};

export default GuestFormPage;
