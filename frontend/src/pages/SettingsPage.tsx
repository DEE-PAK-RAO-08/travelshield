import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackgroundGlow } from '@/components/ui/BackgroundGlow';
import { PageHeader } from '@/components/layout/BottomNav';
import { dashboardApi, authApi } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { BiometricModal } from '@/components/ui/BiometricModal';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [isBiometricOpen, setIsBiometricOpen] = useState(false);

  useEffect(() => {
    authApi.me().then(({ data }) => {
      const user = data.data;
      setPrefs({
        ...user.preferences,
        biometricEnabled: user.profile?.biometricEnabled || false,
      });
    }).catch(() => {
      dashboardApi.preferences().then(({ data }) => setPrefs(data.data));
    });
  }, []);

  const toggle = async (key: string) => {
    if (key === 'biometricEnabled') {
      if (!prefs[key]) {
        // Turning biometric ON - open verification modal
        setIsBiometricOpen(true);
      } else {
        // Turning biometric OFF
        const updated = { ...prefs, [key]: false };
        setPrefs(updated);
        await dashboardApi.updatePreferences({ biometricEnabled: false });
        localStorage.removeItem('travelshield-biometric');
      }
      return;
    }

    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    await dashboardApi.updatePreferences({ [key]: updated[key] });
  };

  const handleBiometricSuccess = async () => {
    setIsBiometricOpen(false);
    const updated = { ...prefs, biometricEnabled: true };
    setPrefs(updated);
    
    // Save to database
    await dashboardApi.updatePreferences({ biometricEnabled: true });
    
    // Save token securely in local context for session recovery
    const auth = useAuthStore.getState();
    if (auth.refreshToken && auth.user) {
      localStorage.setItem('travelshield-biometric', JSON.stringify({
        email: auth.user.email,
        refreshToken: auth.refreshToken,
      }));
    }
  };

  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('travelshield_gemini_api_key') || '');

  const settings = [
    { key: 'pushNotifications', label: 'Push Notifications', desc: 'Receive safety alerts on device' },
    { key: 'emailNotifications', label: 'Email Notifications', desc: 'Get email summaries of activity' },
    { key: 'smsAlerts', label: 'SMS Alerts', desc: 'Critical alerts via SMS' },
    { key: 'shareLocation', label: 'Share Location', desc: 'Enable real-time location tracking' },
    { key: 'autoSosEnabled', label: 'Auto SOS', desc: 'Automatic SOS on fall detection' },
    { key: 'biometricEnabled', label: 'Biometric Login', desc: 'Enable fingerprint or face unlock' },
    { key: 'darkMode', label: 'Dark Mode', desc: 'Use dark theme (always on)' },
  ];

  return (
    <BackgroundGlow>
      <PageHeader title="Settings" onBack={() => navigate(-1)} />
      <div className="px-6 pb-8 lg:max-w-lg lg:mx-auto space-y-3">
        {settings.map(({ key, label, desc }) => (
          <div key={key} className="glass-card p-4 flex items-center justify-between animate-fadeSlideUp">
            <div>
              <p className="text-white text-sm font-semibold">{label}</p>
              <p className="text-white/40 text-xs mt-0.5">{desc}</p>
            </div>
            <button
              onClick={() => toggle(key)}
              className={`w-11 h-6 rounded-full transition-colors relative ${prefs[key] ? 'bg-cyan-button' : 'bg-white/20'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${prefs[key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        ))}

        {/* Gemini API Key Configuration */}
        <div className="glass-card p-4 space-y-3 animate-fadeSlideUp" style={{ animationDelay: '0.1s' }}>
          <div>
            <p className="text-white text-sm font-semibold">Google Gemini API Key</p>
            <p className="text-white/40 text-xs mt-0.5">Powers your chatbot with real AI answers. Get a free key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-cyan underline">Google AI Studio</a>.</p>
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => {
                setGeminiKey(e.target.value);
                localStorage.setItem('travelshield_gemini_api_key', e.target.value);
              }}
              placeholder="Paste AIzaSy... key"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan/50"
            />
            {geminiKey && (
              <button
                onClick={() => {
                  setGeminiKey('');
                  localStorage.removeItem('travelshield_gemini_api_key');
                }}
                className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-semibold transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <BiometricModal 
        isOpen={isBiometricOpen}
        onClose={() => setIsBiometricOpen(false)}
        onSuccess={handleBiometricSuccess}
        action="register"
      />
    </BackgroundGlow>
  );
}
