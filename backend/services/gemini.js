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

async function generateCaptionFromText(text, tone, country, format, style) {
  const apiKey = process.env.GEMINI_API_KEY;
  const allowMock = process.env.ALLOW_MOCK_AI !== 'false';

  const mockResponse = {
    caption: `Quand "${text.slice(0, 50)}..." devient beaucoup trop reel.`,
    tone: 'Mock gratuit',
  };
  if (format === 'image') {
    mockResponse.imagePrompt = `a cartoon sticker of ${text.slice(0, 30)}, white border, vector, isolated background`;
  }

  if (!apiKey) {
    if (allowMock) {
      return mockResponse;
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

  const countryInstruction = country && country !== 'Global'
    ? `L'humour et les references culturelles de la caption doivent etre cibles specifiquement pour le public du pays: "${country}". Utilise l'argot local, les expressions populaires et le contexte culturel de ce pays si c'est pertinent.`
    : 'Utilise un humour general, sans ciblage culturel specifique.';

  const formatInstruction = format === 'image'
    ? `IMPORTANT: L'utilisateur veut generer une image pour ce meme. Tu devez repondre en JSON avec 3 champs:
      1. "caption": La legende textuelle drole du mème.
      2. "imagePrompt": Un prompt detaille de description de scene en ANGLAIS pour un generateur d'images (comme Stable Diffusion). Ce prompt doit decrire le visuel du meme correspondant a la caption, dans le style suivant : "${style || 'cartoon'}". S'il s'agit d'un sticker, ajoute 'sticker, white border, vector, isolated background'.
      3. "tone": Le ton utilise.`
    : `Reponds en JSON valide avec les champs "caption" et "tone". La caption doit etre courte, drole, et adaptee au texte.`;

  const prompt = [
    'Tu es MemeAI, un assistant de generation de memes et de stickers humoristiques.',
    formatInstruction,
    'La caption doit etre courte, drole, partageable, sans contenu haineux.',
    toneInstruction,
    countryInstruction,
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
            maxOutputTokens: 250,
            responseMimeType: 'application/json',
          },
        }),
      },
    );
  } catch (fetchErr) {
    console.error('Fetch error during generateCaptionFromText:', fetchErr);
    if (allowMock) {
      return mockResponse;
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
      return mockResponse;
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
    caption: parsed.caption || mockResponse.caption,
    tone: parsed.tone || 'Humour',
    imagePrompt: parsed.imagePrompt || undefined,
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
    "CRITICAL: Le prompt final DOIT ABSOLUMENT decrire et preserver les caracteristiques physiques d'origine des personnes presentes sur l'image d'origine (ethnicite, couleur de peau, traits de visage, texture et couleur des cheveux, vetements) SAUF si l'instruction de l'utilisateur demande explicitement de les changer.",
    "CRITICAL: Tu dois conserver l'arriere-plan (background), le décor, la pose, la structure générale et le style artistique de l'image d'origine (par exemple, si c'est un sticker cartoon avec bordure blanche, le résultat doit rester un sticker cartoon avec bordure blanche et le meme decor).",
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

async function generatePromptForFaceSwap(image1PathOrUrl, image2PathOrUrl) {
  const apiKey = process.env.GEMINI_API_KEY;
  const allowMock = process.env.ALLOW_MOCK_AI !== 'false';

  if (!apiKey) {
    if (allowMock) {
      return `a fusion of the subject in the context image, cartoon sticker, white border, isolated background`;
    }
    const error = new Error('GEMINI_API_KEY manquante');
    error.status = 500;
    error.publicMessage = 'Service IA non configure.';
    throw error;
  }

  const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
  const img1Base64 = await loadImageBase64(image1PathOrUrl);
  const img2Base64 = await loadImageBase64(image2PathOrUrl);

  const prompt = [
    "Tu es MemeAI, un assistant IA de fusion d'images.",
    "Analyse l'image 1 (qui represente la scene de fond/le contexte/le corps) et l'image 2 (qui represente le sujet/le visage a fusionner).",
    "Genere un prompt detaille en anglais decrivant ce a quoi l'image finale de fusion doit ressembler.",
    "Le prompt final doit decrire le sujet de l'image 2 (cheveux, visage, expression, couleur de peau, ethnicite) integre de maniere coherente dans la scene et le corps de l'image 1.",
    "CRITICAL: Tu dois ABSOLUMENT preserver la couleur de peau, l'ethnicite et les traits du visage du sujet de l'image 2 (le visage a fusionner). Ne change pas la couleur de peau pour du blanc s'il est noir, et vice-versa.",
    "CRITICAL: Tu dois conserver integralement l'arriere-plan, le decor, la pose et le style artistique general de l'image 1 (par exemple, si c'est un sticker cartoon ou une photo reelle, le resultat doit conserver le meme style et le meme decor exact).",
    "Ajoute des details pour preserver le style general de l'image 1 (par exemple, si c'est un sticker cartoon ou une photo).",
    "Reponds uniquement avec le prompt descriptif final en anglais, sans formatage JSON ni Markdown, pas de balise ```."
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
                    data: img1Base64,
                  },
                },
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: img2Base64,
                  },
                },
                {text: prompt},
              ],
            },
          ],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 250,
          },
        }),
      },
    );
  } catch (fetchErr) {
    console.error('Fetch error during generatePromptForFaceSwap:', fetchErr);
    if (allowMock) {
      return `a fusion sticker of the subject in the context`;
    }
    const error = new Error('Erreur reseau vers l\'API Gemini.');
    error.status = 502;
    error.publicMessage = 'Fusion IA indisponible.';
    throw error;
  }

  if (!response.ok) {
    console.error(`Gemini API Error in generatePromptForFaceSwap [${response.status}]`);
    if (allowMock) {
      return `a fusion sticker of the subject in the context`;
    }
    const error = new Error(`Gemini error ${response.status}`);
    error.status = 502;
    error.publicMessage = 'Fusion IA indisponible.';
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
  generatePromptForFaceSwap,
};
