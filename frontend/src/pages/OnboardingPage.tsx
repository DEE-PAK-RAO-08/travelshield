import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Shield, Users, AlertTriangle } from 'lucide-react';
import { BackgroundGlow } from '@/components/ui/BackgroundGlow';
import { useOnboardingStore } from '@/store/authStore';

const slides = [
  {
    icon: Shield,
    title: 'Tourist Safety First',
    description: 'Your personal AI guardian while exploring new destinations with real-time protection.',
    color: 'from-cyan/20 to-blue-500/10',
  },
  {
    icon: Users,
    title: 'AI Crowd Monitoring',
    description: 'Real-time heatmaps and risk predictions to help you avoid crowded or unsafe areas.',
    color: 'from-purple-500/20 to-cyan/10',
  },
  {
    icon: AlertTriangle,
    title: 'Emergency SOS',
    description: 'One-tap emergency response with instant alerts to contacts and local authorities.',
    color: 'from-red-500/20 to-orange-500/10',
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const { setCompleted } = useOnboardingStore();
  const slide = slides[step];
  const Icon = slide.icon;

  const next = () => {
    if (step < slides.length - 1) setStep(step + 1);
    else {
      setCompleted(true);
      navigate('/login');
    }
  };

  const skip = () => {
    setCompleted(true);
    navigate('/login');
  };

  return (
    <BackgroundGlow>
      <div className="flex flex-col min-h-[calc(100vh-32px)] px-6 pt-12 pb-8">
        <div className="flex justify-end mb-8">
          <button onClick={skip} className="text-white/60 text-sm font-medium hover:text-cyan transition-colors">
            Skip
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="relative mb-10">
            <div className={`absolute inset-0 bg-gradient-to-br ${slide.color} rounded-full blur-2xl scale-150`} />
            <div className="relative w-48 h-48 flex items-center justify-center">
              <div className="w-32 h-32 rounded-3xl bg-navy-card border border-cyan/30 flex items-center justify-center shadow-glow">
                <Icon className="w-16 h-16 text-cyan" strokeWidth={1.5} />
              </div>
            </div>
          </div>

          <h2 className="font-grotesk font-bold text-2xl text-white text-center mb-4">{slide.title}</h2>
          <p className="text-white/60 text-center text-sm leading-relaxed max-w-[280px]">{slide.description}</p>
        </div>

        <div className="space-y-6">
          <div className="flex justify-center gap-2">
            {slides.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === step ? 'w-8 bg-cyan' : 'w-2 bg-white/20'}`}
              />
            ))}
          </div>

          <button onClick={next} className="btn-primary w-full h-12 flex items-center justify-center gap-2">
            {step === slides.length - 1 ? 'Get Started' : 'Next'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </BackgroundGlow>
  );
}
