import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { BackgroundGlow } from '@/components/ui/BackgroundGlow';
import { PageHeader } from '@/components/layout/BottomNav';
import { dashboardApi } from '@/api/client';

const periods = ['today', 'yesterday', 'week', 'month'];
const periodLabels: Record<string, string> = { today: 'Today', yesterday: 'Yesterday', week: 'This Week', month: 'This Month' };

export default function TravelHistoryPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('today');
  const [history, setHistory] = useState<Array<Record<string, string>>>([]);

  useEffect(() => {
    dashboardApi.travelHistory(period).then(({ data }) => setHistory(data.data.history));
  }, [period]);

  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <BackgroundGlow>
      <PageHeader title="Travel History" onBack={() => navigate(-1)} />
      <div className="px-6 pb-8">
        <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                period === p ? 'bg-cyan/20 text-cyan border border-cyan/30' : 'bg-white/5 text-white/60 border border-white/10'
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>

        <div className="space-y-6 relative before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-px before:bg-white/10">
          {history.map((item) => (
            <div key={item.id} className="relative pl-8">
              <div className="absolute left-0 top-1 w-2.5 h-2.5 rounded-full bg-cyan border-2 border-navy" />
              <p className="text-white/40 text-xs mb-2">{formatTime(item.createdAt)}</p>
              <div className="glass-card p-4">
                <p className="font-medium text-white text-sm">{item.title}</p>
                <div className="flex items-center gap-2 mt-2 text-white/50 text-xs">
                  <MapPin className="w-3 h-3" />
                  {item.location}
                </div>
              </div>
            </div>
          ))}
          {history.length === 0 && (
            <p className="text-white/40 text-sm text-center py-8">No events for this period</p>
          )}
        </div>
      </div>
    </BackgroundGlow>
  );
}
