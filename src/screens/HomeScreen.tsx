import React, {useState} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Badge} from '../components/Badge';
import {IconSymbol} from '../components/IconSymbol';
import {ScreenHeader} from '../components/ScreenHeader';
import {memePackages} from '../data/memePackages';
import {useAppTheme} from '../theme/ThemeProvider';
import {spacing, typography} from '../theme/theme';
import type {MemePackage, MemePreviewItem} from '../types/meme';
import {useNavigation} from '@react-navigation/native';

export function HomeScreen() {
  const {colors} = useAppTheme();
  const [selectedPackage, setSelectedPackage] = useState<MemePackage | null>(
    null,
  );

  if (selectedPackage) {
    return (
      <View style={[styles.screen, {backgroundColor: colors.background}]}>
        <View style={styles.packageHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retour aux packages"
            onPress={() => setSelectedPackage(null)}
            style={({pressed}) => [
              styles.backButton,
              {backgroundColor: colors.card, borderColor: colors.border},
              pressed && styles.pressed,
            ]}>
            <IconSymbol name="close" size={20} color={colors.text} />
          </Pressable>
          <View style={styles.packageTitleWrap}>
            <Text style={[styles.packageTitle, {color: colors.text}]}>
              {selectedPackage.title}
            </Text>
            <Text style={[styles.packageSubtitle, {color: colors.textMuted}]}>
              {selectedPackage.subtitle} • {selectedPackage.memes.length} mèmes
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.fullGrid}>
          {selectedPackage.memes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, {color: colors.textMuted}]}>Aucun mème disponible dans ce package.</Text>
            </View>
          ) : (
            selectedPackage.memes.map(meme => (
              <MemeTile key={meme.id} meme={meme} large />
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.screen, {backgroundColor: colors.background}]}>
      <ScreenHeader
        title="Home"
        subtitle="Découvre des packages de mèmes prêts à adapter"
      />
      <ScrollView contentContainerStyle={styles.content}>
        {memePackages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, {color: colors.textMuted}]}>Aucun package disponible.</Text>
          </View>
        ) : (
          memePackages.map(pkg => (
            <View key={pkg.id} style={styles.packageSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionCopy}>
                  <Text style={[styles.sectionTitle, {color: colors.text}]}>
                    {pkg.title}
                  </Text>
                  <Text style={[styles.sectionSubtitle, {color: colors.textMuted}]}>
                    {pkg.subtitle}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Afficher ${pkg.title}`}
                  onPress={() => setSelectedPackage(pkg)}
                  style={({pressed}) => [
                    styles.showButton,
                    {borderColor: colors.border, backgroundColor: colors.card},
                    pressed && styles.pressed,
                  ]}>
                  <Text style={[styles.showLabel, {color: colors.text}]}>
                    Afficher
                  </Text>
                </Pressable>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.packageRail}>
                {pkg.memes.map(meme => (
                  <MemeTile key={meme.id} meme={meme} />
                ))}
              </ScrollView>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function MemeTile({
  meme,
  large = false,
}: {
  meme: MemePreviewItem;
  large?: boolean;
}) {
  const {colors} = useAppTheme();
  const navigation = useNavigation<any>();

  return (
    <View style={large ? styles.tileLarge : styles.tile}>
      <LinearGradient colors={meme.palette} style={styles.tileArt}>
        <View style={styles.tileBadgeRow}>
          <Badge label="MemeAI" tone="info" />
        </View>
        <Text style={styles.tileTitle}>{meme.title}</Text>
      </LinearGradient>
      <View style={[styles.tileCaption, {backgroundColor: colors.card}]}>
        <Text
          numberOfLines={large ? 2 : 1}
          style={[styles.tileCaptionText, {color: colors.text}]}>
          {meme.caption}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Utiliser le mème ${meme.title}`}
          style={({pressed}) => [
            styles.useButton,
            {backgroundColor: colors.info},
            pressed && styles.pressed,
          ]}
          onPress={() => {
            navigation.navigate('Atelier', {
              caption: meme.caption,
              palette: meme.palette,
              title: meme.title,
            });
          }}>
          <Text style={styles.useButtonText}>Utiliser</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.huge,
    gap: spacing.xxxl,
  },
  packageSection: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  sectionCopy: {
    flex: 1,
  },
  sectionTitle: {
    ...typography.h3,
  },
  sectionSubtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  showButton: {
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showLabel: {
    ...typography.label,
    fontSize: 13,
  },
  packageRail: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  tile: {
    width: 158,
    borderRadius: 16,
    overflow: 'hidden',
  },
  tileLarge: {
    width: '48%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  tileArt: {
    aspectRatio: 1,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  tileBadgeRow: {
    alignItems: 'flex-start',
  },
  tileTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: '#000000',
    textShadowRadius: 4,
    textShadowOffset: {width: 1, height: 1},
  },
  tileCaption: {
    minHeight: 68,
    padding: spacing.md,
  },
  tileCaptionText: {
    ...typography.caption,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.82,
    transform: [{scale: 0.98}],
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packageTitleWrap: {
    flex: 1,
  },
  packageTitle: {
    ...typography.h2,
  },
  packageSubtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  fullGrid: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    padding: spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
  },
  useButton: {
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  useButtonText: {
    ...typography.label,
    color: '#FFFFFF',
    fontSize: 12,
  },
});
