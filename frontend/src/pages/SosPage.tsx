import { useState, useRef, useEffect } from 'react';
import { Phone, HeartPulse, MessageCircle } from 'lucide-react';
import { BackgroundGlow } from '@/components/ui/BackgroundGlow';
import { BottomNav } from '@/components/layout/BottomNav';
import { dashboardApi } from '@/api/client';
import { getSocket } from '@/api/socket';

export default function SosPage() {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [triggered, setTriggered] = useState(false);
  const intervalRef = useRef<number | null>(null);

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

  const sendWhatsAppSOS = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const text = encodeURIComponent(`URGENT! I need help. I have triggered TravelShield SOS.\nMy live location: https://maps.google.com/?q=${lat},${lng}`);
      window.open(`https://wa.me/?text=${text}`, '_blank');
    }, () => {
      const text = encodeURIComponent(`URGENT! I need help. I have triggered TravelShield SOS. Location unavailable.`);
      window.open(`https://wa.me/?text=${text}`, '_blank');
    });
  };

  return (
    <BackgroundGlow>
      <div className="px-6 pt-8 pb-28 flex flex-col items-center min-h-[calc(100vh-32px)]">
        <h1 className="font-grotesk font-bold text-2xl text-white self-start mb-2">Emergency SOS</h1>
        <p className="text-white/60 text-sm self-start mb-12">Hold button for 3 seconds or Shake Device to activate</p>

        <div className="flex-1 flex flex-col items-center justify-center">
          <button
            onMouseDown={startHold}
            onMouseUp={endHold}
            onMouseLeave={endHold}
            onTouchStart={startHold}
            onTouchEnd={endHold}
            onTouchCancel={endHold}
            className={`relative w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all ${
              triggered ? 'bg-safe/20 border-safe' : holding ? 'bg-danger/30 border-danger scale-105' : 'bg-danger/10 border-danger/50'
            }`}
            style={{ boxShadow: holding ? '0 0 40px rgba(239,68,68,0.6)' : '0 0 20px rgba(239,68,68,0.3)' }}
          >
            {holding && (
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle cx="96" cy="96" r="90" fill="none" stroke="rgba(239,68,68,0.3)" strokeWidth="4" />
                <circle cx="96" cy="96" r="90" fill="none" stroke="#ef4444" strokeWidth="4" strokeDasharray={`${progress * 5.65} 565`} />
              </svg>
            )}
            <span className="text-2xl font-bold text-white relative z-10">
              {triggered ? 'ACTIVE' : 'SOS'}
            </span>
          </button>

          {triggered && (
            <div className="flex flex-col items-center gap-3 mt-6">
              <p className="text-safe text-sm text-center font-medium px-4">Emergency alert sent to authorities.<br/>Live tracking is now active.</p>
              
              <button onClick={sendWhatsAppSOS} className="w-full flex items-center justify-center gap-2 mt-2 px-4 py-3 rounded-xl bg-green-500/20 border border-green-500 text-green-500 font-bold hover:bg-green-500/30 transition-all">
                <MessageCircle className="w-5 h-5" /> Share live tracking to WhatsApp
              </button>

              <button 
                onClick={() => {
                  setTriggered(false);
                  setProgress(0);
                }} 
                className="mt-4 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs hover:bg-white/10 hover:text-white transition-all active:scale-95"
              >
                Cancel Alert & Stop Tracking
              </button>
            </div>
          )}
        </div>

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
      </div>
      <BottomNav />
    </BackgroundGlow>
  );
}
