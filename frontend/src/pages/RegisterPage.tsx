import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Shield } from 'lucide-react';
import { BackgroundGlow } from '@/components/ui/BackgroundGlow';
import { authApi } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

export default function RegisterPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await authApi.register({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
      });
      setAuth(data.data.user, data.data.accessToken, data.data.refreshToken);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BackgroundGlow>
      <div className="flex flex-col min-h-[calc(100vh-32px)] px-6 pt-16 pb-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-navy-card border border-cyan/30 flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-cyan" />
          </div>
          <h1 className="font-grotesk font-bold text-2xl text-white">Create Account</h1>
          <p className="text-white/60 text-sm mt-1">Join the TravelShield safety network</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-4 space-y-3 mb-6">
          {error && <p className="text-danger text-sm text-center">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input placeholder="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="glass-input w-full h-11 pl-10 pr-3 text-sm" required />
            </div>
            <input placeholder="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="glass-input w-full h-11 px-3 text-sm" required />
          </div>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input type="email" placeholder="Email Address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="glass-input w-full h-11 pl-12 pr-4 text-sm" required />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input type="password" placeholder="Password (min 8 chars)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="glass-input w-full h-11 pl-12 pr-4 text-sm" required minLength={8} />
          </div>
          <input type="password" placeholder="Confirm Password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} className="glass-input w-full h-11 px-4 text-sm" required />
        </form>

        <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full h-12 disabled:opacity-50">
          {loading ? 'Creating account...' : 'Create Account'}
        </button>

        <p className="text-center mt-6 text-sm">
          <span className="text-white/50">Already have an account? </span>
          <Link to="/login" className="text-cyan font-medium">Login</Link>
        </p>
      </div>
    </BackgroundGlow>
  );
}
