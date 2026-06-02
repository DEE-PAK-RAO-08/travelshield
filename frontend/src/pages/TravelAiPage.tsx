import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Send, Utensils, Landmark, ShieldQuestion,
  Sparkles, Shield, Zap, Globe, RefreshCw, Mic, Map, Waves, Users, MapPin, AlertCircle } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';

interface Message {
  role: string;
  content: string;
  timestamp?: Date;
}

const suggestions = [
  { icon: Users, text: 'Crowd density safety tips', color: '#00e5ff' },
  { icon: Waves, text: 'Water & river safety warnings', color: '#34d399' },
  { icon: ShieldQuestion, text: 'Is this area safe to visit?', color: '#a78bfa' },
  { icon: Utensils, text: 'Find safe restaurants nearby', color: '#f59e0b' },
  { icon: Landmark, text: 'Top tourist attractions', color: '#f472b6' },
  { icon: Shield, text: 'Emergency tips for travelers', color: '#60a5fa' },
];

const features = [
  { icon: Globe, label: 'Location Intel' },
  { icon: Shield, label: 'Safety Alerts' },
  { icon: Zap, label: 'Instant Answers' },
];

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 justify-start">
      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #00e5ff22, #00e5ff44)', border: '1px solid #00e5ff44' }}>
        <Bot size={14} color="#00e5ff" />
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-bl-sm"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full" style={{
              background: '#00e5ff',
              animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg, index }: { msg: Message; index: number }) {
  const isUser = msg.role === 'user';
  return (
    <div
      className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
      style={{ animation: `fadeSlideUp 0.3s ease forwards`, animationDelay: `${index * 0.05}s`, opacity: 0 }}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #00e5ff22, #00e5ff44)', border: '1px solid #00e5ff44' }}>
          <Bot size={14} color="#00e5ff" />
        </div>
      )}
      <div
        className="max-w-[78%] px-4 py-3 text-sm leading-relaxed whitespace-pre-line"
        style={isUser ? {
          background: 'linear-gradient(135deg, #00e5ff, #0284c7)',
          color: '#0a0f1e',
          fontWeight: 500,
          borderRadius: '18px 18px 4px 18px',
          boxShadow: '0 4px 20px rgba(0,229,255,0.25)',
        } : {
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.9)',
          borderRadius: '18px 18px 18px 4px',
          backdropFilter: 'blur(10px)',
        }}
      >
        {msg.content}
      </div>
    </div>
  );
}

// ── Try Gemini API with multiple models/endpoints ────────────────────────────
async function callGemini(key: string, contents: object[], maxTokens = 800): Promise<string> {
  const models = [
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
  ];

  let lastError = '';

  for (const model of models) {
    try {
      const isReasoningModel = model.includes('2.5') || model.includes('2.0');
      const generationConfig: any = {
        maxOutputTokens: maxTokens,
        temperature: 0.75,
        topP: 0.95,
      };

      if (isReasoningModel) {
        generationConfig.thinkingConfig = { thinkingBudget: 0 };
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig,
          }),
        }
      );

      if (!res.ok) {
        const errBody = await res.text();
        lastError = `${model}: HTTP ${res.status} — ${errBody.slice(0, 200)}`;
        continue; // try next model
      }

      const json = await res.json() as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        error?: { message?: string };
      };

      if (json.error) {
        lastError = `${model}: ${json.error.message || 'API Error'}`;
        continue;
      }

      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        lastError = `${model}: Empty response`;
        continue;
      }

      return text.trim(); // SUCCESS
    } catch (e) {
      lastError = `${model}: ${String(e)}`;
    }
  }

  throw new Error(`All Gemini models failed. Last error: ${lastError}`);
}

