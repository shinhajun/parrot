# Parrot 🦜

Real-time video call translation with voice cloning. Speak in your language — your voice comes out the other side in theirs.

## What it does

Parrot is a WebRTC video calling app that translates speech in real time and synthesizes the translation using a clone of your voice. The person on the other end hears you speaking their language, in your voice.

## How it works

```
mic → VAD → translate (Gemini) → TTS (ElevenLabs) → remote peer
```

1. **VAD** detects when you stop speaking and extracts the audio segment
2. **Translate** sends the audio to Gemini 2.5 Flash Lite for transcription + translation in one shot
3. **TTS** synthesizes the translated text using a cloned version of your voice via ElevenLabs Flash v2.5
4. The audio plays on the remote peer's side with subtitles

## Performance

Measured on production Supabase Edge Functions:

| Step | Avg | Min | Max |
|------|-----|-----|-----|
| Gemini transcription + translation | ~1.6s | 1.1s | 3.1s |
| ElevenLabs TTS | ~300ms | 210ms | 640ms |
| **Total end-to-end** | **~1.9s** | | |

The main bottleneck is Gemini audio processing. TTS is fast thanks to ElevenLabs Flash v2.5.

## Tech stack

- **Frontend** — Next.js 16, Tailwind CSS, deployed on Cloudflare Pages
- **WebRTC** — peer-to-peer via Supabase Realtime signaling
- **VAD** — energy-based voice activity detection via AudioWorklet (16kHz)
- **Translation** — Gemini 2.5 Flash Lite (audio → transcription + translation)
- **TTS** — ElevenLabs Flash v2.5 with Instant Voice Cloning
- **Backend** — Supabase Edge Functions (Deno)

## Supported languages

Korean, English, Japanese, Chinese, Spanish, French, German, Portuguese, Italian, Russian, Hindi, Arabic, Vietnamese, Indonesian, Thai

## Setup

### Prerequisites

- Node.js 18+
- Supabase project
- Gemini API key
- ElevenLabs API key
- Cloudflare account (for deployment)

### Environment variables

Set these in your Supabase Edge Function secrets:

```
GEMINI_API_KEY=...
ELEVENLABS_API_KEY=...
```

Set in `src/lib/constants.ts`:

```ts
export const SUPABASE_FUNCTIONS_URL = "https://<your-project>.supabase.co/functions/v1";
export const SUPABASE_URL = "https://<your-project>.supabase.co";
export const SUPABASE_ANON_KEY = "...";
```

### Run locally

```bash
npm install
npm run dev
```

### Deploy edge functions

```bash
npx supabase functions deploy translate --no-verify-jwt
npx supabase functions deploy tts --no-verify-jwt
npx supabase functions deploy clone-voice --no-verify-jwt
```

### Deploy frontend

```bash
npm run deploy
```
