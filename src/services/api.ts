import type {GeneratedMeme} from '../types/meme';

type ApiErrorPayload = {
  error?: string;
  message?: string;
};

export async function generateMemeFromText(
  backendUrl: string,
  text: string,
  tone?: string,
): Promise<GeneratedMeme> {
  const response = await fetch(`${normalizeBaseUrl(backendUrl)}/api/context`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({text, tone}),
  });

  if (!response.ok) {
    let payload: ApiErrorPayload = {};

    try {
      payload = await response.json();
    } catch {
      payload = {};
    }

    throw new Error(
      payload.error ??
        payload.message ??
        `Backend indisponible (${response.status})`,
    );
  }

  return response.json();
}

export async function checkBackendHealth(backendUrl: string) {
  const response = await fetch(`${normalizeBaseUrl(backendUrl)}/health`);

  if (!response.ok) {
    throw new Error(`Backend indisponible (${response.status})`);
  }

  return response.json();
}

export async function generateMemeFromAudio(
  backendUrl: string,
  audio: {uri: string; name: string; type: string},
  tone?: string,
): Promise<GeneratedMeme> {
  const formData = new FormData();
  formData.append('audio', audio as unknown as Blob);
  if (tone) {
    formData.append('tone', tone);
  }

  return postMultipart(`${normalizeBaseUrl(backendUrl)}/api/voice`, formData);
}

export async function generateMemeFromImage(
  backendUrl: string,
  image: {uri: string; name: string; type: string},
  tone?: string,
): Promise<GeneratedMeme & {suggestion?: string}> {
  const formData = new FormData();
  formData.append('image', image as unknown as Blob);
  if (tone) {
    formData.append('tone', tone);
  }

  return postMultipart(`${normalizeBaseUrl(backendUrl)}/api/remixer`, formData);
}

export async function modifyImageViaAI(
  backendUrl: string,
  image: {uri: string; name: string; type: string} | string,
  prompt: string,
): Promise<{prompt: string}> {
  const formData = new FormData();
  formData.append('prompt', prompt);

  if (typeof image === 'string') {
    formData.append('imageUrl', image);
  } else {
    // If it's a local file path / asset from image picker
    formData.append('image', image as unknown as Blob);
  }

  return postMultipart<{prompt: string}>(
    `${normalizeBaseUrl(backendUrl)}/api/modify-image`,
    formData,
  );
}

async function postMultipart<T>(url: string, body: FormData): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
    body,
  });

  if (!response.ok) {
    let payload: ApiErrorPayload = {};

    try {
      payload = await response.json();
    } catch {
      payload = {};
    }

    throw new Error(
      payload.error ??
        payload.message ??
        `Backend indisponible (${response.status})`,
    );
  }

  return response.json();
}

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, '');
}
