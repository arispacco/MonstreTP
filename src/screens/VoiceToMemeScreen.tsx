import React, {useEffect, useState} from 'react';
import {PermissionsAndroid, Platform, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import {IconSymbol, type IconName} from '../components/IconSymbol';
import {MemePreview} from '../components/MemePreview';
import {ScreenHeader} from '../components/ScreenHeader';
import {Waveform} from '../components/Waveform';
import {colors, radii, rainbow, spacing, typography} from '../theme/theme';
import {useAppConfig} from '../config/AppConfigProvider';
import {generateMemeFromAudio} from '../services/api';
import type {GeneratedMeme} from '../types/meme';

type VoiceState = 'idle' | 'recording' | 'processing' | 'done';

export function VoiceToMemeScreen() {
  const {backendUrl} = useAppConfig();
  const [state, setState] = useState<VoiceState>('idle');
  const [recordTime, setRecordTime] = useState('00:00:00');
  const [audioRecorderPlayer] = useState(() => new AudioRecorderPlayer());
  const [result, setResult] = useState<GeneratedMeme | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
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

  async function handleRecordPress() {
    if (state === 'idle' || state === 'done') {
      const hasPermission = await requestAudioPermission();
      if (!hasPermission) {
        setError('Permission micro refusée.');
        return;
      }
      try {
        setError(null);
        setResult(null);
        setRecordTime('00:00:00');
        setState('recording');
        await audioRecorderPlayer.startRecorder();
        audioRecorderPlayer.addRecordBackListener((e: any) => {
          setRecordTime(audioRecorderPlayer.mmssss(Math.floor(e.currentPosition)));
        });
      } catch (err) {
        setError(`Erreur démarrage micro: ${err instanceof Error ? err.message : String(err)}`);
        setState('idle');
      }
      return;
    }

    if (state === 'recording') {
      try {
        setState('processing');
        const resultUri = await audioRecorderPlayer.stopRecorder();
        audioRecorderPlayer.removeRecordBackListener();
        
        if (resultUri) {
          const generated = await generateMemeFromAudio(backendUrl, {
            uri: resultUri,
            name: 'vocal_enregistrement.mp4',
            type: 'audio/mp4',
          });
          setResult(generated);
          setState('done');
        } else {
          throw new Error('Aucun fichier audio enregistré.');
        }
      } catch (err) {
        setError(`Erreur génération mème: ${err instanceof Error ? err.message : String(err)}`);
        setState('idle');
      }
    }
  }

  const isRecording = state === 'recording';
  const isProcessing = state === 'processing';
  const recordIcon: IconName = isProcessing
    ? 'magic'
    : isRecording
      ? 'close'
      : state === 'done'
        ? 'check'
        : 'mic';

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Voice-to-Meme" subtitle="Parle, l'IA fait le reste" />
      <ScrollView contentContainerStyle={styles.content}>
        <Waveform active={isRecording || isProcessing} />

        <Text style={styles.timer}>{recordTime}</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : undefined}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            isRecording ? "Arrêter l'enregistrement" : "Démarrer l'enregistrement"
          }
          disabled={isProcessing}
          onPress={handleRecordPress}
          style={({pressed}) => [
            styles.recordButton,
            pressed && !isProcessing ? styles.recordPressed : undefined,
          ]}>
          <LinearGradient
            colors={isRecording ? [colors.danger, colors.danger] : rainbow}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.recordGradient}>
            <IconSymbol name={recordIcon} color="#FFFFFF" size={34} />
          </LinearGradient>
        </Pressable>

        <Text style={styles.hint}>
          {state === 'idle'
            ? 'Appuie pour commencer'
            : state === 'recording'
              ? `En cours... ${recordTime}`
              : state === 'processing'
                ? "L'IA analyse..."
                : 'Terminé !'}
        </Text>

        {state === 'done' && result ? (
          <View style={styles.preview}>
            <MemePreview
              title="Mème généré"
              transcription={result.transcription}
              caption={result.caption}
              tone={result.tone}
            />
          </View>
        ) : undefined}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge,
    alignItems: 'center',
  },
  timer: {
    color: colors.text,
    fontSize: 48,
    lineHeight: 56,
    fontWeight: '700',
    marginTop: spacing.xxxl,
    fontVariant: ['tabular-nums'],
  },
  errorText: {
    color: colors.danger,
    marginTop: spacing.lg,
    textAlign: 'center',
    ...typography.body,
  },
  recordButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginTop: spacing.xxl,
    shadowColor: colors.violet,
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: {width: 0, height: 6},
    elevation: 10,
  },
  recordGradient: {
    flex: 1,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordPressed: {
    transform: [{scale: 0.96}],
    opacity: 0.85,
  },
  hint: {
    ...typography.caption,
    color: colors.placeholder,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  preview: {
    width: '100%',
    marginTop: 40,
  },
});
