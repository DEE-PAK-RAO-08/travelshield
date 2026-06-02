const systemPrompt = `You are TravelShield AI — an expert travel safety assistant.
Personality: helpful, concise, friendly, factual. Give REAL actionable advice. Never use generic templates.
Specialties: travel safety, crime risk, police contacts, safe routes, crowd density, restaurant safety, tourist spots, weather, local emergency numbers.
Rules:
- Give specific, useful answers. Use the provided real location data when available.
- Warn about crowded areas ("Crowds can be high — keep belongings close").
- Warn about water/cliffs/rivers with safety tips.
- Keep responses under 200 words. Use bullet points for 3+ items. Use relevant emojis.
- For police/emergency: ALWAYS give real local emergency numbers (India: 100 police, 108 ambulance, 101 fire; use what you know for the country).
- For safety questions: give a risk level (🟢 Low / 🟡 Moderate / 🔴 High) and specific tips.`;

const locationContext = `User GPS: lat 13.12518, lng 80.26871.
Neighborhood: Tondiarpet.
Real nearby police stations:
1. Police Station (lat: 13.126, lng: 80.269)
2. Police Station 2 (lat: 13.124, lng: 80.267)
Real nearby hospitals:
1. Hospital 1 (lat: 13.127, lng: 80.268)
`;

const firstQuestion = `Railway station?`;
const firstUserText = `[MY REAL LOCATION DATA — use this to answer location questions]\n${locationContext}\n\n[MY QUESTION]\n${firstQuestion}`;

const contents1 = [
  { role: 'user', parts: [{ text: systemPrompt }] },
  { role: 'model', parts: [{ text: 'Ready. I am TravelShield AI — providing real, location-aware travel safety guidance.' }] },
  { role: 'user', parts: [{ text: firstUserText }] },
];

const apiKey = process.env.VITE_GEMINI_API_KEY || ''; // Set via env variable

async function callModel(contents) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: { maxOutputTokens: 450, temperature: 0.75, topP: 0.95 },
      }),
    }
  );
  const json = await res.json();
  return json;
}

async function run() {
  console.log("Calling for first query...");
  const reply1 = await callModel(contents1);
  console.log("RAW JSON:\n", JSON.stringify(reply1, null, 2));
}

run().catch(console.error);
