import React, {useEffect, useState} from 'react';
import {
  ImageBackground,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import RNFS from 'react-native-fs';
import {AppCard} from '../components/AppCard';
import {Badge} from '../components/Badge';
import {EmptyState} from '../components/EmptyState';
import {GradientButton} from '../components/GradientButton';
import {IconSymbol} from '../components/IconSymbol';
import {ScreenHeader} from '../components/ScreenHeader';
import {
  mockStatuses,
  StatusGrid,
  type StatusItem,
} from '../components/StatusGrid';
import {colors, radii, spacing, typography} from '../theme/theme';
import {useAppConfig} from '../config/AppConfigProvider';
import {generateMemeFromImage} from '../services/api';

export function StatusRemixerScreen() {
  const {backendUrl} = useAppConfig();
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [selected, setSelected] = useState<StatusItem | null>(null);
  const [caption, setCaption] = useState('Sélectionne un statut pour commencer le remix.');
  const [loading, setLoading] = useState(false);
  const [placeholderUri, setPlaceholderUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTone, setSelectedTone] = useState('Automatic');

  // 1. Create a dummy image locally on mount to support testing mock statuses end-to-end
  useEffect(() => {
    async function createPlaceholderImage() {
      try {
        const path = `${RNFS.DocumentDirectoryPath}/placeholder_status.jpg`;
        const fileExists = await RNFS.exists(path);
        if (!fileExists) {
          // Write a 1x1 transparent/dummy base64 JPEG to serve as a valid file
          const dummyBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
          await RNFS.writeFile(path, dummyBase64, 'base64');
        }
        setPlaceholderUri(`file://${path}`);
      } catch (err) {
        console.warn('Failed to write placeholder status image:', err);
      }
    }
    createPlaceholderImage();
  }, []);

  // 2. Request storage permissions
  async function requestStoragePermission() {
    if (Platform.OS !== 'android') {
      setPermissionGranted(true);
      return;
    }
    try {
      let granted = false;
      if (typeof Platform.Version === 'number' && Platform.Version >= 33) {
        const results = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
        ]);
        granted =
          results[PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          results[PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO] ===
            PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: 'Accès au stockage requis',
            message: "MemeAI a besoin d'accéder à ton stockage pour lire les statuts WhatsApp.",
            buttonPositive: 'OK',
            buttonNegative: 'Annuler',
          }
        );
        granted = result === PermissionsAndroid.RESULTS.GRANTED;
      }
      setPermissionGranted(granted);
    } catch (err) {
      console.warn('Permission request error:', err);
      setPermissionGranted(false);
    }
  }

  // 3. Scan WhatsApp folder when permission is granted
  useEffect(() => {
    if (!permissionGranted) {
      return;
    }

    async function scanWhatsAppStatuses() {
      const WHATSAPP_STATUS_PATH = `${RNFS.ExternalStorageDirectoryPath}/Android/media/com.whatsapp/WhatsApp/Media/.Statuses`;
      try {
        const exists = await RNFS.exists(WHATSAPP_STATUS_PATH);
        if (exists) {
          const files = await RNFS.readDir(WHATSAPP_STATUS_PATH);
          const mapped = files
            .filter(f => f.isFile() && /\.(jpe?g|png|gif|mp4)$/i.test(f.name))
            .map((f, index) => {
              const isVideo = f.name.toLowerCase().endsWith('.mp4');
              const fallbackColors = [
                [colors.danger, colors.orange],
                [colors.info, colors.blue],
                [colors.success, colors.info],
                [colors.violet, colors.pink],
              ][index % 4];
              return {
                id: f.name,
                label: f.name.substring(0, 15),
                type: isVideo ? 'video' : 'image',
                colors: fallbackColors,
                uri: `file://${f.path}`,
              } as StatusItem;
            });
          setStatuses(mapped);
        } else {
          console.log('WhatsApp statuses directory not found. Using mock data.');
          setStatuses(mockStatuses);
        }
      } catch (err) {
        console.warn('Failed to read WhatsApp statuses:', err);
        setStatuses(mockStatuses);
      }
    }

    scanWhatsAppStatuses();
  }, [permissionGranted]);

  // Reset caption when selected item changes
  useEffect(() => {
    if (selected) {
      setCaption('Quand ton statut WhatsApp devient plus drôle que prévu.');
      setError(null);
    }
  }, [selected]);

  async function generateCaption() {
    if (!selected) {
      return;
    }

    if (selected.type === 'video') {
      setError("Le remixage des vidéos n'est pas encore supporté par l'IA. Choisis une image !");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // If we are selecting a mock item (without a real file), use the placeholder JPEG.
      // Otherwise, use the real status file path.
      const imageUri = selected.uri && !selected.uri.includes('undefined') ? selected.uri : placeholderUri;

      if (!imageUri) {
        throw new Error('Aucune image disponible pour la génération.');
      }

      const result = await generateMemeFromImage(backendUrl, {
        uri: imageUri,
        selectedId: selected.id,
        name: selected.id + '.jpg',
        type: 'image/jpeg',
      } as any, selectedTone);

      setCaption(result.caption);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Status Remixer"
        subtitle="Transforme tes statuts WhatsApp en mèmes"
      />
      <ScrollView contentContainerStyle={styles.content}>
        {!permissionGranted ? (
          <AppCard style={styles.permissionCard}>
            <View style={styles.permissionIcon}>
              <IconSymbol name="folder" color={colors.warning} size={24} />
            </View>
            <Text style={styles.cardTitle}>Accès au stockage requis</Text>
            <Text style={styles.cardText}>
              L'app a besoin d'accéder à tes statuts WhatsApp sauvegardés.
            </Text>
            <GradientButton
              label="Autoriser l'accès"
              onPress={requestStoragePermission}
              style={styles.permissionButton}
            />
          </AppCard>
        ) : statuses.length > 0 ? (
          <>
            <View style={styles.galleryHeader}>
              <Text style={styles.sectionTitle}>Statuts WhatsApp</Text>
              <Badge label={`${statuses.length}`} tone="info" />
            </View>
            <StatusGrid data={statuses} onSelect={setSelected} />
          </>
        ) : (
          <EmptyState
            icon="📭"
            title="Aucun statut trouvé"
            description="Ouvre WhatsApp et consulte des statuts pour les voir ici."
          />
        )}
      </ScrollView>

      <Modal visible={!!selected} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fermer le statut sélectionné"
              onPress={() => setSelected(null)}
              style={styles.closeButton}>
              <IconSymbol name="close" color={colors.text} size={20} />
            </Pressable>

            {selected ? (
              <ScrollView contentContainerStyle={styles.sheetContent}>
                {selected.uri && !selected.uri.includes('undefined') ? (
                  <ImageBackground
                    source={{uri: selected.uri}}
                    style={styles.selectedImage}
                    imageStyle={styles.selectedImageBorder}>
                    <Text style={styles.overlayText}>{caption}</Text>
                  </ImageBackground>
                ) : (
                  <LinearGradient colors={selected.colors} style={styles.selectedImage}>
                    <Text style={styles.overlayText}>{caption}</Text>
                  </LinearGradient>
                )}

                {error ? <Text style={styles.errorText}>{error}</Text> : undefined}

                <Text style={styles.sheetLabel}>Texte généré :</Text>
                <Text style={styles.generatedCaption}>"{caption}"</Text>

                <Text style={styles.sheetLabel}>Style du texte :</Text>
                <View style={styles.pills}>
                  {['Impact', 'Bold', 'Outline'].map(style => (
                    <View key={style} style={styles.pill}>
                      <Text style={styles.pillText}>{style}</Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.sheetLabel}>Couleur :</Text>
                <View style={styles.swatches}>
                  {[colors.text, colors.warning, colors.danger, colors.success, colors.blue].map(
                    swatch => (
                      <View
                        key={swatch}
                        style={[styles.swatch, {backgroundColor: swatch}]}
                      />
                    ),
                  )}
                </View>

                <Text style={styles.sheetLabel}>Humour :</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toneChips} style={{marginBottom: spacing.lg}}>
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
                        disabled={loading}
                        onPress={() => setSelectedTone(t.id)}
                        style={[
                          styles.toneChip,
                          {
                            backgroundColor: active ? colors.info : colors.input,
                            borderColor: active ? colors.info : colors.border,
                            opacity: loading ? 0.6 : 1,
                          },
                        ]}>
                        <Text style={[styles.toneChipText, {color: active ? '#FFFFFF' : colors.text}]}>
                          {t.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <GradientButton
                  label="Générer caption IA"
                  loading={loading}
                  onPress={generateCaption}
                  icon={<IconSymbol name="zap" color={colors.text} size={18} />}
                />

                <View style={styles.sheetActions}>
                  <GradientButton
                    label="Sauvegarder"
                    icon={<IconSymbol name="download" color={colors.text} size={18} />}
                  />
                  <GradientButton
                    label="Partager"
                    icon={<IconSymbol name="share" color={colors.text} size={18} />}
                  />
                </View>
              </ScrollView>
            ) : undefined}
          </View>
        </View>
      </Modal>
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
  },
  permissionCard: {
    borderColor: `${colors.warning}66`,
  },
  permissionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.warning}18`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.text,
  },
  cardText: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  permissionButton: {
    marginTop: spacing.xxl,
  },
  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  sheet: {
    minHeight: '85%',
    maxHeight: '92%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderMuted,
    alignSelf: 'center',
    marginTop: spacing.md,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.xl,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.input,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  sheetContent: {
    padding: spacing.xl,
    paddingBottom: spacing.huge,
  },
  selectedImage: {
    height: 240,
    borderRadius: radii.lg,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: spacing.lg,
    marginBottom: spacing.xxl,
  },
  selectedImageBorder: {
    borderRadius: radii.lg,
  },
  overlayText: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: '#000000',
    textShadowRadius: 5,
    textShadowOffset: {width: 1, height: 1},
  },
  errorText: {
    color: colors.danger,
    marginBottom: spacing.lg,
    textAlign: 'center',
    ...typography.body,
  },
  sheetLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  generatedCaption: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xxl,
  },
  pills: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xxl,
  },
  pill: {
    minHeight: 34,
    borderRadius: radii.round,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderMuted,
    backgroundColor: colors.input,
  },
  pillText: {
    ...typography.caption,
    color: colors.text,
  },
  swatches: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
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
});
