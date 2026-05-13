import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Login from "./pages/Login";
import GuestLogin from "./pages/GuestLogin";
import GuestFormPage from "./pages/GuestFormPage";
import HRDashboard from "./pages/HRDashboard";
import SecurityDashboard from "./pages/SecurityDashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/guest-login" element={<GuestLogin />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route
              path="/guest-form"
              element={
                <ProtectedRoute allowedRoles={["guest"]}>
                  <GuestFormPage />
                </ProtectedRoute>
              }
            />
            {/* Admin dashboard (formerly HR) */}
            <Route
              path="/admin-dashboard"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <HRDashboard />
                </ProtectedRoute>
              }
            />
            {/* Gatekeeper dashboard (formerly Security) */}
            <Route
              path="/gatekeeper-dashboard"
              element={
                <ProtectedRoute allowedRoles={["gatekeeper"]}>
                  <SecurityDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee-dashboard"
              element={
                <ProtectedRoute allowedRoles={["employee"]}>
                  <EmployeeDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
