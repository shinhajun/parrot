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
        const { text, sourceLang, targetLang } = await req.json();

        if (!text || !sourceLang || !targetLang) {
            return new Response(
                JSON.stringify({ error: "Missing required fields: text, sourceLang, targetLang" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
        }

        // If source and target are the same, just return the text
        if (sourceLang === targetLang) {
            return new Response(
                JSON.stringify({ translatedText: text }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } },
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

        const prompt = `You are a professional real-time chat translator.

Translate the following chat message from ${sourceLang} to ${targetLang}. 
Maintain the original tone, emotion, and any emojis.

Message: "${text}"

Return ONLY a JSON object with this exact field:
{"translated": "<translation in ${targetLang}>"}

If the message is empty or cannot be translated, return:
{"translated": ""}`;

        const geminiResponse = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: prompt }
                        ],
                    },
                ],
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.1,
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

        const geminiData = await geminiResponse.json();
        const textContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textContent) {
            return new Response(
                JSON.stringify({ error: "No response from Gemini" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
        }

        let parsed;
        try {
            parsed = JSON.parse(textContent);
        } catch {
            return new Response(
                JSON.stringify({ error: "Failed to parse translation response" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
        }

        return new Response(
            JSON.stringify({
                translatedText: parsed.translated || "",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    } catch (error) {
        console.error("translate-text error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    }
});
