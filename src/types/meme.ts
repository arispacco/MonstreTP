export type MemePreviewItem = {
  id: string;
  title: string;
  caption: string;
  palette: string[];
};

export type MemePackage = {
  id: string;
  title: string;
  subtitle: string;
  memes: MemePreviewItem[];
};

export type GeneratedMeme = {
  caption: string;
  tone: string;
  transcription?: string;
  imagePrompt?: string;
};
