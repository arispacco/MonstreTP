# Original User Request

## Initial Request — 2026-06-29T06:02:37Z

Create a comprehensive suite of automated integration tests for the Node.js/Express backend of the MemeAI application, verifying the real Google Gemini API calls, and prepare the backend configuration for free hosting (e.g., on Render).

Working directory: /home/Aristide/Documents/Monstre TP/MonstreTP
Integrity mode: development

## Requirements

### R1. Integration Tests with Real Gemini API
Create backend integration tests using a JavaScript framework (e.g., Jest + Supertest or Mocha).
- The tests must execute real HTTP requests to the backend endpoints (`GET /health`, `POST /api/context`, `POST /api/voice`, `POST /api/remixer`).
- The tests must use the real Gemini API by reading the `GEMINI_API_KEY` from the environment.
- Mocking the AI is only allowed as a fallback if the API key is completely absent.

### R2. Error Handling & Payload Validation
Verify the backend's behavior against:
- Successful payload structures (JSON format with caption, tone, etc.).
- Errors like invalid file mime-types (HTTP 400).
- Upload file size limits (HTTP 413 for files exceeding 8MB).

### R3. Deployment Preparation
- Provide instructions and any necessary configuration files (like `render.yaml` or a deployment guide) to host the Express backend for free on a service like Render.com.
- Ensure the server configurations (PORT, host binding, start scripts) are fully compatible with free hosting environments.

## Acceptance Criteria

### Test Verification
- [ ] All tests run and pass locally when a valid `GEMINI_API_KEY` is present.
- [ ] The test runner exits with code 0 on success, and non-zero on failure.
- [ ] A test script is added to `package.json` to launch the tests easily.

### Deployment Readiness
- [ ] The repository contains a clear `DEPLOY.md` file explaining step-by-step how to host the backend on Render for free.
- [ ] Any required config files for Render are present in the backend directory.
