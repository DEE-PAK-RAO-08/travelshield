import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { BackgroundGlow } from '@/components/ui/BackgroundGlow';
import { authApi } from '@/api/client';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Reset failed');
    }
  };

  return (
    <BackgroundGlow showMenu={false}>
      <div className="px-6 pt-16">
        <h1 className="font-grotesk font-bold text-2xl text-white mb-2">Reset Password</h1>
        {done ? (
          <p className="text-safe">Password reset! Redirecting to login...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            {error && <p className="text-danger text-sm">{error}</p>}
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New Password" className="glass-input w-full h-12 pl-12 pr-4" required minLength={8} />
            </div>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm Password" className="glass-input w-full h-12 px-4" required />
            <button type="submit" className="btn-primary w-full h-12">Reset Password</button>
          </form>
        )}
        <Link to="/login" className="block text-center text-cyan text-sm mt-6">Back to login</Link>
      </div>
    </BackgroundGlow>
  );
}
