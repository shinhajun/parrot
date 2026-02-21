import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

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
    const { audioBase64, name, oldVoiceId } = await req.json();

    if (!audioBase64 || !name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: audioBase64, name" }),
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

    const audioBytes = base64Decode(audioBase64);
    const audioBlob = new Blob([audioBytes], { type: "audio/wav" });

    const formData = new FormData();
    formData.append("name", name);
    formData.append("files", audioBlob, "voice_sample.wav");
    formData.append("remove_background_noise", "true");

    const cloneResponse = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
      },
      body: formData,
    });

    if (!cloneResponse.ok) {
      const errorText = await cloneResponse.text();
      return new Response(
        JSON.stringify({ error: "ElevenLabs API error", details: errorText }),
        { status: cloneResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const cloneData = await cloneResponse.json();
    const newVoiceId: string = cloneData.voice_id;

    // Delete the old cloned voice from ElevenLabs to prevent accumulation
    if (oldVoiceId && typeof oldVoiceId === "string" && oldVoiceId !== newVoiceId) {
      try {
        await fetch(`https://api.elevenlabs.io/v1/voices/${oldVoiceId}`, {
          method: "DELETE",
          headers: { "xi-api-key": apiKey },
        });
      } catch {
        // Non-fatal — old voice deletion failure shouldn't block the response
      }
    }

    return new Response(
      JSON.stringify({ voiceId: newVoiceId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
