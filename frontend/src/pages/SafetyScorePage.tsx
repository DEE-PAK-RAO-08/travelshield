import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Shield, CloudRain } from 'lucide-react';
import { BackgroundGlow } from '@/components/ui/BackgroundGlow';
import { PageHeader } from '@/components/layout/BottomNav';
import { dashboardApi } from '@/api/client';

interface SafetyScore {
  overallScore?: number;
  areaSafety?: string;
  aiConfidence?: number;
  crowdDensity?: string;
  crimeRate?: string;
  weatherConditions?: string;
}

export default function SafetyScorePage() {
  const navigate = useNavigate();
  const [score, setScore] = useState<SafetyScore | null>(null);

  useEffect(() => {
    dashboardApi.safetyScore().then(({ data }) => setScore(data.data));
  }, []);

  const getScoreRating = (s?: number) => {
    if (s === undefined) return { label: 'Loading...', color: 'text-cyan', stroke: '#00e5ff' };
    if (s >= 85) return { label: 'Excellent', color: 'text-safe', stroke: '#10b981' };
    if (s >= 70) return { label: 'Moderate', color: 'text-yellow-400', stroke: '#eab308' };
    if (s >= 50) return { label: 'Caution', color: 'text-orange-400', stroke: '#f97316' };
    return { label: 'Danger', color: 'text-red-500', stroke: '#ef4444' };
  };

  const getStatusColor = (field: string, val?: string) => {
    if (!val) return 'text-white/60';
    const v = val.toLowerCase();
    if (field === 'crowd') {
      if (v.includes('high')) return 'text-red-500';
      if (v.includes('mod')) return 'text-yellow-400';
      return 'text-safe';
    }
    if (field === 'crime') {
      if (v.includes('high')) return 'text-red-500';
      if (v.includes('mod')) return 'text-yellow-400';
      return 'text-safe';
    }
    if (field === 'weather') {
      if (v.includes('adverse') || v.includes('bad') || v.includes('storm')) return 'text-red-500';
      if (v.includes('mod')) return 'text-yellow-400';
      return 'text-safe';
    }
    return 'text-white';
  };

  const rating = getScoreRating(score?.overallScore);

  const breakdown = [
    { 
      icon: Users, 
      label: 'Crowd Density', 
      value: score?.crowdDensity || '...', 
      status: getStatusColor('crowd', score?.crowdDensity) 
    },
    { 
      icon: Shield, 
      label: 'Crime Rate (Historical)', 
      value: score?.crimeRate || '...', 
      status: getStatusColor('crime', score?.crimeRate) 
    },
    { 
      icon: CloudRain, 
      label: 'Weather Conditions', 
      value: score?.weatherConditions || '...', 
      status: getStatusColor('weather', score?.weatherConditions) 
    },
  ];

  return (
    <BackgroundGlow>
      <PageHeader title="Safety Score" onBack={() => navigate(-1)} />
      <div className="px-6 pb-8 lg:max-w-lg lg:mx-auto">
        <div className="flex flex-col items-center my-8">
          <div className="relative w-40 h-40">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
              <circle cx="80" cy="80" r="70" fill="none" stroke={rating.stroke} strokeWidth="8" strokeDasharray={`${(score?.overallScore ?? 0) * 4.4} 440`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-cyan">{score?.overallScore !== undefined ? score.overallScore : '--'}</span>
              <span className={`${rating.color} text-xs font-semibold mt-1`}>{rating.label}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="glass-card p-4">
            <p className="text-white/50 text-xs mb-1">Area Safety</p>
            <p className="text-xl font-bold text-white">{score?.areaSafety || '...'}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-white/50 text-xs mb-1">AI Confidence</p>
            <p className="text-xl font-bold text-cyan">{score?.aiConfidence !== undefined ? `${score.aiConfidence}%` : '...'}</p>
          </div>
        </div>

        <h3 className="text-white font-medium mb-4">Score Breakdown</h3>
        <div className="space-y-3">
          {breakdown.map(({ icon: Icon, label, value, status }) => (
            <div key={label} className="glass-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-cyan" />
                <span className="text-sm text-white">{label}</span>
              </div>
              <span className={`text-sm font-medium ${status}`}>{String(value)}</span>
            </div>
          ))}
        </div>
      </div>
    </BackgroundGlow>
  );
}