export default function TravelAiPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [safetyScore, setSafetyScore] = useState<number | null>(null);
  const [routeInfo, setRouteInfo] = useState<string>('');
  const [emergencyInfo, setEmergencyInfo] = useState<string>('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [overviewSent, setOverviewSent] = useState(false);
  const [error, setError] = useState('');
  // Helper: Simple safety score heuristic based on available context
  const computeSafetyScore = (context: string): number => {
    let score = 100;
    // Penalize if fewer than 3 police stations or hospitals are listed
    const policeCount = (context.match(/Real nearby police stations:/g) || []).length;
    const hospitalCount = (context.match(/Real nearby hospitals:/g) || []).length;
    if (policeCount < 3) score -= (3 - policeCount) * 10;
    if (hospitalCount < 3) score -= (3 - hospitalCount) * 10;
    // Night time penalty (after 20:00 or before 06:00)
    const hour = new Date().getHours();
    if (hour >= 20 || hour < 6) score -= 15;
    // Ensure bounds
    return Math.max(0, Math.min(100, score));
  };
  const GEMINI_KEY = localStorage.getItem('travelshield_gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '';
  const hasKey = !!GEMINI_KEY;

  // Location context from OSM
  const [locationContext, setLocationContext] = useState<string>('');
  const [locationLabel, setLocationLabel] = useState<string>('');
  const [locationLoading, setLocationLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setLocationLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        try {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`,
            { headers: { 'User-Agent': 'TravelShield-AI-App' } }
          );
          let areaStr = '';
          if (geoRes.ok) {
            const geoData = await geoRes.json() as any;
            areaStr = geoData.address?.suburb || geoData.address?.neighbourhood || geoData.address?.city || geoData.display_name?.split(',')[0] || '';
          }

          const [policeRes, hospitalRes] = await Promise.allSettled([
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=police+station&lat=${lat}&lon=${lng}&limit=3`, { headers: { 'User-Agent': 'TravelShield-AI-App' } }),
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=hospital&lat=${lat}&lon=${lng}&limit=3`, { headers: { 'User-Agent': 'TravelShield-AI-App' } }),
          ]);

          let policeList: string[] = [];
          if (policeRes.status === 'fulfilled' && policeRes.value.ok) {
            const data = await policeRes.value.json() as any[];
            policeList = data.slice(0, 3).map((p, i) =>
              `${i + 1}. ${p.name || p.display_name?.split(',')[0] || 'Police Station'} (lat: ${p.lat}, lng: ${p.lon})`
            );
          }

          let hospitalList: string[] = [];
          if (hospitalRes.status === 'fulfilled' && hospitalRes.value.ok) {
            const data = await hospitalRes.value.json() as any[];
            hospitalList = data.slice(0, 3).map((h, i) =>
              `${i + 1}. ${h.name || h.display_name?.split(',')[0] || 'Hospital'} (lat: ${h.lat}, lng: ${h.lon})`
            );
          }

          let ctx = `User GPS: lat ${lat.toFixed(5)}, lng ${lng.toFixed(5)}.\n`;
          if (areaStr) ctx += `Neighborhood: ${areaStr}.\n`;
          if (policeList.length) ctx += `Real nearby police stations:\n${policeList.join('\n')}\n`;
          if (hospitalList.length) ctx += `Real nearby hospitals:\n${hospitalList.join('\n')}\n`;

          setLocationContext(ctx);
          setLocationLabel(areaStr || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        } catch {
          // location context not critical
        } finally {
          setLocationLoading(false);
        }
      },
      () => {
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // Placeholder route fetch – in a real app replace with a proper routing API
  const fetchRoutePlaceholder = async (destination: string): Promise<string> => {
    // Simple mocked route: current location → destination
    const route = `Route from your current location to ${destination}:\n1. Head north for 2 km.\n2. Turn right onto Main St.\n3. Arrive at ${destination}.`;
    setRouteInfo(route);
    return route;
  };

  // ── Automatic safety overview after location is obtained ────────────────────────
  useEffect(() => {
    if (locationContext && !overviewSent) {
      // Auto‑send a safety overview request based on the fetched location data
      const autoPrompt = 'Provide a concise safety overview for my current location using the supplied context. Include safety score, nearby police stations, hospitals, and any immediate risk factors.';
      (async () => {
        setLoading(true);
        try {
          const systemPrompt = `You are SafeRoute AI — an expert travel safety assistant.
Personality: helpful, concise, factual. Give REAL actionable advice. Never use generic templates.
Specialties: travel safety, crime risk, police contacts, safe routes, crowd density, restaurant safety, tourist spots, weather, local emergency numbers.
Rules:
- Provide a **Recommended Route** (if a destination is mentioned, generate a simple placeholder route).
- Include a **Safety Score** (0‑100) calculated from nearby police, hospitals, time of day, and crowd density.
- Explain **Why** the route is recommended and list **Risk Factors**.
- List **Nearby Police Stations** and **Hospitals** (max 3 each).
- Suggest an **Alternative Safer Route** if applicable.
- Provide **Emergency Recommendations** (nearest helplines, immediate actions).
- Keep the response under 250 words. Use bullet points where appropriate.
- If no destination is provided, skip route sections but still give a concise safety overview.
`;
          const contents = [
            { role: 'user', parts: [{ text: systemPrompt }] },
            { role: 'model', parts: [{ text: 'Ready.' }] },
            ...messages.slice(-8).map((m) => ({
              role: m.role === 'user' ? 'user' : 'model',
              parts: [{ text: m.content }],
            })),
            { role: 'user', parts: [{ text: `${locationContext}\n\n[QUESTION]\n${autoPrompt}` }] },
          ];
          const aiContent = await callGemini(GEMINI_KEY, contents, 800);
          setMessages((prev) => [...prev, { role: 'assistant', content: aiContent, timestamp: new Date() }]);
          // Compute safety score from context and store
          const score = computeSafetyScore(locationContext);
          setSafetyScore(score);
          setOverviewSent(true);
          // Optionally prepend a score message
          const scoreMsg = `Safety Score: ${score}/100`;
          setMessages((prev) => [...prev, { role: 'assistant', content: scoreMsg, timestamp: new Date() }]);
        } catch (err) {
          console.error('Auto overview error:', err);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [locationContext, overviewSent, messages, GEMINI_KEY]);


  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    if (!hasKey) {
      setError('No Gemini API key found. Go to Settings and paste your key.');
      return;
    }

    setInput('');
    setError('');
    setLoading(true);
    const userMsg: Message = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);

    try {
  // Detect emergency intent in user query
  const emergencyKeywords = /\b(emergency|help|sos|danger|unsafe|critical)\b/i;
  const isEmergency = emergencyKeywords.test(text);

  if (isEmergency) {
    // Build a concise emergency response using available context
    const emergencyPrompt = `You are SafeRoute AI. Respond ONLY with the following fields (no extra text):\n\n**Nearest Police Stations** (list up to 3)\n**Nearest Hospitals** (list up to 3)\n**Emergency Helplines** (include generic numbers if country unknown)\n**Immediate Action Steps** (what the user should do now). Use the supplied location context.\n\nLocation Context:\n${locationContext}`;
    try {
      const contents = [
        { role: 'user', parts: [{ text: emergencyPrompt }] },
      ];
      const aiContent = await callGemini(GEMINI_KEY, contents, 800);
      setEmergencyInfo(aiContent);
      setMessages((prev) => [...prev, { role: 'assistant', content: aiContent, timestamp: new Date() }]);
    } catch (err) {
      console.error('Emergency response error:', err);
      setError('Failed to generate emergency assistance.');
    }
    setLoading(false);
    return; // skip normal processing
  }

  // Detect simple route request ("to <destination>")
  const routeMatch = text.match(/\bto\s+(.+)/i);
  if (routeMatch) {
    const destination = routeMatch[1].trim();
    const route = await fetchRoutePlaceholder(destination);
    // Append route info as a message using the returned route string
    const routeMsg = `Suggested Route:\n${route}`;
    setMessages((prev) => [...prev, { role: 'assistant', content: routeMsg, timestamp: new Date() }]);
    // Continue to also get safety overview for the destination if needed
  }

  // Normal processing continues belowPersonality: helpful, concise, friendly, factual. Give REAL actionable advice. Never use generic templates.
Specialties: travel safety, crime risk, police contacts, safe routes, crowd density, restaurant safety, tourist spots, weather, local emergency numbers.
Rules:
- Give specific, useful answers. Use the provided real location data when available.
- Warn about crowded areas ("Crowds can be high — keep belongings close").
- Warn about water/cliffs/rivers with safety tips.
- Keep responses under 200 words. Use bullet points for 3+ items. Use relevant emojis.
- For police/emergency: ALWAYS give real local emergency numbers (India: 100 police, 108 ambulance, 101 fire; use what you know for the country).
- For safety questions: give a risk level (🟢 Low / 🟡 Moderate / 🔴 High) and specific tips.`;

      const userTextWithContext = locationContext
        ? `[MY REAL LOCATION DATA — use this to answer location questions]\n${locationContext}\n\n[MY QUESTION]\n${text}`
        : text;

      const contents = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'Ready. I am TravelShield AI — providing real, location-aware travel safety guidance.' }] },
        ...messages.slice(-8).map((m: Message) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }],
        })),
        { role: 'user', parts: [{ text: userTextWithContext }] },
      ];

      const aiContent = await callGemini(GEMINI_KEY, contents, 800);
      setMessages(prev => [...prev, { role: 'assistant', content: aiContent, timestamp: new Date() }]);
    } catch (err) {
      const errMsg = String(err);
      if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('401')) {
        setError('❌ Gemini API key is invalid. Go to Settings → paste a valid key from aistudio.google.com');
      } else if (errMsg.includes('429')) {
        setError('⚠️ Rate limit hit. Wait a few seconds and try again.');
      } else {
        setError(`AI error: ${errMsg.slice(0, 120)}`);
      }
      setMessages(prev => prev.filter(m => m !== userMsg));
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const showWelcome = messages.length === 0;

  return (
    <>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(0,229,255,0.3), 0 0 40px rgba(0,229,255,0.1); }
          50% { box-shadow: 0 0 30px rgba(0,229,255,0.6), 0 0 60px rgba(0,229,255,0.2); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes borderGlow {
          0%, 100% { border-color: rgba(0,229,255,0.35); box-shadow: 0 0 0 3px rgba(0,229,255,0.07), 0 8px 32px rgba(0,0,0,0.5); }
          50% { border-color: rgba(0,229,255,0.65); box-shadow: 0 0 0 4px rgba(0,229,255,0.13), 0 8px 32px rgba(0,0,0,0.5); }
        }
        .ai-glow { animation: pulseGlow 2.5s ease-in-out infinite; }
        .float-anim { animation: float 3s ease-in-out infinite; }
        .shimmer-text {
          background: linear-gradient(90deg, #00e5ff, #a78bfa, #00e5ff);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s linear infinite;
        }
        .chat-scroll::-webkit-scrollbar { width: 4px; }
        .chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .chat-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        .suggestion-card:hover { transform: translateY(-2px); }
        .suggestion-card { transition: all 0.2s ease; }
        .send-btn { transition: all 0.15s ease; }
        .send-btn:hover:not(:disabled) { transform: scale(1.08); box-shadow: 0 6px 24px rgba(0,229,255,0.55) !important; }
        .send-btn:active:not(:disabled) { transform: scale(0.93); }
        .mic-btn { transition: all 0.15s ease; }
        .mic-btn:hover { color: #00e5ff !important; transform: scale(1.1); }
        .input-focused { animation: borderGlow 2s ease-in-out infinite; }
        .map-chip:hover { background: rgba(0,229,255,0.18) !important; border-color: rgba(0,229,255,0.5) !important; }
        .map-chip { transition: all 0.2s ease; }
        .quick-chip:hover { background: rgba(255,255,255,0.1) !important; }
        .quick-chip { transition: all 0.15s ease; }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #060d1f 0%, #0a1628 40%, #0d1f3c 100%)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background orbs */}
        <div style={{
          position: 'fixed', top: '-80px', right: '-80px', width: '300px', height: '300px',
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,255,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'fixed', bottom: '100px', left: '-60px', width: '250px', height: '250px',
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Header */}
        <div style={{
          padding: '16px 20px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(6,13,31,0.9)',
          backdropFilter: 'blur(20px)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div className="ai-glow" style={{
            width: 42, height: 42, borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(0,229,255,0.15), rgba(167,139,250,0.15))',
            border: '1px solid rgba(0,229,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            <Bot size={20} color="#00e5ff" />
            <div style={{
              position: 'absolute', bottom: -2, right: -2, width: 10, height: 10,
              background: hasKey ? '#34d399' : '#f59e0b', borderRadius: '50%', border: '2px solid #060d1f',
            }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="shimmer-text" style={{ fontWeight: 700, fontSize: 15 }}>TravelShield AI</span>
              <Sparkles size={12} color="#a78bfa" />
            </div>
            {locationLoading ? (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
                Locating you...
              </p>
            ) : locationLabel ? (
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
                <MapPin size={8} /> {locationLabel}
              </p>
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 1 }}>
                Powered by Gemini AI
              </p>
            )}
            {/* Safety Score display */}
            {safetyScore !== null && (
              <p style={{ color: '#34d399', fontSize: 11, marginTop: 2 }}>
                Safety Score: {safetyScore}/100
              </p>
            )}
          </div>
          <div style={{
            display: 'flex', gap: 6, alignItems: 'center',
            background: hasKey ? 'rgba(52,211,153,0.1)' : 'rgba(245,158,11,0.1)',
            borderRadius: 20, padding: '4px 10px',
            border: `1px solid ${hasKey ? 'rgba(52,211,153,0.2)' : 'rgba(245,158,11,0.25)'}`,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: hasKey ? '#34d399' : '#f59e0b' }} />
            <span style={{ color: hasKey ? '#34d399' : '#f59e0b', fontSize: 10, fontWeight: 600 }}>
              {hasKey ? 'GEMINI' : 'NO KEY'}
            </span>
          </div>
        </div>

        {/* Messages area */}
        <div className="chat-scroll" style={{
          flex: 1, overflowY: 'auto', padding: '20px 16px',
          paddingBottom: '170px', display: 'flex', flexDirection: 'column', gap: 12,
        }}>

          {/* No Key Banner */}
          {!hasKey && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.15))',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 16,
              padding: '14px',
              animation: 'fadeSlideUp 0.3s ease forwards',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <AlertCircle size={16} color="#f59e0b" />
                <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 13 }}>Gemini API Key Required</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, lineHeight: 1.6, marginBottom: 10 }}>
                Go to <b style={{ color: '#f59e0b' }}>Settings</b> and paste your free Gemini API key from <b>aistudio.google.com</b> to enable real AI responses.
              </p>
              <button
                onClick={() => navigate('/settings')}
                style={{
                  width: '100%', padding: '10px', background: 'rgba(245,158,11,0.15)',
                  border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12,
                  color: '#fbbf24', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                }}
              >
                ⚙️ Go to Settings → Paste API Key
              </button>
            </div>
          )}

          {/* Welcome screen */}
          {showWelcome && hasKey && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 20 }}>
              <div className="float-anim" style={{
                width: 100, height: 100, borderRadius: 32,
                background: 'linear-gradient(135deg, rgba(0,229,255,0.15), rgba(167,139,250,0.2))',
                border: '1px solid rgba(0,229,255,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 20,
                boxShadow: '0 20px 60px rgba(0,229,255,0.15)',
              }}>
                <Bot size={48} color="#00e5ff" />
              </div>

              <h2 style={{ fontWeight: 800, fontSize: 24, textAlign: 'center', lineHeight: 1.2, marginBottom: 8 }}>
                <span className="shimmer-text">Your AI Travel</span><br />
                <span style={{ color: 'white' }}>Safety Assistant</span>
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, textAlign: 'center', maxWidth: 260, marginBottom: 24, lineHeight: 1.6 }}>
                Ask me anything about safety, places, routes, and travel tips anywhere in the world.
              </p>

              {locationLabel && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                  background: 'rgba(52,211,153,0.08)', borderRadius: 20, border: '1px solid rgba(52,211,153,0.2)',
                  marginBottom: 20,
                }}>
                  <MapPin size={10} color="#34d399" />
                  <span style={{ color: '#34d399', fontSize: 11, fontWeight: 600 }}>Location loaded: {locationLabel}</span>
                </div>
              )}

              {/* Feature pills */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
                {features.map(({ icon: Icon, label }) => (
                  <div key={label} style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
                    background: 'rgba(255,255,255,0.05)', borderRadius: 20,
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}>
                    <Icon size={11} color="#00e5ff" />
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 500 }}>{label}</span>
                  </div>
                ))}
              </div>

              {/* Suggestion cards */}
              <div style={{ width: '100%', marginBottom: 8 }}>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10, paddingLeft: 2 }}>
                  Try asking...
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {suggestions.map(({ icon: Icon, text, color }) => (
                    <button
                      key={text}
                      className="suggestion-card"
                      onClick={() => send(text)}
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: `1px solid rgba(255,255,255,0.08)`,
                        borderRadius: 14, padding: '12px',
                        textAlign: 'left', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', gap: 8,
                      }}
                    >
                      <div style={{
                        width: 30, height: 30, borderRadius: 10,
                        background: `${color}18`, border: `1px solid ${color}33`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon size={14} color={color} />
                      </div>
                      <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, lineHeight: 1.4, fontWeight: 500 }}>
                        {text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Chat messages */}
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} index={i} />
          ))}

          {/* Typing indicator */}
          {loading && <TypingIndicator />}

          {/* Error banner */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8, padding: '12px 14px',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 12, animation: 'fadeSlideUp 0.3s ease forwards',
            }}>
              <AlertCircle size={14} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ flex: 1 }}>
                <span style={{ color: '#f87171', fontSize: 12, lineHeight: 1.5 }}>{error}</span>
                {error.includes('key') && (
                  <button
                    onClick={() => navigate('/settings')}
                    style={{
                      display: 'block', marginTop: 6, padding: '4px 10px',
                      background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: 8, color: '#f87171', fontSize: 10, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    Go to Settings
                  </button>
                )}
              </div>
              <button onClick={() => setError('')} style={{ color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                <RefreshCw size={12} />
              </button>
            </div>
          )}

          {/* Quick follow-ups after first reply */}
          {messages.length >= 2 && messages.length < 6 && !loading && (
            <div style={{ paddingTop: 4 }}>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, marginBottom: 8, paddingLeft: 40 }}>Quick follow-ups:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingLeft: 40 }}>
                {['Tell me more', 'Is it safe at night?', 'Nearby hospitals?', 'Best route?'].map(q => (
                  <button key={q} onClick={() => send(q)} className="quick-chip" style={{
                    background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.2)',
                    borderRadius: 20, padding: '5px 12px', color: '#00e5ff',
                    fontSize: 11, cursor: 'pointer', fontWeight: 500,
                  }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input Bar */}
        <div style={{
          position: 'fixed', bottom: 64, left: 0, right: 0,
          padding: '10px 14px 10px',
          background: 'linear-gradient(to top, rgba(6,13,31,0.98) 60%, rgba(6,13,31,0.0))',
          backdropFilter: 'blur(28px)',
        }}>
          {/* Quick chips row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, overflowX: 'auto', paddingBottom: 2 }}>
            <button
              className="map-chip"
              onClick={() => navigate('/map')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.25)',
                borderRadius: 20, cursor: 'pointer', flexShrink: 0,
              }}
            >
              <Map size={12} color="#00e5ff" />
              <span style={{ color: '#00e5ff', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>Open Live Map</span>
            </button>
            {['Safe route?', 'Nearby police?', 'Risk level?', 'Safe at night?', 'Railway station?'].map(q => (
              <button
                key={q}
                onClick={() => send(q)}
                className="quick-chip"
                style={{
                  padding: '6px 14px', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20,
                  color: 'rgba(255,255,255,0.6)', fontSize: 11, cursor: 'pointer',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >{q}</button>
            ))}
          </div>

          {/* Main input row */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div
              style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: 4,
                background: 'rgba(13,22,48,0.9)',
                border: '1.5px solid rgba(255,255,255,0.12)',
                borderRadius: 20, padding: '0 6px 0 16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
                placeholder={hasKey ? 'Ask about safety, places, routes...' : 'Set Gemini API key in Settings first...'}
                disabled={loading || !hasKey}
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  color: 'white', fontSize: 14, padding: '14px 0',
                  caretColor: '#00e5ff',
                }}
              />
              <button
                className="mic-btn"
                style={{
                  width: 36, height: 36, borderRadius: 12, background: 'none',
                  border: 'none', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  color: input ? '#00e5ff' : 'rgba(255,255,255,0.25)',
                  flexShrink: 0,
                }}
                onClick={() => { }}
              >
                <Mic size={16} />
              </button>
            </div>

            <button
              className="send-btn"
              onClick={() => send(input)}
              disabled={loading || !input.trim() || !hasKey}
              style={{
                width: 50, height: 50, borderRadius: 16, border: 'none',
                cursor: (loading || !input.trim() || !hasKey) ? 'not-allowed' : 'pointer',
                background: (loading || !input.trim() || !hasKey)
                  ? 'rgba(255,255,255,0.07)'
                  : 'linear-gradient(135deg, #00e5ff 0%, #0066ff 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: (loading || !input.trim() || !hasKey) ? 'none' : '0 4px 20px rgba(0,229,255,0.4)',
                flexShrink: 0,
                transition: 'all 0.2s',
              }}
            >
              {loading ? (
                <div style={{
                  width: 18, height: 18, border: '2px solid rgba(255,255,255,0.2)',
                  borderTopColor: 'white', borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
              ) : (
                <Send size={18} color={(!input.trim() || !hasKey) ? 'rgba(255,255,255,0.25)' : 'white'}
                  style={{ transform: 'translateX(1px)' }} />
              )}
            </button>
          </div>

          <p style={{
            color: 'rgba(255,255,255,0.18)', fontSize: 10, textAlign: 'center',
            marginTop: 8, letterSpacing: '0.01em',
          }}>
            Powered by Google Gemini · Responses are for guidance only
          </p>
        </div>

        <BottomNav />
      </div>
    </>
  );
}
