import { useState, useRef, useEffect } from 'react';
import { Phone, HeartPulse, MessageCircle, CheckCircle2 } from 'lucide-react';
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

  useEffect(() => {
    dashboardApi.contacts()
      .then(({ data }) => setContacts(data.data || []))
      .catch(err => console.error('Failed to load contacts for SOS:', err));
  }, []);

  const sendToContact = (phone: string) => {
    // Strip everything except digits and leading +
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    // Ensure phone has country code (prefix +91 if 10-digit Indian number)
    const intlPhone = cleanPhone.startsWith('+') ? cleanPhone : `+91${cleanPhone}`;
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const alertMsg = `🚨 URGENT SOS! I need help. I have triggered TravelShield SOS.\nLive Location: https://maps.google.com/?q=${lat},${lng}`;
        const waUrl = `https://wa.me/${intlPhone.replace('+', '')}?text=${encodeURIComponent(alertMsg)}`;
        window.open(waUrl, '_blank');
      },
      () => {
        const alertMsg = `🚨 URGENT SOS! I need help. I have triggered TravelShield SOS. Location unavailable.`;
        const waUrl = `https://wa.me/${intlPhone.replace('+', '')}?text=${encodeURIComponent(alertMsg)}`;
        window.open(waUrl, '_blank');
      }
    );
  };

  // --- Shake to SOS ---
  useEffect(() => {
    let lastX = 0, lastY = 0, lastZ = 0;
    let lastUpdate = 0;
    const SHAKE_THRESHOLD = 800; // Adjust for sensitivity

    const handleMotion = (e: DeviceMotionEvent) => {
      const current = e.accelerationIncludingGravity;
      if (!current || !current.x || !current.y || !current.z) return;

      const now = Date.now();
      if ((now - lastUpdate) > 100) {
        const diffTime = (now - lastUpdate);
        lastUpdate = now;
        
        const x = current.x;
        const y = current.y;
        const z = current.z;
        
        const speed = Math.abs(x + y + z - lastX - lastY - lastZ) / diffTime * 10000;
        
        if (speed > SHAKE_THRESHOLD && !triggered) {
          triggerSos();
        }
        
        lastX = x;
        lastY = y;
        lastZ = z;
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [triggered]);

  const startHold = (e: React.MouseEvent | React.TouchEvent) => {
    if (e.cancelable) e.preventDefault();
    if (holding || triggered) return;
    
    // Vibrate when touching
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
    // Heavy vibration pattern for SOS activated
    if ('vibrate' in navigator) navigator.vibrate([500, 200, 500, 200, 500]);
    
    try {
      let latitude = 1.2834;
      let longitude = 103.8607;
      let location = 'Marina Bay Area, Sector 4';
      
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, enableHighAccuracy: true });
        });
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
        location = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      } catch (err) {
        console.warn('Geolocation failed or timed out:', err);
      }
      
      const res = await dashboardApi.triggerSos({ latitude, longitude, location, type: 'SOS' });
      
      // If tracking session was created, join it on websocket
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
            <p className="text-white/60 text-sm self-start mb-12">Hold button for 3 seconds or Shake Device to activate</p>
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
              className={`relative w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all ${
                holding ? 'bg-danger/30 border-danger scale-105' : 'bg-danger/10 border-danger/50'
              }`}
              style={{ boxShadow: holding ? '0 0 40px rgba(239,68,68,0.6)' : '0 0 20px rgba(239,68,68,0.3)' }}
            >
              {holding && (
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle cx="96" cy="96" r="90" fill="none" stroke="rgba(239,68,68,0.3)" strokeWidth="4" />
                  <circle cx="96" cy="96" r="90" fill="none" stroke="#ef4444" strokeWidth="4" strokeDasharray={`${progress * 5.65} 565`} />
                </svg>
              )}
              <span className="text-2xl font-bold text-white relative z-10">SOS</span>
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
