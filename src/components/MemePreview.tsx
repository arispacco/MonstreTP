import React, {useState} from 'react';
import {StyleSheet, Text, View, ImageBackground} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useAppTheme} from '../theme/ThemeProvider';
import {rainbow, spacing, typography} from '../theme/theme';
import {shareMemeText} from '../services/share';
import {AppCard} from './AppCard';
import {Badge} from './Badge';
import {IconSymbol} from './IconSymbol';
import {SecondaryButton} from './SecondaryButton';
import {useNavigation} from '@react-navigation/native';

type MemePreviewProps = {
  title?: string;
  caption: string;
  tone?: string;
  transcription?: string;
  imageUri?: string;
};

export function MemePreview({
  title = 'Résultat',
  caption,
  tone,
  transcription,
  imageUri,
}: MemePreviewProps) {
  const {colors} = useAppTheme();
  const [status, setStatus] = useState<string | null>(null);
  const navigation = useNavigation<any>();

  async function handleShare() {
    try {
      await shareMemeText(caption, tone);
      setStatus('Partage ouvert.');
    } catch {
      setStatus("Impossible d'ouvrir le partage.");
    }
  }

  return (
    <AppCard result>
      <View style={styles.titleRow}>
        <LinearGradient colors={rainbow} style={styles.iconBubble}>
          <IconSymbol name="smile" color="#FFFFFF" size={17} />
        </LinearGradient>
        <Text style={[styles.title, {color: colors.text}]}>{title}</Text>
      </View>

      {transcription ? (
        <View
          style={[styles.transcriptionBlock, {borderBottomColor: colors.border}]}>
          <Text style={[styles.blockLabel, {color: colors.info}]}>
            Transcription
          </Text>
          <Text style={[styles.transcription, {color: colors.textMuted}]}>
            {transcription}
          </Text>
        </View>
      ) : undefined}

      {imageUri ? (
        <ImageBackground
          source={{uri: imageUri}}
          style={styles.memeImageBg}
          imageStyle={styles.memeImageStyle}>
          <Text style={styles.memeImageText}>{caption}</Text>
        </ImageBackground>
      ) : (
        <Text style={[styles.caption, {color: colors.text}]}>"{caption}"</Text>
      )}
      {tone ? <Badge label={`Ton : ${tone}`} tone="warning" /> : undefined}

      <View style={styles.actions}>
        <SecondaryButton
          label="Modifier"
          onPress={() => {
            navigation.navigate('Atelier', {
              caption: caption,
              imageUri: imageUri,
            });
          }}
          icon={<IconSymbol name="atelier" color={colors.text} size={18} />}
        />
        <SecondaryButton
          label="Partager"
          onPress={handleShare}
          icon={<IconSymbol name="share" color={colors.text} size={18} />}
        />
      </View>
      {status ? (
        <Text style={[styles.statusText, {color: colors.textMuted}]}>
          {status}
        </Text>
      ) : undefined}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.h3,
  },
  transcriptionBlock: {
    borderBottomWidth: 1,
    paddingBottom: spacing.lg,
    marginBottom: spacing.lg,
  },
  blockLabel: {
    ...typography.micro,
    marginBottom: spacing.sm,
  },
  transcription: {
    ...typography.body,
  },
  caption: {
    ...typography.h3,
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  statusText: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  memeImageBg: {
    width: '100%',
    aspectRatio: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  memeImageStyle: {
    borderRadius: 16,
  },
  memeImageText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
    textShadowColor: '#000000',
    textShadowOffset: {width: 2, height: 2},
    textShadowRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.18)',
    padding: spacing.md,
    borderRadius: 8,
  },
});
