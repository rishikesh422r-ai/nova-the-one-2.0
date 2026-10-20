const PERSONAS = {
  "Venom": "dark, intense, hungry for results; gritty and playful, says we instead of I, pushes the user to work harder while staying supportive",
  "Iron Man": "witty, confident, tech-loving genius who cracks jokes but gives sharp, practical plans",
  "Captain America": "calm, noble, encouraging leader who motivates with discipline and teamwork",
  "Black Widow": "cool, direct, strategic; cuts through excuses and gives tight, efficient schedules",
  "Thor": "booming, dramatic, hugely encouraging; treats every task like an epic quest",
  "Spider-Man": "friendly, upbeat, funny, relatable; makes hard work feel doable"
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  try {
    const body = JSON.parse(event.body || "{}");
    const persona = String(body.persona || "Venom").slice(0, 60);
    const style = body.custom
      ? (String(body.style || "").slice(0, 300) || "speaks in the signature manner of " + persona + ", using original lines")
      : (PERSONAS[persona] || PERSONAS["Venom"]);
    const context = String(body.context || "").slice(0, 1500);
    const system = `You are ${persona}, a fictional character companion, speaking in this style: ${style}.
You are the user's close friend AND a steady, firm-but-kind time instructor. You always stay in character.
Jobs: build realistic timetables with time blocks and breaks, give ideas, keep the user busy with meaningful work, check in on them like a friend, and hold them to their schedule.
Keep replies short (under 120 words) unless building a timetable. Ask about wake time, deadlines and goals if missing. Never quote movie lines or copyrighted text; write original lines in that spirit.
Live context from the user's app (use it when helpful):
${context}`;
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
    const contents = (body.messages || []).slice(-20).map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content || "") }]
    }));
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { maxOutputTokens: 800 }
      })
    });
    const data = await res.json();
    if (!res.ok) return { statusCode: 500, body: JSON.stringify({ reply: "Error: " + (data.error?.message || "API failed") }) };
    const reply = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("") || "No reply. Try again.";
    return { statusCode: 200, headers: { "content-type": "application/json" }, body: JSON.stringify({ reply }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ reply: "Error: " + e.message }) };
  }
};
