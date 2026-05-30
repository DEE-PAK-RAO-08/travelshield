import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackgroundGlow, ShieldLogo, BrandTitle } from '@/components/ui/BackgroundGlow';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/authStore';

export default function SplashPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { completed } = useOnboardingStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated) navigate('/dashboard');
      else if (completed) navigate('/login');
      else navigate('/onboarding');
    }, 2500);
    return () => clearTimeout(timer);
  }, [isAuthenticated, completed, navigate]);

  return (
    <BackgroundGlow showMenu={false}>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-32px)] px-6">
        <div className="mb-8">
          <ShieldLogo size="lg" />
        </div>
        <BrandTitle />
      </div>
    </BackgroundGlow>
  );
}
