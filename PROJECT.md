# Project: MemeAI Backend Integration Testing & Deployment

## Architecture
The application is a Node.js/Express backend that provides AI-powered meme captioning.
- **Endpoints**:
  - `GET /health`: Health status.
  - `POST /api/context`: Caption generation from text.
  - `POST /api/voice`: Audio transcription and captioning.
  - `POST /api/remixer`: Image analysis and captioning.
- **AI Integration**: Custom fetch calls to Gemini API (`gemini-1.5-flash`). Fallback to local mock if no API key is set.
- **Uploads**: Multer config allowing images and audio files up to 8MB.

## Code Layout
- Backend Root: `/home/Aristide/Documents/Monstre TP/MonstreTP/backend`
- Entry Point: `backend/index.js`
- Routes: `backend/routes/`
- Services: `backend/services/`
- Test Directory: `backend/__tests__/`
- Test Config: `backend/jest.config.js`
- Deployment Config: `backend/render.yaml`
- Deployment Guide: `/home/Aristide/Documents/Monstre TP/MonstreTP/DEPLOY.md`

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Test Suite Infrastructure Setup | Install Jest, Supertest, cross-env; set up Jest configuration and package.json test script | None | DONE |
| 2 | Integration Test Suite Implementation | Implement integration tests for health, context, voice, and remixer endpoints, testing validation, size limits, and real Gemini API | M1 | DONE |
| 3 | Render Deployment Preparation | Configure `render.yaml` and write the step-by-step `DEPLOY.md` guide | None | DONE |
| 4 | Final Validation & Forensic Audit | Run tests, execute Challenger verification, and perform Forensic Audit | M2, M3 | DONE |

## Interface Contracts
### `GET /health`
- **Request**: None
- **Response (200 OK)**:
  ```json
  {
    "status": "ok",
    "service": "memeai-backend",
    "ai": "configured" | "mock"
  }
  ```

### `POST /api/context`
- **Request Body**:
  ```json
  {
    "text": "User text prompt here"
  }
  ```
- **Constraints**:
  - Text is required (400 Bad Request if missing/empty).
  - Text length <= 1200 characters (413 Payload Too Large if exceeded).
- **Response (200 OK)**:
  ```json
  {
    "caption": "Meme caption string",
    "tone": "Humour" | string
  }
  ```

### `POST /api/voice`
- **Request Body**: Multipart/form-data with `audio` field containing audio file.
- **Constraints**:
  - Audio file is required (400 Bad Request if missing).
  - File size <= 8MB (413 Payload Too Large if exceeded).
  - File mime-type/extension must be MP3, WAV, M4A, OGG, AAC, etc. (400 Bad Request if invalid).
- **Response (200 OK)**:
  ```json
  {
    "transcription": "Transcribed audio text",
    "caption": "Meme caption based on audio",
    "tone": "Humour" | string
  }
  ```

### `POST /api/remixer`
- **Request Body**: Multipart/form-data with `image` field containing image file.
- **Constraints**:
  - Image file is required (400 Bad Request if missing).
  - File size <= 8MB (413 Payload Too Large if exceeded).
  - File mime-type must be JPEG, PNG, WEBP, HEIC, HEIF (400 Bad Request if invalid).
- **Response (200 OK)**:
  ```json
  {
    "caption": "Meme caption based on image",
    "suggestion": "Layout suggestions",
    "tone": "Humour" | string
  }
  ```
