import React, {useState, useEffect} from 'react';
import {useNavigation} from '@react-navigation/native';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {AppCard} from '../components/AppCard';
import {GradientButton} from '../components/GradientButton';
import {IconSymbol} from '../components/IconSymbol';
import {MemePreview} from '../components/MemePreview';
import {ScreenHeader} from '../components/ScreenHeader';
import {TextInputBox} from '../components/TextInputBox';
import {useAppConfig} from '../config/AppConfigProvider';
import {generateMemeFromText, generateMemeFromAudio, generateMemeFromImage} from '../services/api';
import {useAppTheme} from '../theme/ThemeProvider';
import {rainbow, spacing, typography} from '../theme/theme';
import type {GeneratedMeme} from '../types/meme';
import {launchCamera} from 'react-native-image-picker';
import {pick, types, errorCodes, isErrorWithCode} from '@react-native-documents/picker';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';

const MAX_LENGTH = 700;

type AttachmentInfo = {
  uri: string;
  name: string;
  type: string;
  mode: 'camera' | 'mic' | 'import';
};

export function ContextScreen() {
  const {colors} = useAppTheme();
  const {backendUrl} = useAppConfig();
  const navigation = useNavigation<any>();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [helper, setHelper] = useState(
    'Écris, colle ou importe un contexte. MemeAI préparera un mème dans cette zone.',
  );
  const [result, setResult] = useState<GeneratedMeme | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileAttachment, setFileAttachment] = useState<AttachmentInfo | null>(null);
  const [selectedTone, setSelectedTone] = useState('Automatic');
  const [selectedFormat, setSelectedFormat] = useState<'text' | 'image'>('text');
  const [selectedCountry, setSelectedCountry] = useState('Global');
  const [selectedStyle, setSelectedStyle] = useState('cartoon');
  const [generatedImageUri, setGeneratedImageUri] = useState<string | undefined>(undefined);

  // Audio Recorder State
  const [audioRecorderPlayer] = useState(() => new AudioRecorderPlayer());
  const [recording, setRecording] = useState(false);
  const [recordTime, setRecordTime] = useState('00:00:00');

  useEffect(() => {
    return () => {
      // Clean up player on unmount
      audioRecorderPlayer.stopRecorder().catch(() => {});
      audioRecorderPlayer.removeRecordBackListener();
    };
  }, [audioRecorderPlayer]);

  async function requestAudioPermission() {
    if (Platform.OS !== 'android') {
      return true;
    }
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Permission micro',
          message: 'MemeAI a besoin du micro pour transcrire votre contexte.',
          buttonPositive: 'OK',
          buttonNegative: 'Annuler',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  }

  async function handleCamera() {
    setResult(null);
    setError(null);
    
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Permission Caméra',
            message: 'MemeAI a besoin de la caméra pour prendre une photo.',
            buttonPositive: 'OK',
            buttonNegative: 'Annuler',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          setError('Permission caméra refusée.');
          return;
        }
      } catch (err) {
        console.warn(err);
        return;
      }
    }

    launchCamera(
      {
        mediaType: 'photo',
        quality: 0.8,
      },
      response => {
        if (response.didCancel) {
          return;
        }
        if (response.errorCode) {
          setError(`Erreur caméra: ${response.errorMessage || response.errorCode}`);
          return;
        }
        const asset = response.assets?.[0];
        if (asset && asset.uri) {
          setFileAttachment({
            uri: asset.uri,
            name: asset.fileName || 'camera_photo.jpg',
            type: asset.type || 'image/jpeg',
            mode: 'camera',
          });
          setHelper('Photo capturée avec succès. Prête à générer.');
        }
      },
    );
  }

  async function handleMicToggle() {
    setResult(null);
    setError(null);

    if (recording) {
      // Stop recording
      try {
        const resultUri = await audioRecorderPlayer.stopRecorder();
        audioRecorderPlayer.removeRecordBackListener();
        setRecording(false);
        if (resultUri) {
          setFileAttachment({
            uri: resultUri,
            name: 'vocal_enregistrement.mp4',
            type: 'audio/mp4',
            mode: 'mic',
          });
          setHelper('Message vocal enregistré. Prêt à générer.');
        }
      } catch (err) {
        setError(`Erreur arrêt micro: ${err instanceof Error ? err.message : String(err)}`);
        setRecording(false);
      }
    } else {
      // Start recording
      const hasPermission = await requestAudioPermission();
      if (!hasPermission) {
        setError('Permission micro refusée.');
        return;
      }
      try {
        setFileAttachment(null);
        setRecording(true);
        setRecordTime('00:00:00');
        await audioRecorderPlayer.startRecorder();
        audioRecorderPlayer.addRecordBackListener((e: any) => {
          setRecordTime(audioRecorderPlayer.mmssss(Math.floor(e.currentPosition)));
        });
      } catch (err) {
        setError(`Erreur démarrage micro: ${err instanceof Error ? err.message : String(err)}`);
        setRecording(false);
      }
    }
  }

  async function handleImport() {
    setResult(null);
    setError(null);
    try {
      const results = await pick({
        type: [types.images, types.audio],
        allowMultiSelection: false,
      });
      if (results && results.length > 0) {
        const res = results[0];
        if (res.uri) {
          setFileAttachment({
            uri: res.uri,
            name: res.name || 'fichier_importe',
            type: res.type || 'application/octet-stream',
            mode: 'import',
          });
          setHelper(`Fichier importé : ${res.name}. Prêt à générer.`);
        }
      }
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) {
        return;
      }
      setError(`Erreur d'importation: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function generateMeme() {
    if (!text.trim() && !fileAttachment) {
      setHelper('Ajoute d’abord un texte ou importe un contenu pour créer un mème.');
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);
    setGeneratedImageUri(undefined);
    setHelper("L'IA mélange le contexte, le ton et la punchline.");

    try {
      let generated: GeneratedMeme;
      if (fileAttachment) {
        if (fileAttachment.type.startsWith('image/')) {
          setHelper("Analyse de l'image par Gemini...");
          generated = await generateMemeFromImage(backendUrl, {
            uri: fileAttachment.uri,
            name: fileAttachment.name,
            type: fileAttachment.type,
          }, selectedTone);
        } else if (fileAttachment.type.startsWith('audio/') || fileAttachment.mode === 'mic') {
          setHelper("Transcription et génération depuis l'audio...");
          generated = await generateMemeFromAudio(backendUrl, {
            uri: fileAttachment.uri,
            name: fileAttachment.name,
            type: fileAttachment.type,
          }, selectedTone);
        } else {
          generated = await generateMemeFromText(backendUrl, text.trim() || fileAttachment.name, selectedTone, selectedCountry, selectedFormat, selectedStyle);
        }
      } else {
        generated = await generateMemeFromText(backendUrl, text.trim(), selectedTone, selectedCountry, selectedFormat, selectedStyle);
      }
      setResult(generated);
      if (generated.imagePrompt) {
        const seed = Math.floor(Math.random() * 1000000);
        const finalImageUri = `https://image.pollinations.ai/prompt/${encodeURIComponent(generated.imagePrompt)}?width=512&height=512&nologo=true&seed=${seed}`;
        setGeneratedImageUri(finalImageUri);
      } else {
        setGeneratedImageUri(undefined);
      }
      setHelper('Mème généré depuis le backend.');
    } catch (apiError) {
      const message =
        apiError instanceof Error
          ? apiError.message
          : 'Backend indisponible';

      setError(`${message}. Résultat local temporaire affiché.`);
      setResult({
        caption: fileAttachment
          ? `Quand tu envoies "${fileAttachment.name}" mais que l'API est hors ligne.`
          : 'Quand le backend dort encore, mais que le TP doit avancer quand même.',
        tone: 'Fallback local',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.screen, {backgroundColor: colors.background}]}>
      <ScreenHeader
        title="Context"
        subtitle="Texte, audio, photo ou fichier : tout commence ici"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        
        <View style={styles.subNavigationRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('StatusRemixer')}
            style={({pressed}) => [
              styles.subNavigationCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
              pressed && styles.pressed,
            ]}>
            <IconSymbol name="folder" color={colors.info} size={20} />
            <Text style={[styles.subNavigationText, {color: colors.text}]}>
              Statuts WA
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('VoiceToMeme')}
            style={({pressed}) => [
              styles.subNavigationCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
              pressed && styles.pressed,
            ]}>
            <IconSymbol name="mic" color={colors.success} size={20} />
            <Text style={[styles.subNavigationText, {color: colors.text}]}>
              Voice to Meme
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('ContextReader')}
            style={({pressed}) => [
              styles.subNavigationCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
              pressed && styles.pressed,
            ]}>
            <IconSymbol name="camera" color={colors.warning} size={20} />
            <Text style={[styles.subNavigationText, {color: colors.text}]}>
              Scanner
            </Text>
          </Pressable>
        </View>

        <View style={styles.inputWrap}>
          <TextInputBox
            accessibilityLabel="Contexte à transformer en mème"
            placeholder="Écris ou colle ton contexte..."
            value={text}
            maxLength={MAX_LENGTH}
            onChangeText={value => {
              setText(value);
              setResult(null);
              setError(null);
            }}
            style={styles.input}
          />

          <View style={styles.inputActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Prendre une photo"
              onPress={handleCamera}
              style={({pressed}) => [
                styles.inputAction,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
                pressed && styles.pressed,
              ]}>
              <IconSymbol
                name="camera"
                color={colors.text}
                size={18}
              />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={recording ? "Arrêter l'enregistrement" : "Enregistrer de l'audio"}
              onPress={handleMicToggle}
              style={({pressed}) => [
                styles.inputAction,
                {
                  backgroundColor: recording ? colors.danger : colors.card,
                  borderColor: colors.border,
                },
                pressed && styles.pressed,
              ]}>
              <IconSymbol
                name="mic"
                color={recording ? "#FFFFFF" : colors.text}
                size={17}
              />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Importer un fichier"
              onPress={handleImport}
              style={({pressed}) => [
                styles.inputAction,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
                pressed && styles.pressed,
              ]}>
              <IconSymbol
                name="import"
                color={colors.text}
                size={18}
              />
            </Pressable>
          </View>
        </View>

        {recording ? (
          <View
            style={[
              styles.attachmentBar,
              {backgroundColor: colors.card, borderColor: colors.danger},
            ]}>
            <View style={styles.attachmentCopy}>
              <View style={styles.redDot} />
              <View style={styles.attachmentTextWrap}>
                <Text style={[styles.attachmentTitle, {color: colors.text}]}>
                  Enregistrement vocal en cours...
                </Text>
                <Text style={[styles.attachmentText, {color: colors.textMuted}]}>
                  Durée : {recordTime}
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Arrêter"
              onPress={handleMicToggle}
              style={({pressed}) => [
                styles.clearAttachment,
                {backgroundColor: colors.danger},
                pressed && styles.pressed,
              ]}>
              <IconSymbol name="close" color="#FFFFFF" size={16} />
            </Pressable>
          </View>
        ) : undefined}

        {fileAttachment ? (
          <View
            style={[
              styles.attachmentBar,
              {backgroundColor: colors.card, borderColor: colors.border},
            ]}>
            <View style={styles.attachmentCopy}>
              <IconSymbol
                name={fileAttachment.mode === 'camera' ? 'camera' : fileAttachment.mode === 'mic' ? 'mic' : 'import'}
                color={colors.info}
                size={18}
              />
              <View style={styles.attachmentTextWrap}>
                <Text style={[styles.attachmentTitle, {color: colors.text}]}>
                  {fileAttachment.name}
                </Text>
                <Text style={[styles.attachmentText, {color: colors.textMuted}]}>
                  {fileAttachment.type || 'Fichier prêt'}
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retirer l'import"
              onPress={() => setFileAttachment(null)}
              style={({pressed}) => [
                styles.clearAttachment,
                {backgroundColor: colors.input},
                pressed && styles.pressed,
              ]}>
              <IconSymbol name="close" color={colors.text} size={16} />
            </Pressable>
          </View>
        ) : undefined}

        <View style={styles.metaRow}>
          <Text style={[styles.metaText, {color: colors.placeholder}]}>
            {text.length} / {MAX_LENGTH}
          </Text>
          <Text style={[styles.metaText, {color: colors.textMuted}]}>
            API: {backendUrl}
          </Text>
        </View>

        <View style={styles.toneSelector}>
          <Text style={[styles.toneTitle, {color: colors.textMuted}]}>Humour :</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toneChips}>
            {[
              {id: 'Automatic', label: '⚡ Auto'},
              {id: 'Ironique', label: '😏 Ironique'},
              {id: 'Humour noir', label: '💀 Noir'},
              {id: 'Absurde', label: '🤪 Absurde'},
              {id: 'Jeux de mots', label: '✍️ Mots'},
            ].map(t => {
              const active = selectedTone === t.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setSelectedTone(t.id)}
                  style={[
                    styles.toneChip,
                    {
                      backgroundColor: active ? colors.info : colors.input,
                      borderColor: active ? colors.info : colors.border,
                    },
                  ]}>
                  <Text style={[styles.toneChipText, {color: active ? '#FFFFFF' : colors.text}]}>
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Format Selector */}
        <View style={styles.toneSelector}>
          <Text style={[styles.toneTitle, {color: colors.textMuted}]}>Format de mème :</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toneChips}>
            {[
              {id: 'text', label: '📝 Texte'},
              {id: 'image', label: '🖼️ Image'},
            ].map(f => {
              const active = selectedFormat === f.id;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => {
                    setSelectedFormat(f.id as 'text' | 'image');
                    if (f.id === 'text') setGeneratedImageUri(undefined);
                  }}
                  style={[
                    styles.toneChip,
                    {
                      backgroundColor: active ? colors.info : colors.input,
                      borderColor: active ? colors.info : colors.border,
                    },
                  ]}>
                  <Text style={[styles.toneChipText, {color: active ? '#FFFFFF' : colors.text}]}>
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Country Selector */}
        <View style={styles.toneSelector}>
          <Text style={[styles.toneTitle, {color: colors.textMuted}]}>Pays cible (humour local) :</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toneChips}>
            {[
              {id: 'Global', label: '🌍 Global'},
              {id: 'Cameroun', label: '🇨🇲 Cameroun'},
              {id: 'France', label: '🇫🇷 France / Europe'},
              {id: 'Cote d\'Ivoire', label: '🇨🇮 Côte d\'Ivoire'},
              {id: 'USA', label: '🇺🇸 USA'},
            ].map(c => {
              const active = selectedCountry === c.id;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setSelectedCountry(c.id)}
                  style={[
                    styles.toneChip,
                    {
                      backgroundColor: active ? colors.info : colors.input,
                      borderColor: active ? colors.info : colors.border,
                    },
                  ]}>
                  <Text style={[styles.toneChipText, {color: active ? '#FFFFFF' : colors.text}]}>
                    {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Style Selector */}
        {selectedFormat === 'image' ? (
          <View style={styles.toneSelector}>
            <Text style={[styles.toneTitle, {color: colors.textMuted}]}>Style artistique :</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toneChips}>
              {[
                {id: 'anime', label: '🌸 Animé'},
                {id: 'dessin anime', label: '🎨 Dessin animé'},
                {id: 'mangas', label: '📚 Manga'},
                {id: 'disney', label: '🏰 Disney'},
                {id: 'cartoon', label: '✏️ Cartoon'},
                {id: 'mignon', label: '🦊 Mignon'},
                {id: 'emojis', label: '😜 Emojis'},
                {id: 'stickers whatsapp', label: '💬 Sticker WA'},
                {id: 'stickers', label: '🏷️ Sticker'},
              ].map(s => {
                const active = selectedStyle === s.id;
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => setSelectedStyle(s.id)}
                    style={[
                      styles.toneChip,
                      {
                        backgroundColor: active ? colors.info : colors.input,
                        borderColor: active ? colors.info : colors.border,
                      },
                    ]}>
                    <Text style={[styles.toneChipText, {color: active ? '#FFFFFF' : colors.text}]}>
                      {s.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        <GradientButton
          label="Créer le mème"
          loading={loading}
          onPress={generateMeme}
          icon={<IconSymbol name="magic" color="#FFFFFF" size={18} />}
        />

        <View style={styles.output}>
          {loading ? (
            <AppCard result>
              <View style={styles.loadingContent}>
                <LinearGradient colors={rainbow} style={styles.loadingOrb}>
                  <ActivityIndicator color="#FFFFFF" />
                </LinearGradient>
                <Text style={[styles.outputTitle, {color: colors.text}]}>
                  Génération en cours
                </Text>
                <Text style={[styles.outputText, {color: colors.textMuted}]}>
                  {helper}
                </Text>
              </View>
            </AppCard>
          ) : result ? (
            <>
              {error ? (
                <Text style={[styles.errorText, {color: colors.warning}]}>
                  {error}
                </Text>
              ) : undefined}
              <MemePreview
                caption={result.caption}
                tone={result.tone}
                imageUri={
                  generatedImageUri || (fileAttachment && fileAttachment.type.startsWith('image/')
                    ? fileAttachment.uri
                    : undefined)
                }
              />
            </>
          ) : (
            <AppCard>
              <View style={styles.helpContent}>
                <IconSymbol name="context" color={colors.info} size={30} />
                <Text style={[styles.outputTitle, {color: colors.text}]}>
                  Zone de création
                </Text>
                <Text style={[styles.outputText, {color: colors.textMuted}]}>
                  {helper}
                </Text>
              </View>
            </AppCard>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge,
  },
  inputWrap: {
    position: 'relative',
  },
  input: {
    minHeight: 190,
    paddingBottom: 72,
  },
  inputActions: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inputAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.78,
    transform: [{scale: 0.96}],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xxl,
  },
  attachmentBar: {
    minHeight: 64,
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  redDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
  },
  attachmentCopy: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  attachmentTextWrap: {
    flex: 1,
  },
  attachmentTitle: {
    ...typography.label,
  },
  attachmentText: {
    ...typography.caption,
    marginTop: 2,
  },
  clearAttachment: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaText: {
    ...typography.caption,
  },
  output: {
    marginTop: spacing.xxxl,
  },
  errorText: {
    ...typography.caption,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  helpContent: {
    minHeight: 190,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingContent: {
    minHeight: 190,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingOrb: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outputTitle: {
    ...typography.h3,
    textAlign: 'center',
  },
  outputText: {
    ...typography.body,
    textAlign: 'center',
  },
  toneSelector: {
    marginBottom: spacing.lg,
  },
  toneTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  toneChips: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  toneChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toneChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  subNavigationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  subNavigationCard: {
    flex: 1,
    minHeight: 70,
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  subNavigationText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
