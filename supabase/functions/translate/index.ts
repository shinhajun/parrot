import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const t0 = Date.now();
  try {
    const { audioBase64, sourceLang, targetLang } = await req.json();

    if (!audioBase64 || !sourceLang || !targetLang) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: audioBase64, sourceLang, targetLang" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

    const prompt = `You are a speech transcription and translation assistant.

Listen to this audio carefully. The speaker is speaking in ${sourceLang}.

1. Transcribe ONLY the actual spoken words in ${sourceLang}.
2. Translate the transcription into ${targetLang}.

Rules:
- Do NOT output timestamps, timecodes, or any subtitle formatting (e.g. "00:00:01", "-->").
- Do NOT hallucinate or guess content that isn't clearly spoken.
- Do NOT repeat the question or add any commentary.
- If the audio contains only silence, noise, or unclear sounds with no intelligible speech, return empty strings.

Return ONLY a JSON object with these exact fields:
{"original": "<transcription in ${sourceLang}>", "translated": "<translation in ${targetLang}>"}

If there is no clear speech, return exactly:
{"original": "", "translated": ""}`;

    const t1 = Date.now();
    const geminiResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "audio/wav",
                  data: audioBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0,
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      }),
    });

    if (!geminiResponse.ok) {
      await geminiResponse.text();
      return new Response(
        JSON.stringify({ error: "Translation service error" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const t2 = Date.now();
    console.log(`[translate] gemini=${t2 - t1}ms total=${t2 - t0}ms`);
    const geminiData = await geminiResponse.json();
    const textContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      return new Response(
        JSON.stringify({ error: "No response from Gemini" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Gemini sometimes wraps JSON in markdown code blocks — strip them
    let jsonText = textContent.trim();
    const codeBlock = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlock) jsonText = codeBlock[1].trim();

    const parsed = JSON.parse(jsonText);

    return new Response(
      JSON.stringify({
        originalText: parsed.original || "",
        translatedText: parsed.translated || "",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("translate error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
