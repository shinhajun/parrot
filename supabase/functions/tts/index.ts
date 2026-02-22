import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const t0 = Date.now();
  try {
    const { text, voiceId, languageCode } = await req.json();

    if (!text || !languageCode) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: text, languageCode" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const selectedVoiceId = voiceId || DEFAULT_VOICE_ID;
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}?output_format=mp3_22050_32`;

    const t1 = Date.now();
    const ttsResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_flash_v2_5",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
        language_code: languageCode,
      }),
    });

    if (!ttsResponse.ok) {
      await ttsResponse.text();
      return new Response(
        JSON.stringify({ error: "TTS service error" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const t2 = Date.now();
    console.log(`[tts] elevenlabs=${t2 - t1}ms total=${t2 - t0}ms`);
    const audioBuffer = await ttsResponse.arrayBuffer();
    const audioBase64 = base64Encode(new Uint8Array(audioBuffer));

    return new Response(
      JSON.stringify({ audioBase64 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("tts error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
