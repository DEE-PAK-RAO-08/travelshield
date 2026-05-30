import { useState, useRef } from 'react';
import { Phone, HeartPulse } from 'lucide-react';
import { BackgroundGlow } from '@/components/ui/BackgroundGlow';
import { BottomNav } from '@/components/layout/BottomNav';
import { dashboardApi } from '@/api/client';

export default function SosPage() {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [triggered, setTriggered] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const startHold = (e: React.MouseEvent | React.TouchEvent) => {
    // Prevent default behaviors like scrolling or click event emulation on mobile touch
    if (e.cancelable) {
      e.preventDefault();
    }
    if (holding || triggered) return;
    setHolding(true);
    setProgress(0);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
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
    if (e && e.cancelable) {
      e.preventDefault();
    }
    setHolding(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setProgress(0);
  };

  const triggerSos = async () => {
    setTriggered(true);
    try {
      let latitude = 1.2834;
      let longitude = 103.8607;
      let location = 'Marina Bay Area, Sector 4';
      
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
        location = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      } catch (err) {
        console.warn('Geolocation failed or timed out, using fallback coordinates:', err);
      }
      
      await dashboardApi.triggerSos({
        latitude,
        longitude,
        location,
      });
    } catch (e) {
      console.error('Failed to trigger SOS:', e);
    }
  };

  return (
    <BackgroundGlow>
      <div className="px-6 pt-8 pb-28 flex flex-col items-center min-h-[calc(100vh-32px)]">
        <h1 className="font-grotesk font-bold text-2xl text-white self-start mb-2">Emergency SOS</h1>
        <p className="text-white/60 text-sm self-start mb-12">Hold button for 3 seconds to activate</p>

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
              {triggered ? 'SENT' : 'SOS'}
            </span>
          </button>

          {triggered && (
            <div className="flex flex-col items-center gap-3 mt-6">
              <p className="text-safe text-sm text-center font-medium">Emergency alert sent to your contacts and authorities</p>
              <button 
                onClick={() => {
                  setTriggered(false);
                  setProgress(0);
                }} 
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs hover:bg-white/10 hover:text-white transition-all active:scale-95"
              >
                Cancel Alert
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
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
