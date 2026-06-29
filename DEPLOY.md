# Render Deployment Guide

This document describes how to deploy the MemeAI Node.js/Express backend to [Render](https://render.com).

## 1. Creating a Render Account & Connecting GitHub

1. Go to [Render](https://render.com/) and click **Sign Up**.
2. Sign up using your GitHub account (recommended) or email.
3. If you signed up via email, go to your **Account Settings** and connect your GitHub account under **Identity Providers**.
4. Grant Render access to the repository containing this project.

---

## 2. Deployment Methods

You can deploy the backend using either the **Render Blueprint (Infrastructure as Code)** or via the **Render Dashboard UI (Manual Deployment)**.

### Method A: Using Render Blueprint (Recommended)

Render Blueprints allow you to define your service configuration in a `render.yaml` file located in your repository. This makes deployment automated and reproducible.

1. In the Render Dashboard, click the **New +** button and select **Blueprint**.
2. Connect your GitHub repository.
3. Render will automatically detect the `backend/render.yaml` file in your repository.
4. Review the service definition:
   - **Service Name**: `memeai-backend` (as defined in `render.yaml`)
   - **Environment**: Node
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Under the Environment Variables section, you will see the defined environment variables:
   - `PORT`: Set to `3000` (Render defaults to routing external HTTP traffic here, or automatically handles it).
   - `GEMINI_MODEL`: `gemini-1.5-flash`
   - `ALLOW_MOCK_AI`: `false` (forces the backend to use the real Gemini API in production).
   - `GEMINI_API_KEY`: Set your live Gemini API key here (leave it blank initially in the blueprint form, then enter the value when prompted, as it is marked `sync: false`).
6. Click **Approve** to deploy.

### Method B: Manual Deployment via Render Dashboard

If you prefer to configure the service manually through the Render Dashboard:

1. Click the **New +** button in the Render Dashboard and select **Web Service**.
2. Choose **Build and deploy from a Git repository**.
3. Select your repository from the list.
4. In the configuration screen, set the following values:
   - **Name**: `memeai-backend`
   - **Language** / **Runtime**: `Node`
   - **Region**: Select a region close to your target audience.
   - **Branch**: Select your main/active branch (e.g. `main`).
   - **Root Directory**: `backend` (Important: This must be set to `backend` since our Node.js app is located in the subfolder. If left empty, Render will look in the repository root and fail to find the correct `package.json`).
   - **Build Command**: `npm install`
   - **Start Command**: `npm start` (or `node index.js`)
   - **Instance Type**: `Free` (or custom tier)
5. Scroll down to **Advanced** and click **Add Environment Variable** to add the following key-value pairs:
   - `PORT`: `3000`
   - `GEMINI_API_KEY`: `your_actual_gemini_api_key`
   - `ALLOW_MOCK_AI`: `false` (Ensure this is set to `false` for production to avoid mock responses).
   - `GEMINI_MODEL`: `gemini-1.5-flash`
6. Click **Create Web Service** at the bottom of the page.

---

## 3. Environment Variables Details

To ensure the backend works correctly, the following environment variables must be configured on Render:

| Variable Name | Description | Recommended Production Value |
| --- | --- | --- |
| `PORT` | The port the server will bind to. | `3000` (or `10000`) |
| `GEMINI_API_KEY` | Your Google Gemini API key. | `your_actual_gemini_api_key_from_google_ai_studio` |
| `ALLOW_MOCK_AI` | Whether to fallback to mock AI responses. | `false` |
| `GEMINI_MODEL` | The model version used by the Gemini API. | `gemini-1.5-flash` |

> **Security Note**: Never commit your `GEMINI_API_KEY` to GitHub. The local backend uses `.env` which is gitignored, and production uses Render's environment variables management.

---

## 4. Key Deployment Verifications

To prevent deployment failures, double-check these key aspects of the service configuration:

1. **Host Binding**: The server is configured to bind to `0.0.0.0` inside `backend/index.js`:
   ```javascript
   app.listen(port, '0.0.0.0', () => { ... });
   ```
   This is critical on Render to allow external requests to reach the container. Binding to `localhost` or `127.0.0.1` will cause the health check to fail.
2. **Start Script**: In `backend/package.json`, ensure there is a `"start": "node index.js"` script. Render uses `npm start` by default to run the service.
3. **Engine Version**: The project requires Node >= 18. Render automatically reads the `"engines"` block in `backend/package.json` to provision the correct Node.js version.
4. **Port Configuration**: Render automatically manages routing to the container port. Ensure your `PORT` env var matches the port expected by the backend (defaults to `3000`).
