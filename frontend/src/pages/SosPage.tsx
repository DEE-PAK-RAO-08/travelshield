import { useState, useRef, useEffect } from 'react';
import { Phone, HeartPulse, MessageCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { BackgroundGlow } from '@/components/ui/BackgroundGlow';
import { BottomNav } from '@/components/layout/BottomNav';
import { dashboardApi } from '@/api/client';
import { getSocket } from '@/api/socket';

export default function SosPage() {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [triggered, setTriggered] = useState(false);
  const [contacts, setContacts] = useState<Array<Record<string, string>>>([]);
  const intervalRef = useRef<number | null>(null);

  // iOS Shake Permission & Toggle State
  const [shakeEnabled, setShakeEnabled] = useState(false);
  const [motionPermissionStatus, setMotionPermissionStatus] = useState<'default' | 'granted' | 'denied' | 'not-supported'>('default');

  useEffect(() => {
    dashboardApi.contacts()
      .then(({ data }) => setContacts(data.data || []))
      .catch(err => console.error('Failed to load contacts for SOS:', err));

    // Check device type on load
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
        console.error('Error requesting motion permission:', err);
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
        const waUrl = `https://wa.me/${intlPhone.replace('+', '')}?text=${encodeURIComponent(alertMsg)}`;
        window.open(waUrl, '_blank');
      },
      () => {
        const alertMsg = `🚨 EMERGENCY SOS - TravelShield 🛡️\n\nI need immediate assistance! I have triggered TravelShield SOS. Location services unavailable.\n\nTime sent: ${new Date().toLocaleTimeString()}`;
        const waUrl = `https://wa.me/${intlPhone.replace('+', '')}?text=${encodeURIComponent(alertMsg)}`;
        window.open(waUrl, '_blank');
      }
    );
  };

  // --- Shake to SOS ---
  useEffect(() => {
    if (!shakeEnabled || triggered) return;

    let lastX = 0, lastY = 0, lastZ = 0;
    let lastUpdate = 0;
    const SHAKE_THRESHOLD = 800; // sensitivity limit

    const handleMotion = (e: DeviceMotionEvent) => {
      const current = e.accelerationIncludingGravity;
      if (!current || current.x === null || current.y === null || current.z === null) return;

      const now = Date.now();
      if ((now - lastUpdate) > 100) {
        const diffTime = (now - lastUpdate);
        lastUpdate = now;
        
        const x = current.x;
        const y = current.y;
        const z = current.z;
        
        const speed = Math.abs(x + y + z - lastX - lastY - lastZ) / diffTime * 10000;
        
        if (speed > SHAKE_THRESHOLD) {
          triggerSos();
        }
        
        lastX = x;
        lastY = y;
        lastZ = z;
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
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setHolding(false);
        triggerSos();
      }
    }, 100);
  };

  const endHold = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e && e.cancelable) e.preventDefault();
    setHolding(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setProgress(0);
  };

  const triggerSos = async () => {
    setTriggered(true);
    if ('vibrate' in navigator) navigator.vibrate([500, 200, 500, 200, 500]);
    
    try {
      let latitude = 0;
      let longitude = 0;
      let location = 'Location unavailable';
      
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, enableHighAccuracy: true });
        });
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
        location = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      } catch (err) {
        console.warn('Geolocation failed or timed out:', err);
      }
      
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
      <div className="px-6 pt-8 pb-28 flex flex-col items-center min-h-[calc(100vh-32px)]">
        {!triggered && (
          <>
            <h1 className="font-grotesk font-bold text-2xl text-white self-start mb-2">Emergency SOS</h1>
            <p className="text-white/60 text-sm self-start mb-4">Hold button for 3 seconds or Shake Device to activate</p>
            
            {/* Shake Settings and iOS Permissions */}
            {motionPermissionStatus === 'default' && (
              <button 
                onClick={requestMotionPermission}
                className="mb-6 w-full max-w-sm px-4 py-2.5 bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/20 text-amber-300 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/5 animate-pulse"
              >
                <AlertCircle size={14} />
                iOS User: Tap to enable Shake-to-SOS motion sensors
              </button>
            )}

            {motionPermissionStatus === 'granted' && (
              <div className="mb-6 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1.5 shadow-md shadow-emerald-500/5 animate-fadeSlideUp">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Shake-to-SOS Detection Active
              </div>
            )}

            {motionPermissionStatus === 'denied' && (
              <div className="mb-6 px-4 py-2 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-xs font-semibold text-center leading-normal max-w-sm animate-fadeSlideUp">
                Shake-to-SOS disabled. Use the Hold SOS button below.
              </div>
            )}
          </>
        )}

        <div className="flex-1 flex flex-col items-center justify-center w-full">
          {triggered ? (
            <div className="w-full max-w-sm px-2 py-4 flex flex-col items-center animate-fadeSlideUp">
              <h2 className="font-grotesk font-black text-2xl text-red-500 tracking-wider text-center mb-6 animate-pulse">
                EMERGENCY IN PROGRESS!
              </h2>

              <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 mb-6 space-y-5 backdrop-blur-xl">
                {/* Step 1 */}
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/30">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">1. Dispatching to Police Control Room (100)</h3>
                    <p className="text-white/40 text-xs mt-0.5">Emergency SOS signal broadcasted</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/30">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">2. Broadcasting SOS to {contacts.length} Guardians</h3>
                    {contacts.length > 0 ? (
                      <p className="text-emerald-400/80 text-[11px] mt-0.5 font-medium leading-relaxed">
                        Sending alerts to: {contacts.map(c => c.name).join(', ')}
                      </p>
                    ) : (
                      <p className="text-white/40 text-xs mt-0.5">No guardians configured. Go to Contacts to add them.</p>
                    )}
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/30">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">3. Live GPS Tracker Opened</h3>
                    <p className="text-white/40 text-xs mt-0.5">Silently broadcasting coordinate payload</p>
                  </div>
                </div>
              </div>

              <p className="text-white/50 text-center text-[11px] px-4 mb-6 leading-relaxed">
                Device routing requires user confirmation to dispatch WhatsApp payload.
              </p>

              <div className="w-full space-y-3 mb-4">
                {contacts.length === 0 ? (
                  <p className="text-white/40 text-center text-xs py-2">No emergency contacts found. Add them in Profile.</p>
                ) : contacts.map((contact, index) => (
                  <button
                    key={contact.id || index}
                    onClick={() => sendToContact(contact.phone)}
                    className="w-full py-4 bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white font-bold rounded-xl transition-all shadow-[0_4px_20px_rgba(22,163,74,0.4)] flex items-center justify-center gap-2 text-[15px]"
                  >
                    <MessageCircle className="w-5 h-5 animate-pulse" />
                    Send WhatsApp to {contact.name}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => {
                  setTriggered(false);
                  setProgress(0);
                }} 
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 text-xs hover:bg-white/10 hover:text-white transition-all active:scale-95"
              >
                Cancel Alert & Stop Tracking
              </button>
            </div>
          ) : (
            <button
              onMouseDown={startHold}
              onMouseUp={endHold}
              onMouseLeave={endHold}
              onTouchStart={startHold}
              onTouchEnd={endHold}
              onTouchCancel={endHold}
              className={`relative w-48 h-48 rounded-full border-4 flex flex-col items-center justify-center gap-2 transition-all select-none ${
                holding ? 'bg-danger/30 border-danger scale-105' : 'bg-danger/10 border-danger/50'
              }`}
              style={{ boxShadow: holding ? '0 0 50px rgba(239,68,68,0.7), 0 0 100px rgba(239,68,68,0.2)' : '0 0 25px rgba(239,68,68,0.3)', touchAction: 'none' }}
            >
              {/* Progress ring */}
              {holding && (
                <svg className="absolute inset-0 w-full h-full -rotate-90" style={{ pointerEvents: 'none' }}>
                  <circle cx="96" cy="96" r="88" fill="none" stroke="rgba(239,68,68,0.15)" strokeWidth="6" />
                  <circle cx="96" cy="96" r="88" fill="none" stroke="#ef4444" strokeWidth="6"
                    strokeDasharray={`${progress * 5.53} 553`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.1s linear' }}
                  />
                </svg>
              )}
              {/* Outer pulse rings (idle) */}
              {!holding && (
                <>
                  <div className="absolute inset-[-12px] rounded-full border border-red-500/20 animate-ping" style={{ animationDuration: '2s' }} />
                  <div className="absolute inset-[-24px] rounded-full border border-red-500/10 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.3s' }} />
                </>
              )}
              <HeartPulse className={`w-10 h-10 text-red-400 relative z-10 ${holding ? 'animate-pulse' : ''}`} />
              <span className="text-3xl font-black text-white relative z-10 tracking-widest">SOS</span>
              <span className="text-[10px] text-red-300/70 relative z-10 font-semibold tracking-wider">
                {holding ? `${Math.round(progress)}%` : 'HOLD 3s'}
              </span>
            </button>
          )}
        </div>

        {!triggered && (
          <div className="grid grid-cols-2 gap-4 w-full max-w-sm mt-8">
            <button onClick={() => window.open('tel:112')} className="glass-card p-4 flex flex-col items-center gap-2 hover:border-cyan/30 active:scale-95 transition-transform">
              <Phone className="w-6 h-6 text-cyan" />
              <span className="text-xs text-white/80">Call Police (112)</span>
            </button>
            <button onClick={() => window.open('tel:108')} className="glass-card p-4 flex flex-col items-center gap-2 hover:border-cyan/30 active:scale-95 transition-transform">
              <HeartPulse className="w-6 h-6 text-cyan" />
              <span className="text-xs text-white/80">Medical Help (108)</span>
            </button>
          </div>
        )}
      </div>
      <BottomNav />
    </BackgroundGlow>
  );
}
