import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Map, Bell, User, ShieldAlert } from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: Home, label: 'Home' },
  { to: '/map', icon: Map, label: 'Map' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:static">
      <div className="mx-auto w-full lg:max-w-none">
        <div
          className="relative bg-gradient-to-t from-navy via-navy/95 to-transparent lg:bg-navy-card lg:border-t lg:border-white/10"
          style={{
            padding: '12px 28px 0 28px',
            paddingBottom: 'calc(18px + env(safe-area-inset-bottom, 0px))',
          }}
        >
          <div className="flex items-center justify-between relative max-w-md mx-auto lg:max-w-2xl">
            {navItems.slice(0, 2).map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1.5 min-w-[56px] py-1 ${isActive ? 'text-cyan' : 'text-white/45'}`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${isActive ? 'bg-cyan/15 shadow-[0_0_12px_rgba(0,229,255,0.2)]' : 'hover:bg-white/5'}`}>
                      <Icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.2 : 1.8} />
                    </div>
                    <span className="text-[10px] font-semibold tracking-wide">{label}</span>
                  </>
                )}
              </NavLink>
            ))}

            {/* SOS Button — centred with extra margin so it clears the nav items */}
            <div className="flex flex-col items-center min-w-[56px] relative" style={{ marginTop: '-28px' }}>
              <button
                onClick={() => navigate('/sos')}
                className="w-[60px] h-[60px] bg-danger rounded-full border-[3px] border-navy shadow-glow-sos flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
              >
                <ShieldAlert className="w-7 h-7 text-white" />
              </button>
              <span className="text-[9px] font-semibold text-danger/80 mt-1.5 tracking-wide">SOS</span>
            </div>

            {navItems.slice(2).map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1.5 min-w-[56px] py-1 ${isActive ? 'text-cyan' : 'text-white/45'}`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${isActive ? 'bg-cyan/15 shadow-[0_0_12px_rgba(0,229,255,0.2)]' : 'hover:bg-white/5'}`}>
                      <Icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.2 : 1.8} />
                    </div>
                    <span className="text-[10px] font-semibold tracking-wide">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PageHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <div className="flex items-center gap-4 px-6 pt-6 pb-4">
      {onBack && (
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
      )}
      <h1 className="font-grotesk font-bold text-2xl text-white">{title}</h1>
    </div>
  );
}
