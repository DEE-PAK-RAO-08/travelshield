import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, QrCode, Copy, Check, Fingerprint, X } from 'lucide-react';
import { BackgroundGlow } from '@/components/ui/BackgroundGlow';
import { PageHeader } from '@/components/layout/BottomNav';
import { dashboardApi } from '@/api/client';

interface DigitalId {
  touristId?: string;
  name?: string;
  nationality?: string;
  validUntil?: string;
  blockchainHash?: string;
  biometricEnabled?: boolean;
}

export default function DigitalIdPage() {
  const navigate = useNavigate();
  const [id, setId] = useState<DigitalId | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    dashboardApi.digitalId().then(({ data }) => setId(data.data));
  }, []);

  const copyHash = () => {
    if (id?.blockchainHash) {
      navigator.clipboard.writeText(id.blockchainHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatHash = (hash?: string) => {
    if (!hash) return '0x7F...3A9B';
    if (hash.length <= 16) return hash;
    return `${hash.slice(0, 8)}...${hash.slice(-4)}`;
  };

  // Construct structured QR code verification URL containing user details
  const qrData = id
    ? `${window.location.origin}/verify-passport?id=${id.touristId}&name=${encodeURIComponent(id.name || '')}&nationality=${encodeURIComponent(id.nationality || '')}&valid=${id.validUntil ? encodeURIComponent(id.validUntil) : ''}&hash=${id.blockchainHash || ''}`
    : '';

  // Use a beautifully styled cyan-on-dark QR image URL
  const qrImageUrl = qrData
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&color=00e5ff&bgcolor=0a1330&data=${encodeURIComponent(qrData)}`
    : '';

  return (
    <BackgroundGlow>
      <PageHeader title="Digital Tourist ID" onBack={() => navigate(-1)} />
      <div className="px-6 pb-8 lg:max-w-lg lg:mx-auto">
        {/* Passport Card */}
        <div className="relative rounded-2xl overflow-hidden mb-6 border border-cyan/20">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan/10 via-navy-card to-blue-900/30" />
          <div className="relative p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-cyan text-xs tracking-wider">TravelShield Verified</p>
                <p className="font-grotesk font-bold text-white text-lg tracking-wide">TOURIST PASSPORT</p>
              </div>
              <Shield className="w-8 h-8 text-cyan" />
            </div>
            <div className="flex gap-4">
              <div className="w-16 h-16 rounded-xl bg-navy border border-white/10 flex items-center justify-center">
                <span className="text-2xl">👤</span>
              </div>
              <div className="flex-1">
                <p className="text-white/50 text-xs">Name</p>
                <p className="text-white font-medium tracking-wide">{id?.name || 'ALEX TRAVELER'}</p>
                <div className="flex gap-4 mt-2">
                  <div>
                    <p className="text-white/50 text-xs">Nationality</p>
                    <p className="text-white text-sm">{id?.nationality || 'USA'}</p>
                  </div>
                  <div>
                    <p className="text-white/50 text-xs">Valid Until</p>
                    <p className="text-white text-sm">{id?.validUntil ? new Date(id.validUntil).toLocaleDateString('en-US', { month: '2-digit', year: 'numeric' }) : '12/2026'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowQrModal(true)}
          className="btn-primary w-full h-14 flex items-center justify-center gap-3 mb-4 hover:brightness-110 active:scale-[0.99] transition-all"
        >
          <QrCode className="w-5 h-5" />
          Show QR for Verification
        </button>

        <div className="glass-card p-4 flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-cyan" />
            </div>
            <div>
              <p className="text-white text-sm">Blockchain Hash</p>
              <p className="text-white/50 text-xs font-mono select-all truncate max-w-[200px]" title={id?.blockchainHash}>
                {id?.blockchainHash ? formatHash(id.blockchainHash) : '0x7F...3A9B'}
              </p>
            </div>
          </div>
          <button
            onClick={copyHash}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              copied ? 'bg-safe/20 text-safe' : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {copied ? <Check className="w-4 h-4 text-safe" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <div className="glass-card p-4 flex items-center gap-3">
          <Fingerprint className="w-5 h-5 text-safe" />
          <div>
            <p className="text-white text-sm">Biometric Status</p>
            <p className="text-safe text-xs">{id?.biometricEnabled ? 'Verified & Active' : 'Not configured'}</p>
          </div>
        </div>
      </div>

      {/* QR Verification Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-4 transition-all">
          <style>{`
            @keyframes scan {
              0% { top: 0%; }
              50% { top: 100%; }
              100% { top: 0%; }
            }
            .animate-scan {
              animation: scan 3s linear infinite;
            }
          `}</style>
          <div className="glass-card max-w-[350px] w-full p-6 text-center border-cyan/30 shadow-glow relative animate-fade-in animate-[fadeIn_0.2s_ease-out]">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mt-4 mb-6">
              <h2 className="font-grotesk font-bold text-white text-lg">Passport QR Verification</h2>
              <p className="text-white/50 text-xs mt-1">Scan to verify decentralized tourist identity details</p>
            </div>

            {/* QR Container with Laser Line Animation */}
            <div className="relative mx-auto w-[240px] h-[240px] bg-navy-card p-2.5 rounded-2xl border border-cyan/20 overflow-hidden flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.05)]">
              {/* Scan Laser Line - pointer-events-none ensures clicks go through to the link */}
              <div className="absolute left-2.5 right-2.5 h-[2px] bg-cyan shadow-[0_0_10px_#00e5ff] animate-scan z-10 pointer-events-none" />

              {/* Clickable QR Image */}
              {qrImageUrl ? (
                <a href={qrData} target="_blank" rel="noopener noreferrer" title="Click to simulate camera scan" className="relative z-0 block hover:scale-[1.02] transition-transform">
                  <img
                    src={qrImageUrl}
                    alt="Tourist Verification QR Code"
                    className="w-[220px] h-[220px] rounded-xl object-contain"
                  />
                </a>
              ) : (
                <div className="w-[220px] h-[220px] bg-navy flex items-center justify-center">
                  <span className="text-white/30 text-xs animate-pulse">Generating QR...</span>
                </div>
              )}
            </div>

            <p className="text-cyan/80 text-[11px] mt-4 font-medium animate-pulse">
              💡 Tip: Click the QR code above to simulate a mobile scan on your desktop!
            </p>

            <button
              onClick={() => setShowQrModal(false)}
              className="btn-secondary w-full h-11 mt-6 text-sm font-medium hover:brightness-110 transition-all active:scale-[0.98]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </BackgroundGlow>
  );
}
