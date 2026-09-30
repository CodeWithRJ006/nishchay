import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/Home';
import { DesignPage } from './pages/Design';
import { LoginPage, RegisterPage } from './pages/Auth';
import { DesktopShell } from './shells';
import { ErrorState } from './components';
import FieldApp from './pages/FieldApp';
import ReceiptView from './pages/ReceiptView';
import SandboxPayment from './pages/SandboxPayment';
import CertificateView from './pages/CertificateView';
import Verify from './pages/Verify';
import { BusinessDashboard, LMODashboard, GATCDashboard, AdminDashboard } from './pages/Dashboards';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data && data.role) {
          setRole(data.role);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!role || !allowedRoles.includes(role)) return <Navigate to="/login" />;

  return <DesktopShell role={role} user="User">{children}</DesktopShell>;
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="max-w-md w-full">
        <ErrorState message="The page you are looking for does not exist (404)." />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        {import.meta.env.VITE_DEMO_MODE === 'true' && <Route path="/design" element={<DesignPage />} />}
        
        <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['BUSINESS']}><BusinessDashboard /></ProtectedRoute>} />
        <Route path="/applications" element={<ProtectedRoute allowedRoles={['BUSINESS']}><div>Applications</div></ProtectedRoute>} />
        
        <Route path="/lmo" element={<ProtectedRoute allowedRoles={['LMO']}><LMODashboard /></ProtectedRoute>} />
        <Route path="/gatc" element={<ProtectedRoute allowedRoles={['GATC']}><GATCDashboard /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        
        <Route path="/field" element={<FieldApp />} />
        <Route path="/sandbox/payment" element={<SandboxPayment />} />
        <Route path="/receipts/:id" element={<ReceiptView />} />
        <Route path="/certificates/:id" element={<ProtectedRoute allowedRoles={['BUSINESS', 'LMO', 'GATC', 'ADMIN']}><CertificateView /></ProtectedRoute>} />
        <Route path="/verify/:id" element={<Verify />} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
