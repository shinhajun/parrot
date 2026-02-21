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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

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

    const geminiResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      return new Response(
        JSON.stringify({ error: "Gemini API error", details: errorText }),
        { status: geminiResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const geminiData = await geminiResponse.json();
    const textContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      return new Response(
        JSON.stringify({ error: "No response from Gemini" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const parsed = JSON.parse(textContent);

    return new Response(
      JSON.stringify({
        originalText: parsed.original || "",
        translatedText: parsed.translated || "",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
