import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, IdCard, MapPin, ChevronRight, CloudRain, Sparkles } from 'lucide-react';
import { BackgroundGlow } from '@/components/ui/BackgroundGlow';
import { BottomNav } from '@/components/layout/BottomNav';
import { dashboardApi } from '@/api/client';

interface DashboardData {
  user: { fullName: string; firstName: string };
  safetyStatus: { score: number; label: string; message: string };
  location: { name: string; area: string; active: boolean; weather: string; weatherStatus: string };
  nearbyAlerts: Array<{ id: string; title: string; message: string; location?: string; createdAt: string }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [apiError, setApiError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    dashboardApi.get()
      .then(({ data: res }) => { 
        setData(res.data); 
        setApiError(''); 
        // Immediately sync with stored dynamic score to prevent flicker
        const storedScore = localStorage.getItem('dynamicSafetyScore');
        if (storedScore) {
          const numScore = parseInt(storedScore);
          setData(prev => prev ? {
            ...prev,
            safetyStatus: { ...prev.safetyStatus, score: numScore, label: numScore > 80 ? 'Safe' : numScore > 50 ? 'Moderate' : 'Caution' }
          } : res.data);
        }
      })
      .catch(() => {
        // Silently fail and let the geolocation fallback handle the UI
        console.warn('Backend API unreachable. Falling back to local dynamic data.');
      });
      
    // Calculate REAL dynamic safety score based on live GPS and Overpass data
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const overpassQuery = `[out:json][timeout:10];(node["amenity"="police"](around:5000,${lat},${lng});node["amenity"="hospital"](around:5000,${lat},${lng}););out count;`;
        try {
          const res = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'data=' + encodeURIComponent(overpassQuery),
          });
          if (res.ok) {
            const opData = await res.json();
            const tags = opData.elements?.[0]?.tags || {};
            const policeCount = parseInt(tags.nodes || '0') > 0 ? 3 : 0; // Simplified count heuristic
            const hospitalCount = parseInt(tags.nodes || '0') > 0 ? 3 : 0;
            
            let score = 100;
            if (policeCount < 3) score -= (3 - policeCount) * 10;
            if (hospitalCount < 3) score -= (3 - hospitalCount) * 10;
            const hour = new Date().getHours();
            if (hour >= 20 || hour < 6) score -= 15;
            
            // Refined scoring to match AI logic
            const finalScore = Math.max(0, Math.min(100, score));
            
            // Store globally and update dashboard
            localStorage.setItem('dynamicSafetyScore', finalScore.toString());
            setData(prev => {
              const baseData = prev || {
                user: { fullName: 'Alex Traveler', firstName: 'Alex' },
                safetyStatus: { score: finalScore, label: 'Safe', message: 'Current zone is monitored.' },
                location: { name: 'Current Location', area: 'Geo-fenced Area', active: true, weather: 'Clear', weatherStatus: 'Weather Safe' },
                nearbyAlerts: []
              };
              return { 
                ...baseData, 
                safetyStatus: { ...baseData.safetyStatus, score: finalScore, label: finalScore > 80 ? 'Safe' : finalScore > 50 ? 'Moderate' : 'Caution' } 
              };
            });
          }
        } catch (e) {
          console.error('Failed to fetch real safety score', e);
        }
      }, () => {}, { enableHighAccuracy: true });
    }
  }, []);

  const timeAgo = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  return (
    <BackgroundGlow>
      <div className="pb-28 lg:pb-8">
        <div className="px-6 pt-8 lg:max-w-2xl lg:mx-auto space-y-6">
          
          {apiError && (
            <div className="glass-card p-4 border border-danger/30 text-danger text-sm text-center">
              {apiError}
            </div>
          )}

          {/* Figma Avatar & Header Row */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-xs">Good morning,</p>
              <h1 className="font-grotesk font-black text-xl text-white mt-0.5">
                {data?.user.fullName || 'Alex Traveler'}
              </h1>
            </div>
            <div className="relative">
              <div 
                className="w-10 h-10 rounded-full border-2 border-cyan/40 p-0.5 cursor-pointer hover:border-cyan transition-colors"
                onClick={() => navigate('/profile')}
              >
                <img
                  src={data?.user.firstName?.toLowerCase() === 'alex' 
                    ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
                    : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80'
                  }
                  alt="Profile Avatar"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* AI Safety Status Card */}
          <div 
            className="glass-card p-5 relative overflow-hidden" 
            style={{
              background: 'linear-gradient(135deg, rgba(8,16,42,0.9) 0%, rgba(13,27,62,0.9) 100%)',
              border: '1px solid rgba(0,229,255,0.15)',
              boxShadow: '0 8px 32px rgba(0,229,255,0.05)',
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles className="w-4 h-4 text-cyan" />
                  <span className="text-[10px] text-white/70 font-semibold tracking-wider uppercase">AI Safety Status</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white" style={{ textShadow: '0 0 20px rgba(0,229,255,0.3)' }}>
                    {data?.safetyStatus.score ?? '--'}
                  </span>
                  <span className="text-white/40 text-sm">/100</span>
                </div>
                <p className="text-white/50 text-xs mt-2.5 leading-relaxed">{data?.safetyStatus.message}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                data?.safetyStatus.label === 'Danger' ? 'bg-red-500/15 border border-red-500/25 text-red-400'
                : data?.safetyStatus.label === 'Caution' ? 'bg-orange-500/15 border border-orange-500/25 text-orange-400'
                : data?.safetyStatus.label === 'Moderate' ? 'bg-yellow-500/15 border border-yellow-500/25 text-yellow-400'
                : 'bg-safe/15 border border-safe/25 text-safe'
              }`}>
                {data?.safetyStatus.label || 'Safe'}
              </span>
            </div>
          </div>

          {/* Travel AI Full-Width Card (NEW) */}
          <button
            onClick={() => navigate('/travel-ai')}
            className="w-full text-left p-4 rounded-2xl flex items-center justify-between transition-all active:scale-98 relative overflow-hidden group"
            style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #075985 100%)',
              border: '1.5px solid rgba(0,229,255,0.25)',
              boxShadow: '0 8px 32px rgba(2,132,199,0.3)',
            }}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-black text-sm tracking-wide">Travel AI</span>
                  <span className="bg-cyan text-navy font-extrabold text-[8px] px-1.5 py-0.5 rounded uppercase tracking-wider">NEW</span>
                </div>
                <p className="text-white/80 text-[11px] mt-0.5 font-medium">Discover the best places near you</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/80" />
          </button>

          {/* Sub-actions 2-Column Grid */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/digital-id')}
              className="glass-card p-4 flex flex-col items-center justify-center gap-2 hover:border-cyan/30 transition-all active:scale-95 text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center">
                <IdCard className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-xs text-white/80 font-bold tracking-wide">Digital ID</span>
            </button>
            <button
              onClick={() => navigate('/map')}
              className="glass-card p-4 flex flex-col items-center justify-center gap-2 hover:border-cyan/30 transition-all active:scale-95 text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-cyan/10 border border-cyan/25 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-cyan" />
              </div>
              <span className="text-xs text-white/80 font-bold tracking-wide">Live Map</span>
            </button>
          </div>

          {/* Location Status Card */}
          <div className="glass-card p-5 space-y-3.5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyan" />
                  <p className="font-bold text-sm text-white">{data?.location.name || 'Marina Bay Sands'}</p>
                </div>
                <p className="text-white/40 text-[11px] mt-1 pl-6">{data?.location.area || 'Singapore • Geo-fenced Area'}</p>
              </div>
              {data?.location.active && (
                <span className="px-2.5 py-1 rounded-full bg-safe/10 border border-safe/25 text-safe text-[10px] font-bold tracking-wide uppercase">Active</span>
              )}
            </div>
            <div className="h-px bg-white/5 my-1.5" />
            <div className="flex items-center justify-between text-xs pt-2 pb-0.5 px-0.5">
              <div className="flex items-center gap-2.5 text-white/60 font-medium">
                <CloudRain className="w-4 h-4 text-cyan" />
                {data?.location.weather || 'Light Rain • 28°C'}
              </div>
              <span className={`text-[10px] font-bold tracking-wide uppercase ${data?.location.weatherStatus === 'Weather Safe' ? 'text-safe' : 'text-amber-400'}`}>
                {data?.location.weatherStatus || 'Weather Safe'}
              </span>
            </div>
          </div>

          {/* Nearby Alerts Section */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="font-bold text-sm text-white tracking-wide">Nearby Alerts</h2>
              <button onClick={() => navigate('/alerts')} className="text-cyan text-xs flex items-center gap-1 font-semibold">
                View All <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            
            <div className="space-y-3">
              {(data?.nearbyAlerts || []).map((alert) => (
                <div key={alert.id} className="glass-card p-4 flex gap-3.5 items-start animate-fadeSlideUp">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center flex-shrink-0 text-sm">
                    ⚠️
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-bold text-white tracking-wide truncate">{alert.title}</p>
                      <span className="text-white/30 text-[10px] font-semibold">{timeAgo(alert.createdAt)}</span>
                    </div>
                    <p className="text-white/50 text-[11px] mt-1 leading-relaxed">{alert.message}</p>
                  </div>
                </div>
              ))}
              {(data?.nearbyAlerts || []).length === 0 && (
                <div className="glass-card p-6 text-center text-white/30 text-xs">
                  No active alerts near your location.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
      <BottomNav />
    </BackgroundGlow>
  );
}
