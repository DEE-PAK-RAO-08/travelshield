import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Send, Utensils, Landmark, ShieldQuestion,
  Sparkles, Shield, Zap, Globe, RefreshCw, Mic, Map, Waves, Users } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';
import { dashboardApi } from '@/api/client';

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

export default function TravelAiPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState('');
  const [hasGeminiKey, setHasGeminiKey] = useState(
    !!(localStorage.getItem('travelshield_gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY)
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    dashboardApi.chatMessages()
      .then(({ data }) => {
        const msgs = Array.isArray(data?.data) ? data.data : [];
        setMessages(msgs.map((m: Message) => ({ ...m, timestamp: new Date() })));
      })
      .catch(() => setMessages([]))
      .finally(() => setLoadingHistory(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ── Direct Gemini API \u2014 real AI responses ─────────────────────────────────
  const callGeminiDirect = async (userText: string, history: Message[]): Promise<string> => {
    const GEMINI_KEY = localStorage.getItem('travelshield_gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '';
    if (!GEMINI_KEY) throw new Error('No Gemini key in VITE_GEMINI_API_KEY');

    const systemPrompt = `You are TravelShield AI — an expert travel safety assistant embedded in the TravelShield safety app.
Personality: helpful, concise, friendly, highly factual. Give real actionable advice, never generic templates.
Specialties: travel safety, crime risk, best local areas, police contacts, safe routes, crowd density, restaurant safety, tourist spots, weather & safety, local emergency numbers.
Rules:
- Always give specific, useful information. If you lack exact local data, give best regional advice.
- If there are crowds or high density, warn the user ("Crowds are high, keep belongings close and stay alert").
- If there are nearby waterbodies, rivers, or cliffs, give appropriate safety tips ("Be cautious near water/riverbanks").
- Keep responses under 180 words. Be direct — never start with "I understand you're asking about".
- Use bullet points when listing 3+ items. Use relevant emojis naturally.
- For police/emergency: always give real local emergency numbers if you know the country.
- For safety questions: give a risk level (Low/Moderate/High) and specific tips.
- For routes: give actual advice about safe areas, times to avoid, transport options.`;

    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'Ready. I am TravelShield AI — giving real, location-aware travel safety guidance.' }] },
      ...history.slice(-10).map((m: Message) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: [{ text: userText }] },
    ];

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: { maxOutputTokens: 400, temperature: 0.75, topP: 0.95 },
        }),
      }
    );

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Gemini ${res.status}: ${errBody.slice(0, 200)}`);
    }
    const json = await res.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty Gemini response');
    return text.trim();
  };

  // ── Send handler ──────────────────────────────────────────────────────────
  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    setInput('');
    setError('');
    setLoading(true);
    const userMsg: Message = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);

    try {
      // 1. Try direct Gemini first (real AI answers)
      let aiContent = '';
      try {
        aiContent = await callGeminiDirect(text, messages);
      } catch (geminiErr) {
        console.warn('Direct Gemini failed, falling back to backend:', geminiErr);
        // 2. Backend fallback (also tries Gemini via GEMINI_API_KEY env var, then smart templates)
        const { data } = await dashboardApi.sendMessage(text);
        aiContent = data?.data?.assistantMessage?.content
          || data?.data?.content
          || data?.message
          || 'I\'m your AI travel safety assistant. Please try again.';
      }
      setMessages(prev => [...prev, { role: 'assistant', content: aiContent, timestamp: new Date() }]);
    } catch {
      setError('Failed to get a response. Check your connection and try again.');
      setMessages(prev => prev.filter(m => m !== userMsg));
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const showWelcome = !loadingHistory && messages.length === 0;

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
        .map-chip:hover { background: rgba(0,229,255,0.18) !important; border-color: rgba(0,229,255,0.5) !important; transform: translateY(-1px); }
        .map-chip { transition: all 0.2s ease; }
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
          background: 'rgba(6,13,31,0.8)',
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
              background: '#34d399', borderRadius: '50%', border: '2px solid #060d1f',
            }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="shimmer-text" style={{ fontWeight: 700, fontSize: 15 }}>TravelShield AI</span>
              <Sparkles size={12} color="#a78bfa" />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 1 }}>
              Powered by location intelligence
            </p>
          </div>
          <div style={{
            display: 'flex', gap: 6, alignItems: 'center',
            background: 'rgba(52,211,153,0.1)', borderRadius: 20, padding: '4px 10px',
            border: '1px solid rgba(52,211,153,0.2)',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', animation: 'pulseGlow 2s infinite' }} />
            <span style={{ color: '#34d399', fontSize: 10, fontWeight: 600 }}>LIVE</span>
          </div>
        </div>

        {/* Messages area */}
        <div className="chat-scroll" style={{
          flex: 1, overflowY: 'auto', padding: '20px 16px',
          paddingBottom: '160px', display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          {/* Gemini Key Missing Warning Banner */}
          {!hasGeminiKey && (
            <div className="glass-card p-4 flex flex-col gap-2" style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(245,158,11,0.12))',
              border: '1px solid rgba(245,158,11,0.25)',
              borderRadius: 16,
              animation: 'fadeSlideUp 0.3s ease forwards',
            }}>
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-amber-400" />
                <span className="text-amber-400 font-bold text-xs">Real AI API Key Missing</span>
                <button onClick={() => setHasGeminiKey(true)} className="ml-auto text-white/30 hover:text-white/60 text-xs">✕</button>
              </div>
              <p className="text-white/70 text-xs leading-relaxed">
                TravelShield is using fallback canned templates. Set your free Google Gemini API Key in Settings to enable real, live AI safety suggestions.
              </p>
              <button
                onClick={() => navigate('/settings')}
                className="w-full py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl text-amber-300 font-bold text-[10px] transition-colors cursor-pointer"
              >
                Go to Settings
              </button>
            </div>
          )}

          {/* Welcome screen */}
          {showWelcome && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 20, gap: 0 }}>
              {/* Hero icon */}
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
                        borderRadius: 14,
                        padding: '12px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <div style={{
                        width: 30, height: 30, borderRadius: 10,
                        background: `${color}18`,
                        border: `1px solid ${color}33`,
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

          {/* Error */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 12, animation: 'fadeSlideUp 0.3s ease forwards',
            }}>
              <span style={{ color: '#f87171', fontSize: 12 }}>{error}</span>
              <button onClick={() => setError('')} style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <RefreshCw size={12} />
              </button>
            </div>
          )}

          {/* After first AI reply — show quick follow-ups */}
          {messages.length >= 2 && messages.length < 5 && !loading && (
            <div style={{ paddingTop: 4 }}>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, marginBottom: 8, paddingLeft: 40 }}>Quick follow-ups:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingLeft: 40 }}>
                {['Tell me more', 'Is it safe at night?', 'Nearby hospitals?'].map(q => (
                  <button key={q} onClick={() => send(q)} style={{
                    background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.2)',
                    borderRadius: 20, padding: '5px 12px', color: '#00e5ff',
                    fontSize: 11, cursor: 'pointer', fontWeight: 500,
                    transition: 'all 0.2s',
                  }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Premium Input Bar ──────────────────────────────────────── */}
        <div style={{
          position: 'fixed', bottom: 64, left: 0, right: 0,
          padding: '10px 14px 10px',
          background: 'linear-gradient(to top, rgba(6,13,31,0.98) 60%, rgba(6,13,31,0.0))',
          backdropFilter: 'blur(28px)',
        }}>

          {/* Map shortcut chip */}
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
            {['Safe route?', 'Nearby police?', 'Risk level?', 'Safe at night?'].map(q => (
              <button
                key={q}
                onClick={() => send(q)}
                style={{
                  padding: '6px 14px', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20,
                  color: 'rgba(255,255,255,0.6)', fontSize: 11, cursor: 'pointer',
                  whiteSpace: 'nowrap', transition: 'all 0.2s', flexShrink: 0,
                }}
              >{q}</button>
            ))}
          </div>

          {/* Main input row */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {/* Input wrapper with glowing border */}
            <div
              className={input || document.activeElement === inputRef.current ? 'input-focused' : ''}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: 4,
                background: 'rgba(13,22,48,0.9)',
                border: '1.5px solid rgba(255,255,255,0.12)',
                borderRadius: 20, padding: '0 6px 0 16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                transition: 'border-color 0.3s, box-shadow 0.3s',
              }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
                placeholder="Ask about safety, places, routes..."
                disabled={loading}
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  color: 'white', fontSize: 14, padding: '14px 0',
                  caretColor: '#00e5ff',
                }}
              />
              {/* Mic button */}
              <button
                className="mic-btn"
                style={{
                  width: 36, height: 36, borderRadius: 12, background: 'none',
                  border: 'none', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  color: input ? '#00e5ff' : 'rgba(255,255,255,0.25)',
                  flexShrink: 0,
                }}
                onClick={() => { /* voice placeholder */ }}
                title="Voice input"
              >
                <Mic size={16} />
              </button>
            </div>

            {/* Send button */}
            <button
              className="send-btn"
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              style={{
                width: 50, height: 50, borderRadius: 16, border: 'none',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                background: loading || !input.trim()
                  ? 'rgba(255,255,255,0.07)'
                  : 'linear-gradient(135deg, #00e5ff 0%, #0066ff 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: loading || !input.trim() ? 'none' : '0 4px 20px rgba(0,229,255,0.4)',
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
                <Send size={18} color={!input.trim() ? 'rgba(255,255,255,0.25)' : 'white'}
                  style={{ transform: 'translateX(1px)' }} />
              )}
            </button>
          </div>

          {/* Disclaimer */}
          <p style={{
            color: 'rgba(255,255,255,0.18)', fontSize: 10, textAlign: 'center',
            marginTop: 8, letterSpacing: '0.01em',
          }}>
            AI responses are for guidance only. Always verify local safety information.
          </p>
        </div>

        <BottomNav />
      </div>
    </>
  );
}
