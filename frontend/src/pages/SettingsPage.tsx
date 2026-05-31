import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackgroundGlow } from '@/components/ui/BackgroundGlow';
import { PageHeader } from '@/components/layout/BottomNav';
import { dashboardApi, authApi } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { BiometricModal } from '@/components/ui/BiometricModal';
import {
  Bell, Mail, MessageSquare, MapPin, AlertTriangle, Fingerprint, Key, CheckCircle2, XCircle, Loader2
} from 'lucide-react';

const PREFS_KEY = 'travelshield_prefs';

const defaultPrefs: Record<string, boolean> = {
  pushNotifications: true,
  emailNotifications: true,
  smsAlerts: false,
  shareLocation: true,
  autoSosEnabled: false,
  biometricEnabled: false,
};

function loadLocalPrefs(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { ...defaultPrefs, ...JSON.parse(raw) };
  } catch {}
  return { ...defaultPrefs };
}

function saveLocalPrefs(prefs: Record<string, boolean>) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<Record<string, boolean>>(loadLocalPrefs());
  const [isBiometricOpen, setIsBiometricOpen] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Load prefs from server on mount
  useEffect(() => {
    authApi.me().then(({ data }) => {
      const user = data.data;
      const serverPrefs: Record<string, boolean> = {
        ...user.preferences,
        biometricEnabled: user.profile?.biometricEnabled || false,
      };
      const merged = { ...defaultPrefs, ...serverPrefs };
      setPrefs(merged);
      saveLocalPrefs(merged);
    }).catch(() => {
      dashboardApi.preferences().then(({ data }) => {
        const merged = { ...defaultPrefs, ...(data.data || {}) };
        setPrefs(merged);
        saveLocalPrefs(merged);
      }).catch(() => {
        // Use localStorage fallback — already set as default
      });
    });
  }, []);

  const showToast = useCallback((msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const toggle = async (key: string) => {
    if (key === 'biometricEnabled') {
      if (!prefs[key]) {
        setIsBiometricOpen(true);
      } else {
        const updated = { ...prefs, [key]: false };
        setPrefs(updated);
        saveLocalPrefs(updated);
        setSavingKey(key);
        try {
          await dashboardApi.updatePreferences({ biometricEnabled: false });
          localStorage.removeItem('travelshield-biometric');
          showToast('Biometric login disabled', true);
        } catch {
          showToast('Saved locally', true);
        } finally {
          setSavingKey(null);
        }
      }
      return;
    }

    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    saveLocalPrefs(updated);
    setSavingKey(key);

    // Side-effects per toggle
    if (key === 'pushNotifications' && updated[key]) {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    try {
      await dashboardApi.updatePreferences({ [key]: updated[key] });
      showToast(`${settingsMeta[key]?.label ?? key} ${updated[key] ? 'enabled' : 'disabled'}`, true);
    } catch {
      showToast('Saved locally (offline)', true);
    } finally {
      setSavingKey(null);
    }
  };

  const handleBiometricSuccess = async () => {
    setIsBiometricOpen(false);
    const updated = { ...prefs, biometricEnabled: true };
    setPrefs(updated);
    saveLocalPrefs(updated);
    setSavingKey('biometricEnabled');
    try {
      await dashboardApi.updatePreferences({ biometricEnabled: true });
      const auth = useAuthStore.getState();
      if (auth.refreshToken && auth.user) {
        localStorage.setItem('travelshield-biometric', JSON.stringify({
          email: auth.user.email,
          refreshToken: auth.refreshToken,
        }));
      }
      showToast('Biometric login enabled ✓', true);
    } catch {
      showToast('Saved locally', true);
    } finally {
      setSavingKey(null);
    }
  };

  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('travelshield_gemini_api_key') || '');
  const [keyTestStatus, setKeyTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');

  const testGeminiKey = async (key: string) => {
    if (!key.trim()) return;
    setKeyTestStatus('testing');
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Say OK' }] }] }),
        }
      );
      setKeyTestStatus(res.ok ? 'ok' : 'fail');
    } catch {
      setKeyTestStatus('fail');
    }
  };

  // Settings metadata — Dark Mode REMOVED
  const settingsMeta: Record<string, { label: string; desc: string; icon: React.ReactNode; color: string }> = {
    pushNotifications: {
      label: 'Push Notifications',
      desc: 'Safety alerts & warnings on your device',
      icon: <Bell size={16} />,
      color: '#22d3ee',
    },
    emailNotifications: {
      label: 'Email Notifications',
      desc: 'Get activity summaries via email',
      icon: <Mail size={16} />,
      color: '#818cf8',
    },
    smsAlerts: {
      label: 'SMS Alerts',
      desc: 'Critical emergency alerts via SMS',
      icon: <MessageSquare size={16} />,
      color: '#34d399',
    },
    shareLocation: {
      label: 'Share Location',
      desc: 'Real-time GPS location tracking',
      icon: <MapPin size={16} />,
      color: '#f472b6',
    },
    autoSosEnabled: {
      label: 'Auto SOS',
      desc: 'Trigger SOS automatically on fall detection',
      icon: <AlertTriangle size={16} />,
      color: '#fb923c',
    },
    biometricEnabled: {
      label: 'Biometric Login',
      desc: 'Use fingerprint or face unlock to sign in',
      icon: <Fingerprint size={16} />,
      color: '#a78bfa',
    },
  };

  const settingsList = Object.keys(settingsMeta);

  return (
    <BackgroundGlow>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(12px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .toast-anim { animation: toastIn 0.3s cubic-bezier(0.22,1,0.36,1) both; }
        .setting-row { animation: fadeSlideUp 0.4s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      <PageHeader title="Settings" onBack={() => navigate(-1)} />

      <div className="px-5 pb-10 lg:max-w-lg lg:mx-auto space-y-3 pt-2">

        {/* ── Toggle rows ── */}
        {settingsList.map((key, i) => {
          const meta = settingsMeta[key];
          const isOn = !!prefs[key];
          const isSaving = savingKey === key;
          return (
            <div
              key={key}
              className="glass-card p-4 flex items-center justify-between setting-row"
              style={{ animationDelay: `${i * 55}ms` }}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Icon badge */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}30`, color: meta.color }}
                >
                  {meta.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{meta.label}</p>
                  <p className="text-white/40 text-[11px] mt-0.5 leading-tight">{meta.desc}</p>
                </div>
              </div>

              {/* Toggle */}
              <button
                onClick={() => toggle(key)}
                disabled={isSaving}
                className={`ml-3 shrink-0 w-12 h-6 rounded-full transition-all duration-300 relative ${
                  isOn ? 'bg-cyan-500' : 'bg-white/15'
                } ${isSaving ? 'opacity-60' : ''}`}
                style={isOn ? { boxShadow: `0 0 10px rgba(34,211,238,0.35)` } : {}}
                aria-label={`Toggle ${meta.label}`}
              >
                {isSaving ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 size={12} className="text-white animate-spin" />
                  </div>
                ) : (
                  <div
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                      isOn ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                )}
              </button>
            </div>
          );
        })}

        {/* ── Gemini API Key ── */}
        <div className="glass-card p-4 space-y-3 setting-row" style={{ animationDelay: `${settingsList.length * 55}ms` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24' }}>
              <Key size={16} />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Google Gemini API Key</p>
              <p className="text-white/40 text-[11px] mt-0.5 leading-tight">
                Powers Travel AI.{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan underline"
                >
                  Get a free key
                </a>
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={geminiKey}
              onChange={(e) => {
                setGeminiKey(e.target.value);
                localStorage.setItem('travelshield_gemini_api_key', e.target.value);
                setKeyTestStatus('idle');
              }}
              placeholder="Paste AIzaSy... key here"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan/50 transition-colors"
              style={{ fontFamily: 'monospace' }}
            />
            {geminiKey && (
              <button
                onClick={() => {
                  setGeminiKey('');
                  localStorage.removeItem('travelshield_gemini_api_key');
                  setKeyTestStatus('idle');
                }}
                className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-semibold transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {geminiKey && (
            <button
              onClick={() => testGeminiKey(geminiKey)}
              disabled={keyTestStatus === 'testing'}
              className="w-full py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2"
              style={{
                background: keyTestStatus === 'ok' ? 'rgba(52,211,153,0.12)' :
                            keyTestStatus === 'fail' ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.05)',
                borderColor: keyTestStatus === 'ok' ? 'rgba(52,211,153,0.4)' :
                             keyTestStatus === 'fail' ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)',
                color: keyTestStatus === 'ok' ? '#34d399' :
                       keyTestStatus === 'fail' ? '#f87171' : 'rgba(255,255,255,0.6)',
                cursor: keyTestStatus === 'testing' ? 'not-allowed' : 'pointer',
              }}
            >
              {keyTestStatus === 'testing' && <><Loader2 size={12} className="animate-spin" /> Testing key...</>}
              {keyTestStatus === 'ok' && <><CheckCircle2 size={12} /> Key is valid! AI is ready.</>}
              {keyTestStatus === 'fail' && <><XCircle size={12} /> Key invalid or expired — get a new key</>}
              {keyTestStatus === 'idle' && '🔑 Test Key Now'}
            </button>
          )}
        </div>
      </div>

      {/* ── Toast notification ── */}
      {toast && (
        <div
          className={`toast-anim fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold shadow-xl border ${
            toast.ok
              ? 'bg-emerald-900/90 border-emerald-500/30 text-emerald-300'
              : 'bg-red-900/90 border-red-500/30 text-red-300'
          }`}
          style={{ backdropFilter: 'blur(12px)', whiteSpace: 'nowrap' }}
        >
          {toast.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
          {toast.msg}
        </div>
      )}

      <BiometricModal
        isOpen={isBiometricOpen}
        onClose={() => setIsBiometricOpen(false)}
        onSuccess={handleBiometricSuccess}
        action="register"
      />
    </BackgroundGlow>
  );
}
