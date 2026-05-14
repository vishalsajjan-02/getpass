
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff, LogIn, UserCheck } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, user, isLoading } = useAuth();
  const navigate = useNavigate();

  console.log('Login component - Auth state:', { user: user?.email || 'null', isLoading });

  useEffect(() => {
    console.log('Login useEffect triggered, user:', user);
    if (user && !isLoading) {
      console.log('User role:', user.role);
      switch (user.role) {
        case 'admin':
        case 'manager':
          navigate('/admin-dashboard');
          break;
        case 'gatekeeper':
          navigate('/gatekeeper-dashboard');
          break;
        case 'employee':
          navigate('/employee-dashboard');
          break;
        case 'guest':
          navigate('/guest-form');
          break;
        default:
          navigate('/employee-dashboard');
          break;
      }
    }
  }, [user, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    console.log('Attempting login with:', email);

    try {
      const { error } = await login(email, password);
      
      if (error) {
        console.error('Login error:', error);
        toast({
          title: "Login Failed",
          description: error,
          variant: "destructive"
        });
      } else {
        console.log('Login successful');
        toast({
          title: "Login Successful",
          description: "Welcome to Gatepass Management System!"
        });
        // Navigation will be handled by the useEffect when user state updates
      }
    } catch (err) {
      console.error('Login exception:', err);
      toast({
        title: "Login Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const demoCredentials = [
    { email: 'admin@company.com', password: 'Admin@123', role: 'Admin' },
    { email: 'manager@company.com', password: 'Manager@123', role: 'Manager' },
    { email: 'gatekeeper@company.com', password: 'Gate@123', role: 'Gatekeeper' },
    { email: 'employee@company.com', password: 'Emp@123', role: 'Employee' },
  ];

  // Show loading spinner during initial auth check
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
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4 relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-green-400/20 to-blue-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="w-full h-full max-w-7xl overflow-y-auto scrollbar-hidden grid lg:grid-cols-2 gap-12 items-center relative z-10">
        {/* Left side - Enhanced Branding */}
        <div className="text-center lg:text-left space-y-8">
          <div className="space-y-6">
            <div className="relative">
              <h1 className="text-5xl lg:text-7xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent animate-fade-in">
                Gatepass
              </h1>
              <div className="absolute -top-2 -left-2 w-4 h-4 bg-blue-500 rounded-full animate-ping"></div>
              <div className="absolute -bottom-2 -right-2 w-3 h-3 bg-purple-500 rounded-full animate-ping delay-500"></div>
            </div>
            <p className="text-2xl lg:text-3xl text-gray-700 font-medium">
              Management System
            </p>
          </div>

          <div className="space-y-6">
            <p className="text-lg text-gray-600 max-w-md mx-auto lg:mx-0 leading-relaxed">
              Transform your organization's security with our cutting-edge, 
              intelligent gatepass management solution designed for the modern workplace.
            </p>
            
            {/* Demo Credentials */}
            <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl border border-white/50 shadow-lg">
              <h3 className="text-lg font-bold text-gray-800 mb-4">🚀 Demo Credentials</h3>
              <p className="text-sm text-gray-600 mb-4">
                Use these demo credentials to test the application:
              </p>
              <div className="space-y-3">
                {demoCredentials.map((cred, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800">{cred.role}</p>
                      <p className="text-sm text-gray-600">{cred.email}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setEmail(cred.email);
                        setPassword(cred.password);
                      }}
                    >
                      Use
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Guest Access Button */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-200 shadow-lg">
              <h3 className="text-lg font-bold text-gray-800 mb-3">👋 Guest Access</h3>
              <p className="text-sm text-gray-600 mb-4">
                Visiting our facilities? Access the guest portal here:
              </p>
              <Link to="/guest-login">
                <Button 
                  variant="outline" 
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 hover:from-green-600 hover:to-emerald-600 transition-all duration-300"
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  Guest Login Portal
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Right side - Login Form */}
        <div className="w-full max-w-md mx-auto">
          <Card className="shadow-2xl bg-white/95 backdrop-blur-sm border-0 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-blue-50/50"></div>
            
            <CardHeader className="text-center space-y-3 relative z-10">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <LogIn className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                Welcome Back
              </CardTitle>
              <CardDescription className="text-gray-600">
                Sign in to access your dashboard
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 relative z-10">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="identifier" className="text-gray-700 font-medium">Email or Username</Label>
                  <Input
                    id="identifier"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email or username"
                    required
                    className="h-12 bg-white/70 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="h-12 bg-white/70 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                  disabled={isSubmitting || isLoading}
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Signing In...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <LogIn className="w-5 h-5" />
                      <span>Sign In</span>
                    </div>
                  )}
                </Button>
              </form>

              <div className="text-center">
                <p className="text-sm text-gray-500">
                  Use the demo credentials above to test the application
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
