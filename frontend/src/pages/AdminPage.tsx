import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Bell, AlertTriangle, Activity, LogOut } from 'lucide-react';
import { BackgroundGlow } from '@/components/ui/BackgroundGlow';
import { dashboardApi } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

export default function AdminPage() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  const [users, setUsers] = useState<Array<{ id: string; firstName: string; lastName: string; email: string; role: string; isActive: boolean }>>([]);

  useEffect(() => {
    dashboardApi.adminAnalytics().then(({ data }) => setAnalytics(data.data));
    dashboardApi.adminUsers().then(({ data }) => setUsers(data.data.users));
  }, []);

  const stats = [
    { icon: Users, label: 'Total Users', value: analytics?.userCount || 0, color: 'text-cyan' },
    { icon: Bell, label: 'Total Alerts', value: analytics?.alertCount || 0, color: 'text-yellow-400' },
    { icon: AlertTriangle, label: 'Active SOS', value: analytics?.sosCount || 0, color: 'text-danger' },
    { icon: Activity, label: 'Active (24h)', value: analytics?.activeUsers || 0, color: 'text-safe' },
  ];

  return (
    <BackgroundGlow>
      <div className="px-6 pt-8 pb-8 lg:max-w-6xl lg:mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-grotesk font-bold text-2xl text-white">Admin Dashboard</h1>
            <p className="text-white/50 text-sm">TravelShield Management Console</p>
          </div>
          <button onClick={() => { logout(); navigate('/login'); }} className="flex items-center gap-2 text-danger text-sm">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="glass-card p-5">
              <Icon className={`w-6 h-6 ${color} mb-3`} />
              <p className="text-2xl font-bold text-white">{value as number}</p>
              <p className="text-white/50 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>

        <h2 className="font-medium text-white mb-4">User Management</h2>
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/50">
                  <th className="text-left p-4">Name</th>
                  <th className="text-left p-4 hidden md:table-cell">Email</th>
                  <th className="text-left p-4">Role</th>
                  <th className="text-left p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-white/5">
                    <td className="p-4 text-white">{u.firstName} {u.lastName}</td>
                    <td className="p-4 text-white/60 hidden md:table-cell">{u.email}</td>
                    <td className="p-4"><span className="px-2 py-0.5 rounded text-xs bg-cyan/20 text-cyan">{u.role}</span></td>
                    <td className="p-4"><span className={`text-xs ${u.isActive ? 'text-safe' : 'text-danger'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </BackgroundGlow>
  );
}
