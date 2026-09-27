# Workplace English Assessment Lab

A full-length, generic workplace-English practice web app modeled on the structure shown in the provided assessment screen:

- 10 Grammar & Sentence Correction
- 2 Business Communication Writing
- 6 Situational Awareness & Response
- 4 Reading Comprehension
- 4 Listening Comprehension
- 2 Spoken Communication Simulation
- 60-minute timer
- Section navigation and answer tracking
- Browser text-to-speech for listening practice
- Browser speech recognition + microphone recording for speaking practice
- Objective scoring
- Local writing/speaking word-count evaluation
- Optional AI question generation and AI evaluation through an OpenAI-compatible chat-completions API

## Run locally

Requirements: Node.js 18+.

```bash
npm run install:all
```

Copy the server environment file:

```bash
copy server\\.env.example server\\.env
```

Then edit `server/.env` and add your AI provider details if desired:

```env
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=your-key
AI_MODEL=your-model
```

Start both apps:

```bash
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:8787

## AI behavior

The app works without an AI key. In that mode it uses the bundled generic question bank and local evaluation. With an AI key, **Generate fresh AI mock** asks the configured model for a new 28-question assessment and the submit flow asks the model to evaluate the writing and speaking responses.

The API key stays server-side and is never placed in the React client.

## Notes

- Listening uses the browser's built-in speech synthesis so you can practice audio comprehension without a separate TTS service.
- Speaking uses the browser's SpeechRecognition API where available. It also starts a microphone MediaRecorder session for a realistic recording workflow.
- Browser support for speech recognition varies, so a typed transcript fallback is provided.
- The bundled questions are generic workplace-English practice questions, not copied from any proprietary assessment.


## Gemini setup

1. Open `server/.env`.
2. Put your Google AI Studio key in `GEMINI_API_KEY`.
3. Keep `GEMINI_MODEL=gemini-3.8-flash` unless you intentionally choose another supported model.
4. Restart the server after changing `.env`.
5. Use **Generate fresh AI mock** on the home screen.

The app now calls Gemini directly, so you do **not** need to configure an OpenAI-compatible base URL.
