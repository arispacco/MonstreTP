import React, {useState, useEffect} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
  Linking,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import {AppCard} from '../components/AppCard';
import {Badge} from '../components/Badge';
import {ScreenHeader} from '../components/ScreenHeader';
import {useAppTheme} from '../theme/ThemeProvider';
import {spacing, typography, colors as themeColors} from '../theme/theme';
import {useAppConfig} from '../config/AppConfigProvider';
import {fetchPublicMemes, PublicMeme} from '../services/api';
import {useNavigation, useIsFocused} from '@react-navigation/native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

const networks = [
  {name: 'WhatsApp', icon: 'whatsapp', color: '#25D366'},
  {name: 'Instagram', icon: 'instagram', color: '#E4405F'},
  {name: 'TikTok', icon: 'music', color: '#000000'},
  {name: 'Facebook', icon: 'facebook', color: '#1877F2'},
  {name: 'X', icon: 'twitter', color: '#111111'},
  {name: 'Telegram', icon: 'telegram', color: '#2AABEE'},
];

export function SocialScreen() {
  const {colors} = useAppTheme();
  const {backendUrl} = useAppConfig();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();

  const [memes, setMemes] = useState<PublicMeme[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load public gallery memes
  async function loadGallery() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPublicMemes(backendUrl);
      setMemes(data);
    } catch (err: any) {
      console.warn(err);
      setError('Impossible de charger la galerie publique.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isFocused) {
      loadGallery();
    }
  }, [isFocused]);

  const handleNetworkPress = async (networkName: string) => {
    const message = "Découvre MemeAI, l'application ultime pour créer des mèmes et stickers avec l'intelligence artificielle !";

    let url = '';
    switch (networkName) {
      case 'WhatsApp':
        url = `whatsapp://send?text=${encodeURIComponent(message)}`;
        break;
      case 'Telegram':
        url = `tg://msg?text=${encodeURIComponent(message)}`;
        break;
      case 'X':
        url = `twitter://post?message=${encodeURIComponent(message)}`;
        break;
      case 'Facebook':
        url = `fb://`;
        break;
      case 'Instagram':
        url = `instagram://`;
        break;
      case 'TikTok':
        url = `tiktok://`;
        break;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        // Fallback to web link
        let webUrl = '';
        if (networkName === 'WhatsApp') webUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
        else if (networkName === 'Telegram') webUrl = `https://t.me/share/url?url=${encodeURIComponent(message)}`;
        else if (networkName === 'X') webUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`;
        else webUrl = `https://${networkName.toLowerCase()}.com`;

        await Linking.openURL(webUrl);
      }
    } catch {
      Alert.alert('Erreur', `Impossible de lancer l'application ${networkName}.`);
    }
  };

  const handleShareMeme = async (item: PublicMeme) => {
    const fullImgUrl = item.imageUrl.startsWith('http')
      ? item.imageUrl
      : `${backendUrl}${item.imageUrl}`;
    try {
      await Share.share({
        title: 'MemeAI Gallery',
        url: fullImgUrl,
        message: `Regarde ce mème de la galerie publique : "${item.caption}"\n${fullImgUrl}`,
      });
    } catch {
      Alert.alert('Partage échoué', 'Impossible de partager.');
    }
  };

  const handleInspire = (item: PublicMeme) => {
    const fullImgUrl = item.imageUrl.startsWith('http')
      ? item.imageUrl
      : `${backendUrl}${item.imageUrl}`;

    navigation.navigate('Atelier', {
      caption: item.caption,
      imageUri: fullImgUrl,
    });
  };

  return (
    <View style={[styles.screen, {backgroundColor: colors.background}]}>
      <ScreenHeader
        title="Social"
        subtitle="Partager et explorer les créations de la communauté"
      />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Rapid Share Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>Partage rapide</Text>
        </View>

        <View style={styles.networkGrid}>
          {networks.map(network => (
            <Pressable
              key={network.name}
              accessibilityRole="button"
              accessibilityLabel={`Partager sur ${network.name}`}
              onPress={() => handleNetworkPress(network.name)}
              style={({pressed}) => [
                styles.networkPressable,
                pressed && styles.pressed,
              ]}>
              <AppCard style={styles.networkCard}>
                <View style={[styles.networkIcon, {backgroundColor: network.color}]}>
                  <FontAwesome name={network.icon} size={28} color="#FFFFFF" />
                </View>
                <Text style={[styles.networkName, {color: colors.text}]}>
                  {network.name}
                </Text>
              </AppCard>
            </Pressable>
          ))}
        </View>

        {/* Public Gallery Section */}
        <View style={[styles.sectionHeader, styles.galleryHeader, {borderTopColor: colors.border}]}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>Galerie Publique</Text>
          <Pressable onPress={loadGallery}>
            <Text style={{color: colors.info, fontSize: 13, fontWeight: '600'}}>Actualiser</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.info} />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={{color: colors.warning, textAlign: 'center'}}>{error}</Text>
          </View>
        ) : memes.length === 0 ? (
          <View style={[styles.emptyContainer, {backgroundColor: colors.input}]}>
            <Text style={{color: colors.textMuted, textAlign: 'center'}}>
              Aucun mème publié pour le moment. Soyez le premier à publier depuis l'Atelier !
            </Text>
          </View>
        ) : (
          <View style={styles.galleryGrid}>
            {memes.map(item => {
              const fullImgUrl = item.imageUrl.startsWith('http')
                ? item.imageUrl
                : `${backendUrl}${item.imageUrl}`;
              return (
                <AppCard key={item.id} style={styles.galleryCard}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.author, {color: colors.textMuted}]}>
                      Par {item.author}
                    </Text>
                  </View>

                  {item.imageUrl ? (
                    <Image
                      source={{uri: fullImgUrl}}
                      style={styles.galleryImage}
                      resizeMode="cover"
                    />
                  ) : null}

                  <Text style={[styles.caption, {color: colors.text}]}>
                    "{item.caption}"
                  </Text>
                  <View style={{alignSelf: 'flex-start'}}>
                    <Badge label={item.tone} tone="info" />
                  </View>

                  <View style={styles.cardActions}>
                    <Pressable
                      onPress={() => handleInspire(item)}
                      style={({pressed}) => [
                        styles.actionBtn,
                        {backgroundColor: colors.info},
                        pressed && styles.pressed,
                      ]}>
                      <Text style={styles.actionBtnText}>S'inspirer</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => handleShareMeme(item)}
                      style={({pressed}) => [
                        styles.actionBtn,
                        {backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border},
                        pressed && styles.pressed,
                      ]}>
                      <Text style={[styles.actionBtnText, {color: colors.text}]}>Partager</Text>
                    </Pressable>
                  </View>
                </AppCard>
              );
            })}
          </View>
        )}
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
    gap: spacing.lg,
  },
  sectionHeader: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography.h3,
    fontWeight: '700',
  },
  networkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  networkPressable: {
    width: '47.5%',
  },
  networkCard: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  networkIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  networkName: {
    ...typography.label,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    marginTop: spacing.xl,
  },
  loaderContainer: {
    paddingVertical: spacing.huge,
    alignItems: 'center',
  },
  errorContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: spacing.xl,
    borderRadius: 12,
    alignItems: 'center',
  },
  galleryGrid: {
    gap: spacing.lg,
  },
  galleryCard: {
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  author: {
    fontSize: 11,
    fontWeight: '600',
  },
  galleryImage: {
    width: '100%',
    aspectRatio: 1.2,
    borderRadius: 12,
    backgroundColor: '#333333',
  },
  caption: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.78,
    transform: [{scale: 0.98}],
  },
});
