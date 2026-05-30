import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { BackgroundGlow } from '@/components/ui/BackgroundGlow';
import { authApi } from '@/api/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BackgroundGlow showMenu={false}>
      <div className="px-6 pt-8">
        <Link to="/login" className="inline-flex items-center gap-2 text-white/60 text-sm mb-8 hover:text-cyan">
          <ArrowLeft className="w-4 h-4" /> Back to login
        </Link>
        <h1 className="font-grotesk font-bold text-2xl text-white mb-2">Forgot Password</h1>
        <p className="text-white/60 text-sm mb-8">Enter your email to receive a reset link</p>

        {sent ? (
          <div className="glass-card p-6 text-center">
            <p className="text-safe font-medium mb-2">Check your email</p>
            <p className="text-white/60 text-sm">If an account exists, we sent a password reset link.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" className="glass-input w-full h-12 pl-12 pr-4" required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full h-12">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}
      </div>
    </BackgroundGlow>
  );
}
