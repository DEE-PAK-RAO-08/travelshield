import { useEffect, useState } from 'react';
import { AlertTriangle, CloudRain, ShieldCheck } from 'lucide-react';
import { BackgroundGlow } from '@/components/ui/BackgroundGlow';
import { BottomNav } from '@/components/layout/BottomNav';
import { dashboardApi } from '@/api/client';

const severityColors: Record<string, string> = {
  HIGH: 'border-orange-500/30 bg-orange-500/10',
  MEDIUM: 'border-yellow-500/30 bg-yellow-500/10',
  LOW: 'border-safe/30 bg-safe/10',
  CRITICAL: 'border-danger/30 bg-danger/10',
};

const typeIcons: Record<string, typeof AlertTriangle> = {
  CROWD: AlertTriangle,
  WEATHER: CloudRain,
  SAFE_ZONE: ShieldCheck,
  EMERGENCY: AlertTriangle,
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Array<{ id: string; title: string; message: string; type: string; severity: string; isRead: boolean; createdAt: string }>>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    dashboardApi.alerts().then(({ data }) => {
      setAlerts(data.data.alerts);
      setUnreadCount(data.data.unreadCount);
    });
  }, []);

  const markRead = async (id: string) => {
    await dashboardApi.markAlertRead(id);
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const timeAgo = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  return (
    <BackgroundGlow>
      <div className="px-6 pt-8 pb-28 lg:max-w-3xl lg:mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="font-grotesk font-bold text-2xl text-white">Smart Alerts</h1>
          {unreadCount > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-cyan/20 border border-cyan/30 text-cyan text-xs font-medium">
              {unreadCount} New
            </span>
          )}
        </div>

        <div className="space-y-4">
          {alerts.map((alert) => {
            const Icon = typeIcons[alert.type] || AlertTriangle;
            const isUnread = !alert.isRead;
            return (
              <button
                key={alert.id}
                onClick={() => isUnread && markRead(alert.id)}
                className={`w-full text-left glass-card p-4 border ${severityColors[alert.severity] || severityColors.MEDIUM} ${isUnread ? 'ring-1 ring-cyan/20' : 'opacity-80'}`}
              >
                <div className="flex items-start gap-3">
                  <Icon className="w-5 h-5 text-cyan shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-medium text-white text-sm">{alert.title}</p>
                      <span className="text-white/40 text-xs shrink-0">{timeAgo(alert.createdAt)}</span>
                    </div>
                    <p className="text-white/50 text-xs mt-1 leading-relaxed">{alert.message}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <BottomNav />
    </BackgroundGlow>
  );
}
