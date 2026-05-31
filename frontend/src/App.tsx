import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, GuestRoute } from '@/components/ProtectedRoute';
import SplashPage from '@/pages/SplashPage';
import OnboardingPage from '@/pages/OnboardingPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import DashboardPage from '@/pages/DashboardPage';
import MapPage from '@/pages/MapPage';
import SosPage from '@/pages/SosPage';
import AlertsPage from '@/pages/AlertsPage';
import ProfilePage from '@/pages/ProfilePage';
import SafetyScorePage from '@/pages/SafetyScorePage';
import TravelAiPage from '@/pages/TravelAiPage';
import DigitalIdPage from '@/pages/DigitalIdPage';
import TravelHistoryPage from '@/pages/TravelHistoryPage';
import EmergencyContactsPage from '@/pages/EmergencyContactsPage';
import SettingsPage from '@/pages/SettingsPage';
import AdminPage from '@/pages/AdminPage';
import VerifyEmailPage from '@/pages/VerifyEmailPage';
import VerifyPassportPage from '@/pages/VerifyPassportPage';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { initializeSocket, disconnectSocket } from '@/api/socket';

export default function App() {
  const { isAuthenticated, accessToken } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      initializeSocket(accessToken);
    } else {
      disconnectSocket();
    }
    
    return () => disconnectSocket();
  }, [isAuthenticated, accessToken]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SplashPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/verify-passport" element={<VerifyPassportPage />} />

        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/sos" element={<SosPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/safety-score" element={<SafetyScorePage />} />
          <Route path="/travel-ai" element={<TravelAiPage />} />
          <Route path="/digital-id" element={<DigitalIdPage />} />
          <Route path="/travel-history" element={<TravelHistoryPage />} />
          <Route path="/emergency-contacts" element={<EmergencyContactsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route element={<ProtectedRoute adminOnly />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
