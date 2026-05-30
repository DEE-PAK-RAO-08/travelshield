import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Fingerprint, Shield } from 'lucide-react';
import { BackgroundGlow } from '@/components/ui/BackgroundGlow';
import { authApi } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { BiometricModal } from '@/components/ui/BiometricModal';

export default function LoginPage() {
  const [email, setEmail] = useState('alex@travelshield.ai');
  const [password, setPassword] = useState('User@123456');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isBiometricOpen, setIsBiometricOpen] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await authApi.login(email, password);
      setAuth(data.data.user, data.data.accessToken, data.data.refreshToken);
      navigate(data.data.user.role === 'ADMIN' ? '/admin' : '/dashboard');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string; code?: string };
      const msg = axiosErr?.response?.data?.message;
      if (!axiosErr?.response) {
        setError('Cannot connect to server. Start the backend: cd travelshield/backend && npm run dev');
      } else {
        setError(msg || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricClick = () => {
    const biometricData = localStorage.getItem('travelshield-biometric');
    if (!biometricData) {
      setError('Biometric login is not set up on this device. Please log in with password first and enable it in Settings.');
      return;
    }
    setIsBiometricOpen(true);
  };

  const handleBiometricSuccess = async () => {
    setIsBiometricOpen(false);
    setLoading(true);
    setError('');
    try {
      const biometricData = JSON.parse(localStorage.getItem('travelshield-biometric') || '{}');
      if (!biometricData.refreshToken) {
        setError('Saved biometric credentials are invalid. Please log in with password.');
        return;
      }
      
      const { data } = await authApi.refreshSession(biometricData.refreshToken);
      const userRes = await authApi.me(); // Fetch fresh user profile details
      
      setAuth(userRes.data.data, data.data.accessToken, data.data.refreshToken);
      
      // Update local storage credentials with the fresh refresh token
      localStorage.setItem('travelshield-biometric', JSON.stringify({
        email: userRes.data.data.email,
        refreshToken: data.data.refreshToken,
      }));

      navigate(userRes.data.data.role === 'ADMIN' ? '/admin' : '/dashboard');
    } catch (err) {
      setError('Session expired. Please log in with your password to re-enable biometric access.');
      localStorage.removeItem('travelshield-biometric');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BackgroundGlow>
      <div className="flex flex-col min-h-[calc(100vh-32px)] px-6 pt-16 pb-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-navy-card border border-cyan/30 flex items-center justify-center mb-6 shadow-glow">
            <Shield className="w-8 h-8 text-cyan" />
          </div>
          <h1 className="font-grotesk font-bold text-2xl text-white">Welcome Back</h1>
          <p className="text-white/60 text-sm mt-2">Access your smart travel dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-4 space-y-4 mb-6">
          {error && <p className="text-danger text-sm text-center">{error}</p>}
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address"
              className="glass-input w-full h-[50px] pl-12 pr-4"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="glass-input w-full h-[50px] pl-12 pr-4"
              required
            />
          </div>
          <div className="text-right">
            <Link to="/forgot-password" className="text-cyan text-xs font-medium hover:underline">
              Forgot Password?
            </Link>
          </div>
        </form>

        <div className="space-y-4">
          <button type="submit" onClick={handleSubmit} disabled={loading} className="btn-primary w-full h-12 disabled:opacity-50">
            {loading ? 'Signing in...' : 'Login to Dashboard'}
          </button>
          <button 
            type="button" 
            onClick={handleBiometricClick}
            className="btn-secondary w-full h-12 flex items-center justify-center gap-2"
          >
            <Fingerprint className="w-5 h-5" />
            Biometric Login
          </button>
        </div>

        <BiometricModal 
          isOpen={isBiometricOpen}
          onClose={() => setIsBiometricOpen(false)}
          onSuccess={handleBiometricSuccess}
          action="login"
        />

        <p className="text-center mt-8 text-sm">
          <span className="text-white/50">New tourist? </span>
          <Link to="/register" className="text-cyan font-medium hover:underline">Create Account</Link>
        </p>
      </div>
    </BackgroundGlow>
  );
}
