
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { UserCheck, ArrowLeft } from 'lucide-react';

const GuestLogin = () => {
  const [guestCode, setGuestCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { guestLogin, user, isLoading } = useAuth();
  const navigate = useNavigate();

  console.log('GuestLogin component - Auth state:', { user: user?.email || 'null', isLoading });

  useEffect(() => {
    console.log('GuestLogin useEffect triggered, user:', user);
    if (user && !isLoading && user.role === 'guest') {
      console.log('Guest user authenticated, navigating to guest form');
      navigate('/guest-form');
    }
  }, [user, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    console.log('Attempting guest login with code:', guestCode);
    
    try {
      const { error } = await guestLogin(guestCode);
      
      if (error) {
        console.error('Guest login error:', error);
        toast({
          title: "Login Failed",
          description: error,
          variant: "destructive"
        });
      } else {
        console.log('Guest login successful');
        toast({
          title: "Welcome Guest!",
          description: "Please fill out the visitor form."
        });
      }
    } catch (err) {
      console.error('Guest login exception:', err);
      toast({
        title: "Login Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const mockGuestCodes = [
    { code: 'GUEST123', description: 'General Guest Access' },
    { code: 'VISITOR001', description: 'Visitor Access' },
    { code: 'TEMP2024', description: 'Temporary Access' }
  ];

  if (isLoading && !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-green-50 to-emerald-100 flex items-center justify-center p-4 relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-green-400/20 to-emerald-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-green-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="w-full h-full max-w-6xl overflow-y-auto scrollbar-hidden grid lg:grid-cols-2 gap-12 items-center relative z-10">
        {/* Left side - Branding */}
        <div className="text-center lg:text-left space-y-8">
          <div className="space-y-6">
            <div className="relative">
              <h1 className="text-5xl lg:text-7xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Guest
              </h1>
              <p className="text-2xl lg:text-3xl text-gray-700 font-medium">
                Access Portal
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <p className="text-lg text-gray-600 max-w-md mx-auto lg:mx-0 leading-relaxed">
              Secure guest access to our facilities. Please use your provided guest code to continue.
            </p>
            
            {/* Demo Guest Codes */}
            <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl border border-white/50 shadow-lg">
              <h3 className="text-lg font-bold text-gray-800 mb-4">🔑 Demo Guest Codes</h3>
              <p className="text-sm text-gray-600 mb-4">
                Use these demo guest codes to test the application:
              </p>
              <div className="space-y-3">
                {mockGuestCodes.map((guest, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800">{guest.description}</p>
                      <p className="text-sm text-gray-600">{guest.code}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setGuestCode(guest.code)}
                    >
                      Use
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Guest Login Form */}
        <div className="w-full max-w-md mx-auto">
          <Card className="shadow-2xl bg-white/95 backdrop-blur-sm border-0 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-green-50/50"></div>
            
            <CardHeader className="text-center space-y-3 relative z-10">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <UserCheck className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                Guest Access
              </CardTitle>
              <CardDescription className="text-gray-600">
                Enter your guest code to continue
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 relative z-10">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="guestCode" className="text-gray-700 font-medium">Guest Code</Label>
                  <Input
                    id="guestCode"
                    type="text"
                    value={guestCode}
                    onChange={(e) => setGuestCode(e.target.value.toUpperCase())}
                    placeholder="Enter your guest code"
                    required
                    className="h-12 bg-white/70 border-gray-200 focus:border-green-500 focus:ring-green-500/20 transition-all duration-200"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                  disabled={isSubmitting || isLoading}
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <UserCheck className="w-5 h-5" />
                      <span>Access Portal</span>
                    </div>
                  )}
                </Button>
              </form>

              <div className="text-center space-y-4">
                <Link to="/login">
                  <Button variant="ghost" className="text-gray-600 hover:text-gray-800">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Employee Login
                  </Button>
                </Link>
                <p className="text-sm text-gray-500">
                  Don't have a guest code? Contact reception for assistance.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GuestLogin;
