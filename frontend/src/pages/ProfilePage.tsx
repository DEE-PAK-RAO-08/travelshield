import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IdCard, History, Phone, Settings, LogOut, ChevronRight, User } from 'lucide-react';
import { BackgroundGlow } from '@/components/ui/BackgroundGlow';
import { BottomNav } from '@/components/layout/BottomNav';
import { useAuthStore } from '@/store/authStore';
import { authApi, dashboardApi } from '@/api/client';

const menuItems = [
  { icon: IdCard, label: 'Digital ID & Passport', path: '/digital-id' },
  { icon: History, label: 'Travel History', path: '/travel-history' },
  { icon: Phone, label: 'Emergency Contacts', path: '/emergency-contacts' },
  { icon: Settings, label: 'Preferences & Settings', path: '/settings' },
];

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [safetyScore, setSafetyScore] = useState<number | null>(null);

  useEffect(() => {
    dashboardApi.get()
      .then(({ data: res }) => setSafetyScore(res.data.safetyStatus.score))
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) await authApi.logout(refreshToken).catch(() => {});
    logout();
    navigate('/login');
  };

  return (
    <BackgroundGlow>
      <div className="px-6 pt-8 pb-28 lg:max-w-lg lg:mx-auto">
        <h1 className="font-grotesk font-bold text-2xl text-white text-center mb-8">Tourist Profile</h1>

        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full bg-navy-card border-2 border-cyan/30 flex items-center justify-center mb-3">
            <User className="w-10 h-10 text-cyan" />
          </div>
          <h2 className="font-grotesk font-bold text-xl text-white">{user?.firstName} {user?.lastName}</h2>
          <p className="text-white/60 text-sm">Verified Tourist ID: #{user?.profile?.touristId || 'TS-8924'}</p>
        </div>

        <div className="space-y-2">
          {menuItems.map(({ icon: Icon, label, path }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="w-full glass-card p-4 flex items-center gap-4 hover:border-cyan/20 transition-colors"
            >
              <Icon className="w-5 h-5 text-cyan" />
              <span className="flex-1 text-left text-sm text-white">{label}</span>
              <ChevronRight className="w-4 h-4 text-white/40" />
            </button>
          ))}
          <button onClick={() => navigate('/safety-score')} className="w-full glass-card p-4 flex items-center gap-4 hover:border-cyan/20">
            <span className="text-cyan font-bold text-lg">{safetyScore ?? '—'}</span>
            <span className="flex-1 text-left text-sm text-white">Safety Score</span>
            <ChevronRight className="w-4 h-4 text-white/40" />
          </button>
        </div>

        <button onClick={handleLogout} className="w-full mt-6 flex items-center justify-center gap-2 text-danger text-sm py-3">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
      <BottomNav />
    </BackgroundGlow>
  );
}
