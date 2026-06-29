# Context & Technical Decisions

## Project Overview
We are integrating automated integration tests and Render deployment configuration for an Express-based backend of the MemeAI app.

## Target Endpoints
1. `GET /health` - Health check. Returns status: 'ok', service name, and AI config ('configured' vs 'mock').
2. `POST /api/context` - Post text to generate captions. Maximum character limit: 1200.
3. `POST /api/voice` - Post audio file to generate transcription and captions. Maximum size: 8MB. Allowed formats: MP3, WAV, M4A, OGG, AAC, etc.
4. `POST /api/remixer` - Post image file to generate captions and design suggestions. Maximum size: 8MB. Allowed formats: JPEG, PNG, WEBP, HEIC, HEIF.

## AI API Constraints
- Gemini API is used via direct fetch calls to `generativelanguage.googleapis.com`.
- We read `GEMINI_API_KEY` from the environment.
- If `ALLOW_MOCK_AI` is not `false` and no API key is provided, the backend falls back to local mocks.
- The test suite must test the real API calls when the API key is provided.

## Deployment Target
- Service: Render.com (free tier)
- Server requires binding to host `0.0.0.0` and using the dynamic `PORT` provided by Render.
- Deployment configuration: `render.yaml` and detailed instructions in `DEPLOY.md`.
