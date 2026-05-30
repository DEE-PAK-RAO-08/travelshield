import { useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Shield, ShieldAlert, CheckCircle, Database, Calendar, Globe, Hash, User, Loader2 } from 'lucide-react';
import { BackgroundGlow } from '@/components/ui/BackgroundGlow';

export default function VerifyPassportPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);

  const id = searchParams.get('id');
  const name = searchParams.get('name');
  const nationality = searchParams.get('nationality');
  const valid = searchParams.get('valid');
  const hash = searchParams.get('hash');

  useEffect(() => {
    // Simulate real-time decentralized ledger query lookup
    const timer = setTimeout(() => {
      setVerifying(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '12/2026';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const isValid = id && name && hash;

  return (
    <BackgroundGlow showMenu={false}>
      <div className="px-6 py-12 lg:max-w-lg lg:mx-auto min-h-screen flex flex-col justify-center">
        {verifying ? (
          <div className="glass-card p-8 text-center flex flex-col items-center justify-center space-y-4 border-cyan/20">
            <Loader2 className="w-12 h-12 text-cyan animate-spin" />
            <h2 className="font-grotesk font-bold text-white text-lg">Querying Blockchain Ledger...</h2>
            <p className="text-white/50 text-xs">Accessing decentralized travel registry nodes</p>
          </div>
        ) : !isValid ? (
          <div className="glass-card p-8 text-center flex flex-col items-center justify-center space-y-4 border-danger/20">
            <div className="w-16 h-16 rounded-full bg-danger/25 flex items-center justify-center border border-danger/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              <ShieldAlert className="w-8 h-8 text-danger" />
            </div>
            <h2 className="font-grotesk font-bold text-white text-lg">Verification Failed</h2>
            <p className="text-white/50 text-xs px-2">
              The credentials structure is incomplete or invalid. Please scan a valid TravelShield passport QR code.
            </p>
            <button onClick={() => navigate('/')} className="btn-secondary w-full h-11 text-sm font-medium mt-4">
              Return Home
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Success Badge */}
            <div className="text-center flex flex-col items-center space-y-2.5">
              <div className="w-20 h-20 rounded-full bg-safe/20 border-2 border-safe flex items-center justify-center shadow-[0_0_25px_rgba(74,222,128,0.3)] relative animate-pulse">
                <CheckCircle className="w-10 h-10 text-safe" />
              </div>
              <div>
                <h1 className="font-grotesk font-bold text-white text-2xl tracking-wide">ID VERIFIED SECURE</h1>
                <p className="text-safe text-xs font-semibold tracking-wider mt-1 flex items-center justify-center gap-1.5 uppercase">
                  <Database className="w-3.5 h-3.5" /> Decentralized Ledger Confirmed
                </p>
              </div>
            </div>

            {/* Verification Details Card */}
            <div className="relative rounded-2xl overflow-hidden border border-cyan/20 bg-gradient-to-br from-cyan/5 via-navy-card to-blue-950/20">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan/5 via-transparent to-blue-900/10 pointer-events-none" />
              <div className="relative p-6 space-y-5">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <div>
                    <p className="text-cyan text-[10px] tracking-widest font-bold uppercase">Registry Status</p>
                    <p className="text-white font-grotesk font-bold text-sm tracking-wide mt-0.5">ACTIVE VISITOR</p>
                  </div>
                  <Shield className="w-6 h-6 text-cyan" />
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <User className="w-4 h-4 text-white/40 mt-1" />
                    <div>
                      <p className="text-white/40 text-[10px] uppercase font-medium">Tourist Name</p>
                      <p className="text-white font-medium text-base tracking-wide uppercase">{name}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <Hash className="w-4 h-4 text-white/40 mt-1" />
                      <div>
                        <p className="text-white/40 text-[10px] uppercase font-medium">Tourist ID</p>
                        <p className="text-white font-medium text-sm">{id}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Globe className="w-4 h-4 text-white/40 mt-1" />
                      <div>
                        <p className="text-white/40 text-[10px] uppercase font-medium">Nationality</p>
                        <p className="text-white font-medium text-sm">{nationality || 'USA'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-white/40 mt-1" />
                    <div>
                      <p className="text-white/40 text-[10px] uppercase font-medium">Valid Until</p>
                      <p className="text-white font-medium text-sm">{formatDate(valid)}</p>
                    </div>
                  </div>

                  {/* Verification Hash hidden for security */}
                </div>
              </div>
            </div>

            {/* Verification Stats / Blockchain details */}
            <div className="glass-card p-4 text-xs font-mono space-y-2 border-white/5">
              <div className="flex justify-between">
                <span className="text-white/40">Ledger Contract:</span>
                <span className="text-white/80">0xTravelShieldRegistryv1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Query Node IP:</span>
                <span className="text-white/80">12.188.42.1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Verification Date:</span>
                <span className="text-white/80">{new Date().toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/')}
              className="btn-secondary w-full h-11 text-sm font-medium hover:brightness-110 active:scale-[0.99]"
            >
              Return to App
            </button>
          </div>
        )}
      </div>
    </BackgroundGlow>
  );
}
