const fs = require('fs');
const endpointBase =
  'https://generativelanguage.googleapis.com/v1beta/models';

async function loadImageBase64(pathOrUrl) {
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    const res = await fetch(pathOrUrl);
    if (!res.ok) throw new Error(`Impossible de charger l'image distante : ${res.statusText}`);
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
  } else {
    return fs.readFileSync(pathOrUrl).toString('base64');
  }
}

async function generateCaptionFromText(text, tone) {
  const apiKey = process.env.GEMINI_API_KEY;
  const allowMock = process.env.ALLOW_MOCK_AI !== 'false';

  if (!apiKey) {
    if (allowMock) {
      return mockCaption(text);
    }

    const error = new Error('GEMINI_API_KEY manquante');
    error.status = 500;
    error.publicMessage = 'Service IA non configure.';
    throw error;
  }

  const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
  const toneInstruction = tone && tone !== 'Automatic'
    ? `Le ton humoristique de la caption doit etre specifiquement de type: "${tone}".`
    : 'Choisis le ton humoristique le plus adapte au contexte.';

  const prompt = [
    'Tu es MemeAI, un generateur de captions de memes en francais.',
    'Reponds uniquement en JSON valide avec les champs caption et tone.',
    'La caption doit etre courte, drole, partageable, sans contenu haineux.',
    toneInstruction,
    `Contexte utilisateur: ${text}`,
  ].join('\n');

  let response;
  try {
    response = await fetch(
      `${endpointBase}/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{text: prompt}],
            },
          ],
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 180,
            responseMimeType: 'application/json',
          },
        }),
      },
    );
  } catch (fetchErr) {
    console.error('Fetch error during generateCaptionFromText:', fetchErr);
    if (allowMock) {
      return mockCaption(text);
    }
    const error = new Error('Erreur reseau vers l\'API Gemini.');
    error.status = 502;
    error.publicMessage = 'Generation IA indisponible.';
    throw error;
  }

  if (!response.ok) {
    let errorDetails = '';
    try {
      const errPayload = await response.json();
      errorDetails = JSON.stringify(errPayload);
    } catch {
      try {
        errorDetails = await response.text();
      } catch {
        errorDetails = 'Impossible de lire le corps de l\'erreur';
      }
    }
    console.error(`Gemini API Error in generateCaptionFromText [${response.status}]: ${errorDetails}`);

    if (allowMock) {
      return mockCaption(text);
    }

    const error = new Error(`Gemini error ${response.status}`);
    error.status = 502;
    error.publicMessage = 'Generation IA indisponible.';
    throw error;
  }

  const payload = await response.json();
  const rawText =
    payload.candidates?.[0]?.content?.parts
      ?.map(part => part.text)
      .filter(Boolean)
      .join('\n') || '';

  const parsed = parseJsonResponse(rawText);
  return {
    caption: parsed.caption || mockCaption(text).caption,
    tone: parsed.tone || tone || 'Humour',
  };
}

async function generateCaptionFromVoice(audioFilePath, mimeType, tone) {
  const apiKey = process.env.GEMINI_API_KEY;
  const allowMock = process.env.ALLOW_MOCK_AI !== 'false';

  if (!apiKey) {
    if (allowMock) {
      return mockVoice();
    }
    const error = new Error('GEMINI_API_KEY manquante');
    error.status = 500;
    error.publicMessage = 'Service IA non configure.';
    throw error;
  }

  const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
  const audioBase64 = fs.readFileSync(audioFilePath).toString('base64');
  const toneInstruction = tone && tone !== 'Automatic'
    ? `Le ton humoristique de la caption doit etre specifiquement de type: "${tone}".`
    : 'Choisis le ton humoristique le plus adapte au contexte.';

  const prompt = [
    'Tu es MemeAI, un transcripteur et generateur de captions de memes en francais.',
    'Analyse le fichier audio fourni.',
    'Reponds uniquement en JSON valide avec les champs: transcription (la transcription fidele et concise de l\'audio), caption (une legende de meme drole basee sur l\'audio), et tone.',
    'La caption doit etre courte, drole, partageable, sans contenu haineux.',
    toneInstruction,
  ].join('\n');

  let response;
  try {
    response = await fetch(
      `${endpointBase}/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType || 'audio/mp3',
                    data: audioBase64,
                  },
                },
                {text: prompt},
              ],
            },
          ],
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 250,
            responseMimeType: 'application/json',
          },
        }),
      },
    );
  } catch (fetchErr) {
    console.error('Fetch error during generateCaptionFromVoice:', fetchErr);
    if (allowMock) {
      return mockVoice();
    }
    const error = new Error('Erreur reseau vers l\'API Gemini.');
    error.status = 502;
    error.publicMessage = 'Generation IA audio indisponible.';
    throw error;
  }

  if (!response.ok) {
    let errorDetails = '';
    try {
      const errPayload = await response.json();
      errorDetails = JSON.stringify(errPayload);
    } catch {
      try {
        errorDetails = await response.text();
      } catch {
        errorDetails = 'Impossible de lire le corps de l\'erreur';
      }
    }
    console.error(`Gemini API Error in generateCaptionFromVoice [${response.status}]: ${errorDetails}`);

    if (allowMock) {
      return mockVoice();
    }
    const error = new Error(`Gemini error ${response.status}`);
    error.status = 502;
    error.publicMessage = 'Generation IA audio indisponible.';
    throw error;
  }

  const payload = await response.json();
  const rawText =
    payload.candidates?.[0]?.content?.parts
      ?.map(part => part.text)
      .filter(Boolean)
      .join('\n') || '';

  const parsed = parseJsonResponse(rawText);
  return {
    transcription: parsed.transcription || 'Transcription indisponible.',
    caption: parsed.caption || 'Quand ton message vocal dit tout sans filtre.',
    tone: parsed.tone || tone || 'Humour',
  };
}

