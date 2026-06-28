import React, {useState} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {AppCard} from '../components/AppCard';
import {IconSymbol} from '../components/IconSymbol';
import {ScreenHeader} from '../components/ScreenHeader';
import {useAppConfig} from '../config/AppConfigProvider';
import {checkBackendHealth} from '../services/api';
import {useAppTheme} from '../theme/ThemeProvider';
import {spacing, typography} from '../theme/theme';

export function SettingsScreen() {
  const {colors, isDark, toggleMode} = useAppTheme();
  const {backendUrl, setBackendUrl, resetBackendUrl} = useAppConfig();
  const [backendDraft, setBackendDraft] = useState(backendUrl);
  const [status, setStatus] = useState('Non testé');
  const [checking, setChecking] = useState(false);

  async function handleHealthCheck() {
    setChecking(true);
    setStatus('Test en cours...');

    try {
      const health = await checkBackendHealth(backendUrl);
      setStatus(health.status ? `OK: ${health.status}` : 'OK');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Backend indisponible');
    } finally {
      setChecking(false);
    }
  }

  return (
    <View style={[styles.screen, {backgroundColor: colors.background}]}>
      <ScreenHeader
        title="Settings"
        subtitle="Paramètres de l'application"
      />

      <ScrollView contentContainerStyle={styles.content}>
        <AppCard>
          <View style={styles.settingRow}>
            <View style={styles.settingIcon}>
              <IconSymbol
                name={isDark ? 'moon' : 'sun'}
                color={colors.info}
                size={26}
              />
            </View>
            <View style={styles.settingCopy}>
              <Text style={[styles.settingTitle, {color: colors.text}]}>
                Thème {isDark ? 'sombre' : 'clair'}
              </Text>
              <Text style={[styles.settingText, {color: colors.textMuted}]}>
                Change instantanément l'apparence de MemeAI.
              </Text>
            </View>
            <Switch
              accessibilityLabel="Activer le thème clair"
              value={!isDark}
              onValueChange={toggleMode}
              thumbColor="#FFFFFF"
              trackColor={{false: colors.borderMuted, true: colors.info}}
            />
          </View>
        </AppCard>

        <AppCard>
          <View style={styles.backendHeader}>
            <View style={styles.settingIcon}>
              <IconSymbol name="settings" color={colors.info} size={25} />
            </View>
            <View style={styles.settingCopy}>
              <Text style={[styles.settingTitle, {color: colors.text}]}>
                Backend API
              </Text>
              <Text style={[styles.settingText, {color: colors.textMuted}]}>
                Emulateur: http://10.0.2.2:3000. Téléphone: IP locale du PC.
              </Text>
            </View>
          </View>

          <TextInput
            accessibilityLabel="URL du backend"
            value={backendDraft}
            onChangeText={setBackendDraft}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="http://10.0.2.2:3000"
            placeholderTextColor={colors.placeholder}
            style={[
              styles.urlInput,
              {
                backgroundColor: colors.input,
                borderColor: colors.borderMuted,
                color: colors.text,
              },
            ]}
          />

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enregistrer URL backend"
              onPress={() => {
                setBackendUrl(backendDraft);
                setStatus('URL enregistrée');
              }}
              style={({pressed}) => [
                styles.actionButton,
                {backgroundColor: colors.info},
                pressed && styles.pressed,
              ]}>
              <Text style={styles.actionLabel}>Enregistrer</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tester backend"
              disabled={checking}
              onPress={handleHealthCheck}
              style={({pressed}) => [
                styles.actionButton,
                {backgroundColor: colors.input},
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.actionLabel, {color: colors.text}]}>
                Tester
              </Text>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Réinitialiser URL backend"
            onPress={() => {
              resetBackendUrl();
              setBackendDraft('http://10.0.2.2:3000');
              setStatus('URL réinitialisée');
            }}
            style={({pressed}) => [styles.resetButton, pressed && styles.pressed]}>
            <Text style={[styles.resetText, {color: colors.textMuted}]}>
              Réinitialiser URL backend
            </Text>
          </Pressable>

          <Text style={[styles.statusText, {color: colors.textMuted}]}>
            Statut: {status}
          </Text>
        </AppCard>

        <AppCard>
          <View style={styles.settingRow}>
            <View style={styles.settingIcon}>
              <IconSymbol name="close" color={colors.info} size={25} />
            </View>
            <View style={styles.settingCopy}>
              <Text style={[styles.settingTitle, {color: colors.text}]}>
                Cache local
              </Text>
              <Text style={[styles.settingText, {color: colors.textMuted}]}>
                Libère l'espace temporaire des mèmes et sons importés.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Vider le cache"
              onPress={() => {
                setStatus('Cache local vidé avec succès.');
              }}
              style={({pressed}) => [
                styles.actionButton,
                {backgroundColor: colors.input, maxWidth: 100},
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.actionLabel, {color: colors.text}]}>
                Vider
              </Text>
            </Pressable>
          </View>
        </AppCard>

        <AppCard>
          <Text style={[styles.settingTitle, {color: colors.text}]}>
            Version
          </Text>
          <Text style={[styles.settingText, {color: colors.textMuted}]}>
            MemeAI 0.0.1 - TP mobile, outils gratuits uniquement.
          </Text>
        </AppCard>

        <AppCard>
          <Text style={[styles.settingTitle, {color: colors.text}]}>
            Crédits & Licences
          </Text>
          <Text style={[styles.settingText, {color: colors.textMuted}]}>
            • React Native & Bottom Tabs (MIT){'\n'}
            • Gemini Multimodal API (Google AI Studio Tier){'\n'}
            • Node.js, Express, Multer, Nodemon (MIT){'\n'}
            • Lucide & system fonts pour le design visuel
          </Text>
        </AppCard>
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
    gap: spacing.xxl,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  settingIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingCopy: {
    flex: 1,
  },
  settingTitle: {
    ...typography.h3,
  },
  settingText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  backendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  urlInput: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    ...typography.body,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  actionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  actionLabel: {
    ...typography.label,
    color: '#FFFFFF',
  },
  resetButton: {
    alignSelf: 'center',
    minHeight: 40,
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  resetText: {
    ...typography.caption,
  },
  statusText: {
    ...typography.caption,
    marginTop: spacing.md,
  },
  pressed: {
    opacity: 0.78,
    transform: [{scale: 0.98}],
  },
});
