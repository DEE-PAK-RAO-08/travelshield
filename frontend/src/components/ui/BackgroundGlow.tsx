import { Shield, LayoutGrid } from 'lucide-react';

interface BackgroundGlowProps {
  children: React.ReactNode;
  showMenu?: boolean;
  className?: string;
}

export function BackgroundGlow({ children, showMenu = true, className = '' }: BackgroundGlowProps) {
  return (
    <div className={`relative min-h-screen bg-navy overflow-hidden ${className}`}>
      <div className="mx-auto w-full lg:max-w-none min-h-screen relative">
        <div className="lg:max-w-7xl lg:mx-auto lg:px-8 lg:py-6">
          <div className="relative bg-navy rounded-none lg:rounded-3xl shadow-none lg:shadow-glow-lg min-h-screen lg:min-h-[calc(100vh-48px)] overflow-hidden">
            {/* Ambient glow orbs */}
            <div className="glow-orb-cyan w-[170px] h-[397px] -left-[43px] -top-[60px]" />
            <div className="glow-orb-blue w-[209px] h-[489px] right-[0px] top-[175px]" />
            <div className="glow-orb-indigo w-[274px] h-[640px] left-[87px] top-[356px]" />

            {showMenu && (
              <button className="absolute top-14 right-6 z-20 w-[38px] h-[38px] rounded-full backdrop-blur-md bg-[rgba(10,19,48,0.8)] border border-white/10 flex items-center justify-center shadow-lg">
                <LayoutGrid className="w-5 h-5 text-white/70" />
              </button>
            )}

            <div className="relative z-10">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ShieldLogo({ size = 'lg' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-16 h-16', md: 'w-24 h-24', lg: 'w-32 h-32' };
  const iconSizes = { sm: 'w-8 h-8', md: 'w-12 h-12', lg: 'w-16 h-16' };
  return (
    <div className={`relative ${sizes[size]}`}>
      <div className={`absolute inset-0 bg-[rgba(0,184,212,0.3)] blur-[25px] rounded-3xl`} />
      <div className={`relative ${sizes[size]} backdrop-blur-glass bg-[rgba(10,19,48,0.8)] border border-cyan/30 rounded-3xl shadow-glow flex items-center justify-center`}>
        <Shield className={`${iconSizes[size]} text-cyan`} strokeWidth={1.5} />
        <div className="absolute inset-0 border-2 border-cyan/50 rounded-3xl opacity-50" />
      </div>
    </div>
  );
}

export function BrandTitle() {
  return (
    <div className="text-center">
      <h1 className="font-orbitron font-bold text-[30px] text-white tracking-[1.5px] leading-9">
        TRAVELSHIELD
      </h1>
      <p className="font-inter font-medium text-cyan text-sm tracking-[2.8px] mt-2">
        AI SAFETY SYSTEM
      </p>
    </div>
  );
}
