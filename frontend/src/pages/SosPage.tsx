import { useState, useRef, useEffect } from 'react';
import { Phone, HeartPulse, MessageCircle, CheckCircle2, AlertCircle, Shield, Flame } from 'lucide-react';
import { BackgroundGlow } from '@/components/ui/BackgroundGlow';
import { BottomNav } from '@/components/layout/BottomNav';
import { dashboardApi } from '@/api/client';
import { getSocket } from '@/api/socket';

export default function SosPage() {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [triggered, setTriggered] = useState(false);
  const [contacts, setContacts] = useState<Array<Record<string, string>>>([]);
  const [step, setStep] = useState(0); // animated step reveal
  const intervalRef = useRef<number | null>(null);
  const stepTimerRef = useRef<number[]>([]);

  // iOS Shake Permission & Toggle State
  const [shakeEnabled, setShakeEnabled] = useState(false);
  const [motionPermissionStatus, setMotionPermissionStatus] = useState<'default' | 'granted' | 'denied' | 'not-supported'>('default');

  useEffect(() => {
    dashboardApi.contacts()
      .then(({ data }) => setContacts(data.data || []))
      .catch(err => console.error('Failed to load contacts for SOS:', err));

    const isIOS = typeof (DeviceMotionEvent as any).requestPermission === 'function';
    if (!isIOS) {
      setShakeEnabled(true);
      setMotionPermissionStatus('granted');
    } else {
      setMotionPermissionStatus('default');
    }
  }, []);

  const requestMotionPermission = async () => {
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const state = await (DeviceMotionEvent as any).requestPermission();
        if (state === 'granted') {
          setMotionPermissionStatus('granted');
          setShakeEnabled(true);
        } else {
          setMotionPermissionStatus('denied');
          setShakeEnabled(false);
        }
      } catch (err) {
        setMotionPermissionStatus('denied');
      }
    } else {
      setMotionPermissionStatus('granted');
      setShakeEnabled(true);
    }
  };

  const sendToContact = (phone: string) => {
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    const intlPhone = cleanPhone.startsWith('+') ? cleanPhone : `+91${cleanPhone}`;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const alertMsg = `🚨 EMERGENCY SOS - TravelShield 🛡️\n\nI need immediate assistance! Here is my live coordinate link:\nhttps://maps.google.com/?q=${lat},${lng}\n\nTime sent: ${new Date().toLocaleTimeString()}`;
        window.open(`https://wa.me/${intlPhone.replace('+', '')}?text=${encodeURIComponent(alertMsg)}`, '_blank');
      },
      () => {
        const alertMsg = `🚨 EMERGENCY SOS - TravelShield 🛡️\n\nI need immediate assistance! I have triggered TravelShield SOS. Location services unavailable.\n\nTime sent: ${new Date().toLocaleTimeString()}`;
        window.open(`https://wa.me/${intlPhone.replace('+', '')}?text=${encodeURIComponent(alertMsg)}`, '_blank');
      }
    );
  };

  // --- Shake to SOS ---
  useEffect(() => {
    if (!shakeEnabled || triggered) return;
    let lastX = 0, lastY = 0, lastZ = 0, lastUpdate = 0;
    const SHAKE_THRESHOLD = 800;
    const handleMotion = (e: DeviceMotionEvent) => {
      const current = e.accelerationIncludingGravity;
      if (!current || current.x === null || current.y === null || current.z === null) return;
      const now = Date.now();
      if ((now - lastUpdate) > 100) {
        const diffTime = (now - lastUpdate);
        lastUpdate = now;
        const x = current.x, y = current.y, z = current.z;
        const speed = Math.abs(x + y + z - lastX - lastY - lastZ) / diffTime * 10000;
        if (speed > SHAKE_THRESHOLD) triggerSos();
        lastX = x; lastY = y; lastZ = z;
      }
    };
    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [shakeEnabled, triggered]);

  const startHold = (e: React.MouseEvent | React.TouchEvent) => {
    if (e.cancelable) e.preventDefault();
    if (holding || triggered) return;
    if ('vibrate' in navigator) navigator.vibrate(50);
    setHolding(true);
    setProgress(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
    let p = 0;
    intervalRef.current = window.setInterval(() => {
      p += 3.33;
      setProgress(Math.min(100, p));
      if (p >= 100) {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        setHolding(false);
        triggerSos();
      }
    }, 100);
  };

  const endHold = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e && e.cancelable) e.preventDefault();
    setHolding(false);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setProgress(0);
  };

  const triggerSos = async () => {
    setTriggered(true);
    setStep(0);
    if ('vibrate' in navigator) navigator.vibrate([500, 200, 500, 200, 500]);

    // Staggered step reveal animation
    stepTimerRef.current.forEach(t => clearTimeout(t));
    stepTimerRef.current = [
      window.setTimeout(() => setStep(1), 400),
      window.setTimeout(() => setStep(2), 1100),
      window.setTimeout(() => setStep(3), 1900),
    ];

    try {
      let latitude = 0, longitude = 0, location = 'Location unavailable';
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, enableHighAccuracy: true });
        });
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
        location = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      } catch {}
      const res = await dashboardApi.triggerSos({ latitude, longitude, location, type: 'SOS' });
      if (res.data?.event?.id) {
        const socket = getSocket();
        if (socket) socket.emit('join_tracking', res.data.event.id);
      }
    } catch (e) {
      console.error('Failed to trigger SOS:', e);
    }
  };

  return (
    <BackgroundGlow>
      <style>{`
        @keyframes sosPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.6), 0 0 40px rgba(239,68,68,0.3); }
          50% { box-shadow: 0 0 0 20px rgba(239,68,68,0), 0 0 80px rgba(239,68,68,0.5); }
        }
        @keyframes rippleOut {
          0%   { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes alarmFlash {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes stepIn {
          from { opacity: 0; transform: translateX(-16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes borderGlow {
          0%, 100% { border-color: rgba(239,68,68,0.3); }
          50%       { border-color: rgba(239,68,68,0.8); }
        }
        .sos-idle-btn { animation: sosPulse 2.2s ease-in-out infinite; }
        .ripple-ring { animation: rippleOut 2s ease-out infinite; }
        .ripple-ring-2 { animation: rippleOut 2s ease-out infinite; animation-delay: 0.7s; }
        .ripple-ring-3 { animation: rippleOut 2s ease-out infinite; animation-delay: 1.4s; }
        .alarm-flash { animation: alarmFlash 1.2s ease-in-out infinite; }
        .anim-fade-up { animation: fadeSlideUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
        .anim-scale-in { animation: scaleIn 0.45s cubic-bezier(0.22,1,0.36,1) both; }
        .anim-step-in { animation: stepIn 0.4s cubic-bezier(0.22,1,0.36,1) both; }
        .border-glow { animation: borderGlow 1.5s ease-in-out infinite; }
      `}</style>

      <div className="px-5 pt-8 pb-28 flex flex-col items-center min-h-[calc(100vh-32px)]">

        {/* ── Header ── */}
        {!triggered && (
          <div className="w-full mb-4 anim-fade-up">
            <h1 className="font-grotesk font-bold text-2xl text-white mb-1">Emergency SOS</h1>
            <p className="text-white/50 text-sm">Hold button 3 s · or Shake device</p>

            {motionPermissionStatus === 'default' && (
              <button
                onClick={requestMotionPermission}
                className="mt-3 w-full px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <AlertCircle size={14} />
                iOS: Tap to enable Shake-to-SOS sensors
              </button>
            )}
            {motionPermissionStatus === 'granted' && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-[10px] font-extrabold tracking-wider uppercase">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Shake-to-SOS Active
              </div>
            )}
            {motionPermissionStatus === 'denied' && (
              <div className="mt-3 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold text-center">
                Shake-to-SOS disabled — use the Hold button below.
              </div>
            )}
          </div>
        )}

        {/* ── Main area ── */}
        <div className="flex-1 flex flex-col items-center justify-center w-full">

          {triggered ? (
            /* ── TRIGGERED STATE ── */
            <div className="w-full max-w-sm flex flex-col items-center anim-scale-in">

              {/* Alarm header */}
              <div className="mb-5 flex flex-col items-center gap-1">
                <div className="alarm-flash text-5xl mb-1">🚨</div>
                <h2 className="font-grotesk font-black text-2xl text-red-400 tracking-widest text-center alarm-flash">
                  EMERGENCY IN PROGRESS
                </h2>
                <p className="text-white/40 text-xs tracking-wider uppercase">Help is on its way</p>
              </div>

              {/* Steps card */}
              <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 mb-5 space-y-4 backdrop-blur-xl border-glow">
                {/* Step 1 */}
                {step >= 1 && (
                  <div className="flex items-start gap-3 anim-step-in" style={{ animationDelay: '0ms' }}>
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/40">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm">Dispatching to Police Control (100)</h3>
                      <p className="text-white/40 text-xs mt-0.5">Emergency SOS signal broadcasted</p>
                    </div>
                  </div>
                )}

                {/* Step 2 */}
                {step >= 2 && (
                  <div className="flex items-start gap-3 anim-step-in" style={{ animationDelay: '0ms' }}>
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/40">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm">
                        Broadcasting to {contacts.length} Guardian{contacts.length !== 1 ? 's' : ''}
                      </h3>
                      {contacts.length > 0 ? (
                        <p className="text-emerald-400/80 text-[11px] mt-0.5 font-medium">
                          Alerting: {contacts.map(c => c.name).join(', ')}
                        </p>
                      ) : (
                        <p className="text-white/40 text-xs mt-0.5">No guardians — add them in Contacts.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 3 */}
                {step >= 3 && (
                  <div className="flex items-start gap-3 anim-step-in" style={{ animationDelay: '0ms' }}>
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/40">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm">Live GPS Tracker Activated</h3>
                      <p className="text-white/40 text-xs mt-0.5">Silently broadcasting coordinate payload</p>
                    </div>
                  </div>
                )}

                {/* Loading dots while steps appear */}
                {step < 3 && (
                  <div className="flex gap-1.5 pl-1 pt-1">
                    {[0,1,2].map(i => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-red-400/60"
                        style={{ animation: `alarmFlash 1s ease-in-out ${i * 0.25}s infinite` }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* WhatsApp send buttons */}
              {step >= 3 && (
                <div className="w-full space-y-3 mb-4 anim-fade-up">
                  <p className="text-white/40 text-center text-[11px] px-2 mb-1 leading-relaxed">
                    Confirm to dispatch WhatsApp alert to guardians
                  </p>
                  {contacts.length === 0 ? (
                    <p className="text-white/40 text-center text-xs py-2">
                      No emergency contacts found. Add them in Profile.
                    </p>
                  ) : contacts.map((contact, index) => (
                    <button
                      key={contact.id || index}
                      onClick={() => sendToContact(contact.phone)}
                      className="w-full py-4 bg-green-600 hover:bg-green-500 active:scale-[0.97] text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-[15px]"
                      style={{ boxShadow: '0 4px 20px rgba(22,163,74,0.45)' }}
                    >
                      <MessageCircle className="w-5 h-5 animate-pulse" />
                      Send WhatsApp to {contact.name}
                    </button>
                  ))}
                </div>
              )}

              {step >= 3 && (
                <button
                  onClick={() => { setTriggered(false); setProgress(0); setStep(0); }}
                  className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 text-xs hover:bg-white/10 hover:text-white transition-all active:scale-95"
                >
                  Cancel Alert &amp; Stop Tracking
                </button>
              )}
            </div>

          ) : (
            /* ── IDLE STATE — BIG SOS BUTTON ── */
            <div className="relative flex items-center justify-center" style={{ width: 224, height: 224 }}>
              {/* Animated ripple rings */}
              {!holding && (
                <>
                  <div className="ripple-ring absolute inset-0 rounded-full border-2 border-red-500/40" />
                  <div className="ripple-ring-2 absolute inset-0 rounded-full border-2 border-red-500/25" />
                  <div className="ripple-ring-3 absolute inset-0 rounded-full border-2 border-red-500/15" />
                </>
              )}

              <button
                onMouseDown={startHold}
                onMouseUp={endHold}
                onMouseLeave={endHold}
                onTouchStart={startHold}
                onTouchEnd={endHold}
                onTouchCancel={endHold}
                className={`relative w-48 h-48 rounded-full border-4 flex flex-col items-center justify-center gap-2 transition-all duration-200 select-none cursor-pointer ${
                  holding
                    ? 'bg-red-500/30 border-red-400 scale-105'
                    : 'bg-red-500/10 border-red-500/50 sos-idle-btn'
                }`}
                style={{ touchAction: 'none' }}
              >
                {/* SVG progress ring */}
                {holding && (
                  <svg className="absolute inset-0 w-full h-full -rotate-90" style={{ pointerEvents: 'none' }}>
                    <circle cx="96" cy="96" r="88" fill="none" stroke="rgba(239,68,68,0.12)" strokeWidth="6" />
                    <circle
                      cx="96" cy="96" r="88" fill="none" stroke="#ef4444" strokeWidth="6"
                      strokeDasharray={`${progress * 5.53} 553`}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dasharray 0.1s linear' }}
                    />
                  </svg>
                )}

                <HeartPulse
                  className={`w-10 h-10 relative z-10 transition-colors ${holding ? 'text-red-300 animate-pulse' : 'text-red-400'}`}
                />
                <span className="text-3xl font-black text-white relative z-10 tracking-widest">SOS</span>
                <span className="text-[10px] text-red-300/70 relative z-10 font-semibold tracking-wider">
                  {holding ? `${Math.round(progress)}%` : 'HOLD 3s'}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* ── Quick-dial grid ── */}
        {!triggered && (
          <div className="grid grid-cols-2 gap-3 w-full max-w-sm mt-8 anim-fade-up">
            <button
              onClick={() => window.open('tel:100')}
              className="relative glass-card p-4 flex flex-col items-center gap-2 hover:border-cyan/30 active:scale-95 transition-transform overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Shield className="w-6 h-6 text-blue-400" />
              <span className="text-xs text-white/80 font-semibold">Call Police</span>
              <span className="text-lg font-black text-blue-400">100</span>
            </button>

            <button
              onClick={() => window.open('tel:108')}
              className="relative glass-card p-4 flex flex-col items-center gap-2 hover:border-cyan/30 active:scale-95 transition-transform overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <HeartPulse className="w-6 h-6 text-red-400" />
              <span className="text-xs text-white/80 font-semibold">Ambulance</span>
              <span className="text-lg font-black text-red-400">108</span>
            </button>

            <button
              onClick={() => window.open('tel:101')}
              className="relative glass-card p-4 flex flex-col items-center gap-2 hover:border-cyan/30 active:scale-95 transition-transform overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Flame className="w-6 h-6 text-orange-400" />
              <span className="text-xs text-white/80 font-semibold">Fire Station</span>
              <span className="text-lg font-black text-orange-400">101</span>
            </button>

            <button
              onClick={() => window.open('tel:112')}
              className="relative glass-card p-4 flex flex-col items-center gap-2 hover:border-cyan/30 active:scale-95 transition-transform overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Phone className="w-6 h-6 text-cyan-400" />
              <span className="text-xs text-white/80 font-semibold">Emergency</span>
              <span className="text-lg font-black text-cyan-400">112</span>
            </button>
          </div>
        )}
      </div>
      <BottomNav />
    </BackgroundGlow>
  );
}