async function generateCaptionFromImage(imageFilePath, mimeType, tone) {
  const apiKey = process.env.GEMINI_API_KEY;
  const allowMock = process.env.ALLOW_MOCK_AI !== 'false';

  if (!apiKey) {
    if (allowMock) {
      return mockImage();
    }
    const error = new Error('GEMINI_API_KEY manquante');
    error.status = 500;
    error.publicMessage = 'Service IA non configure.';
    throw error;
  }

  const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
  const imageBase64 = fs.readFileSync(imageFilePath).toString('base64');
  const toneInstruction = tone && tone !== 'Automatic'
    ? `Le ton humoristique de la caption doit etre specifiquement de type: "${tone}".`
    : 'Choisis le ton humoristique le plus adapte au contexte.';

  const prompt = [
    'Tu es MemeAI, un generateur de captions de memes visuels en francais.',
    'Analyse l\'image fournie.',
    'Reponds uniquement en JSON valide avec les champs: caption (une legende de meme drole et pertinente pour l\'image), suggestion (des conseils de mise en page dans l\'atelier), et tone.',
    'La caption doit etre courte, drole, partageable, sans contenu haineux.',
    toneInstruction,
  ].join('\n');

  let response;
  try {
    response = await fetch(
      `${endpointBase}/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType || 'image/jpeg',
                    data: imageBase64,
                  },
                },
                {text: prompt},
              ],
            },
          ],
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 250,
            responseMimeType: 'application/json',
          },
        }),
      },
    );
  } catch (fetchErr) {
    console.error('Fetch error during generateCaptionFromImage:', fetchErr);
    if (allowMock) {
      return mockImage();
    }
    const error = new Error('Erreur reseau vers l\'API Gemini.');
    error.status = 502;
    error.publicMessage = 'Generation IA image indisponible.';
    throw error;
  }

  if (!response.ok) {
    let errorDetails = '';
    try {
      const errPayload = await response.json();
      errorDetails = JSON.stringify(errPayload);
    } catch {
      try {
        errorDetails = await response.text();
      } catch {
        errorDetails = 'Impossible de lire le corps de l\'erreur';
      }
    }
    console.error(`Gemini API Error in generateCaptionFromImage [${response.status}]: ${errorDetails}`);

    if (allowMock) {
      return mockImage();
    }
    const error = new Error(`Gemini error ${response.status}`);
    error.status = 502;
    error.publicMessage = 'Generation IA image indisponible.';
    throw error;
  }

  const payload = await response.json();
  const rawText =
    payload.candidates?.[0]?.content?.parts
      ?.map(part => part.text)
      .filter(Boolean)
      .join('\n') || '';

  const parsed = parseJsonResponse(rawText);
  return {
    caption: parsed.caption || 'Ce statut avait deja choisi son camp.',
    suggestion: parsed.suggestion || 'Ajoute un texte blanc avec contour noir en bas de l’image.',
    tone: parsed.tone || tone || 'Humour',
  };
}

async function generatePromptForModifiedImage(imagePathOrUrl, userRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  const allowMock = process.env.ALLOW_MOCK_AI !== 'false';

  if (!apiKey) {
    if (allowMock) {
      return `a cartoon sticker of the requested modification: ${userRequest}, white border, vector, isolated background`;
    }
    const error = new Error('GEMINI_API_KEY manquante');
    error.status = 500;
    error.publicMessage = 'Service IA non configure.';
    throw error;
  }

  const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
  const imageBase64 = await loadImageBase64(imagePathOrUrl);

  const prompt = [
    `L'utilisateur a l'image fournie et souhaite la modifier avec cette instruction : "${userRequest}".`,
    "Analyse l'image et l'instruction, puis genere uniquement un prompt detaille en anglais decrivant ce a quoi l'image finale modifiee doit ressembler.",
    "Ce prompt sera envoye a un generateur d'images (comme Stable Diffusion).",
    "Ajoute des details sur les elements ajoutes, modifies ou le style (par exemple, precise 'cartoon style sticker, white border, vector, isolated background' s'il s'agit d'un sticker).",
    "Reponds uniquement avec le prompt descriptif en anglais, sans formatage JSON ni Markdown, pas de balise ```."
  ].join('\n');

  let response;
  try {
    response = await fetch(
      `${endpointBase}/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: imageBase64,
                  },
                },
                {text: prompt},
              ],
            },
          ],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 200,
          },
        }),
      },
    );
  } catch (fetchErr) {
    console.error('Fetch error during generatePromptForModifiedImage:', fetchErr);
    if (allowMock) {
      return `a sticker showing ${userRequest}`;
    }
    const error = new Error('Erreur reseau vers l\'API Gemini.');
    error.status = 502;
    error.publicMessage = 'Modification IA image indisponible.';
    throw error;
  }

  if (!response.ok) {
    console.error(`Gemini API Error in generatePromptForModifiedImage [${response.status}]`);
    if (allowMock) {
      return `a sticker showing ${userRequest}`;
    }
    const error = new Error(`Gemini error ${response.status}`);
    error.status = 502;
    error.publicMessage = 'Modification IA image indisponible.';
    throw error;
  }

  const payload = await response.json();
  const rawText =
    payload.candidates?.[0]?.content?.parts
      ?.map(part => part.text)
      .filter(Boolean)
      .join('\n') || '';

  return rawText.trim();
}

function parseJsonResponse(rawText) {
  const trimmed = rawText.trim();
  try {
    return JSON.parse(trimmed);
  } catch (initialErr) {
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0].trim());
      } catch (nestedErr) {
        console.warn('Echec de parsing du JSON extrait de la reponse:', nestedErr);
      }
    }
  }

  const cleaned = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    return {caption: cleaned.slice(0, 160), tone: 'Humour'};
  }
}

function mockCaption(text) {
  const shortText = text.length > 60 ? `${text.slice(0, 57)}...` : text;
  return {
    caption: `Quand "${shortText}" devient beaucoup trop reel.`,
    tone: 'Mock gratuit',
  };
}

function mockVoice() {
  return {
    transcription: 'Transcription audio mockee pour le TP.',
    caption: 'Quand ton vocal devient officiellement une preuve.',
    tone: 'Humour',
  };
}

function mockImage() {
  return {
    caption: 'Ce statut avait deja choisi son camp.',
    suggestion: 'Ajoute un texte blanc avec contour noir en bas de l’image.',
    tone: 'Ironique',
  };
}

module.exports = {
  generateCaptionFromText,
  generateCaptionFromVoice,
  generateCaptionFromImage,
  generatePromptForModifiedImage,
};
