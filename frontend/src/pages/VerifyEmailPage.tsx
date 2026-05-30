import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, Loader } from 'lucide-react';
import { BackgroundGlow } from '@/components/ui/BackgroundGlow';
import { authApi } from '@/api/client';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email address...');
  const navigate = useNavigate();
  const verifyCalled = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid or missing verification token.');
      return;
    }

    if (verifyCalled.current) return;
    verifyCalled.current = true;

    authApi.verifyEmail(token)
      .then((res) => {
        setStatus('success');
        setMessage(res.data.message || 'Email verified successfully! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      })
      .catch((err) => {
        setStatus('error');
        const errMsg = err.response?.data?.message || 'Verification failed. The token may have expired or already been used.';
        setMessage(errMsg);
      });
  }, [token, navigate]);

  return (
    <BackgroundGlow showMenu={false}>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] px-6 pt-12 pb-8">
        <div className="glass-card p-8 w-full max-w-md text-center space-y-6">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4">
              <Loader className="w-12 h-12 text-cyan animate-spin" />
              <h2 className="font-grotesk font-bold text-xl text-white">Verifying Email</h2>
              <p className="text-white/60 text-sm">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-safe/10 border border-safe/30 flex items-center justify-center shadow-[0_0_15px_rgba(74,222,128,0.2)]">
                <ShieldCheck className="w-8 h-8 text-safe" />
              </div>
              <h2 className="font-grotesk font-bold text-xl text-white">Email Verified!</h2>
              <p className="text-white/60 text-sm">{message}</p>
              <Link to="/login" className="btn-primary w-full h-11 flex items-center justify-center mt-4">
                Proceed to Login
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-danger/10 border border-danger/30 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                <ShieldAlert className="w-8 h-8 text-danger" />
              </div>
              <h2 className="font-grotesk font-bold text-xl text-white">Verification Failed</h2>
              <p className="text-white/60 text-sm">{message}</p>
              <Link to="/login" className="btn-secondary w-full h-11 flex items-center justify-center mt-4">
                Back to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </BackgroundGlow>
  );
}
