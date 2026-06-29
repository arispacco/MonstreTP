import React, {useState, useEffect, useRef} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  TextInput,
  Image,
  PanResponder,
  Share,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {IconSymbol} from '../components/IconSymbol';
import {useAppTheme} from '../theme/ThemeProvider';
import {spacing, typography} from '../theme/theme';
import {useRoute} from '@react-navigation/native';
import {captureRef} from 'react-native-view-shot';
import {useAppConfig} from '../config/AppConfigProvider';
import {modifyImageViaAI} from '../services/api';

const tools = [
  {icon: 'text' as const, title: 'Text', type: 'text'},
  {icon: 'smile' as const, title: 'Emoji', type: 'emoji'},
  {icon: 'sticker' as const, title: 'Sticker', type: 'sticker'},
  {icon: 'image' as const, title: 'Image', type: 'image'},
  {icon: 'background' as const, title: 'Fond', type: 'background'},
  {icon: 'face' as const, title: 'Fusion', type: 'face_swap'},
];

type EditorLayer = {
  id: string;
  type: 'image' | 'text' | 'emoji' | 'sticker' | 'gif';
  label: string;
  uri?: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  color?: string;
  fontSize?: number;
};

const popularEmojis = ['😎', '😂', '😭', '😡', '😱', '🤔', '👍', '🔥', '👀', '💯', '💩', '🤡'];
const popularStickers = ['APPROVED', 'MIND BLOWN', 'BRUH', 'HOLD UP', 'NANI', 'STKS ONLY'];
const presetGradients = [
  ['#FF512F', '#DD2476'], // Sunset
  ['#1A2980', '#26D0CE'], // Ocean
  ['#11998e', '#38ef7d'], // Neon Green
  ['#833ab4', '#fd1d1d', '#fcb045'], // Purple Dream
  ['#09090e', '#1c1c28'], // Dark Minimal
];

export function AtelierScreen() {
  const {colors} = useAppTheme();
  const route = useRoute<any>();

  const [layers, setLayers] = useState<EditorLayer[]>([
    {
      id: 'text-1',
      type: 'text',
      label: 'TON MÈME ICI',
      x: 0,
      y: -40,
      scale: 1.2,
      rotation: 0,
      color: '#FFFFFF',
      fontSize: 24,
    },
  ]);
  const [selectedLayerId, setSelectedLayerId] = useState('text-1');
  const [backgroundIndex, setBackgroundIndex] = useState(0);
  const [backgroundPalette, setBackgroundPalette] = useState<string[]>(['#FF512F', '#DD2476']);
  const [backgroundImageUri, setBackgroundImageUri] = useState<string | null>(null);
  
  // Track active sub-tool panel in the toolbox
  const [activeTool, setActiveTool] = useState<string | null>(null);

  const {backendUrl} = useAppConfig();
  const [aiStickerPrompt, setAiStickerPrompt] = useState('');
  const [aiStickerLoading, setAiStickerLoading] = useState(false);
  const [aiModifyPrompt, setAiModifyPrompt] = useState('');
  const [aiModifyLoading, setAiModifyLoading] = useState(false);
  const [aiModifyError, setAiModifyError] = useState<string | null>(null);

  const [publishing, setPublishing] = useState(false);
  const [fusionImage1, setFusionImage1] = useState<string | null>(null);
  const [fusionImage2, setFusionImage2] = useState<string | null>(null);
  const [fusionLoading, setFusionLoading] = useState(false);
  const [fusionError, setFusionError] = useState<string | null>(null);

  function handleGenerateAISticker() {
    if (!aiStickerPrompt.trim()) return;
    setAiStickerLoading(true);
    try {
      const seed = Math.floor(Math.random() * 1000000);
      const enhancedPrompt = encodeURIComponent(
        aiStickerPrompt.trim() +
          ', beautiful die-cut cartoon sticker, white border, vector style, isolated background'
      );
      const stickerUrl = `https://image.pollinations.ai/prompt/${enhancedPrompt}?width=512&height=512&nologo=true&seed=${seed}`;
      addLayer('sticker', aiStickerPrompt.trim(), stickerUrl);
      setAiStickerPrompt('');
    } catch (err) {
      console.warn(err);
    } finally {
      setAiStickerLoading(false);
    }
  }

  async function handleModifyImageAI() {
    const layerToModify = layers.find(layer => layer.id === selectedLayerId);
    if (!layerToModify || !layerToModify.uri || !aiModifyPrompt.trim()) return;

    setAiModifyLoading(true);
    setAiModifyError(null);

    try {
      const result = await modifyImageViaAI(backendUrl, layerToModify.uri, aiModifyPrompt.trim());
      const seed = Math.floor(Math.random() * 1000000);
      const styleAppendix = layerToModify.type === 'sticker'
        ? ', cartoon sticker, white border, isolated background'
        : '';
      const enhancedPrompt = encodeURIComponent(result.prompt + styleAppendix);
      const newUri = `https://image.pollinations.ai/prompt/${enhancedPrompt}?width=512&height=512&nologo=true&seed=${seed}`;

      updateSelectedLayer({
        uri: newUri,
        label: aiModifyPrompt.trim()
      });
      setAiModifyPrompt('');
    } catch (err) {
      setAiModifyError(err instanceof Error ? err.message : String(err));
    } finally {
      setAiModifyLoading(false);
    }
  }

  async function pickFusionImage1() {
    launchImageLibrary({mediaType: 'photo', quality: 0.8}, response => {
      if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0];
        if (asset.uri) {
          setFusionImage1(asset.uri);
        }
      }
    });
  }

  async function pickFusionImage2() {
    launchImageLibrary({mediaType: 'photo', quality: 0.8}, response => {
      if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0];
        if (asset.uri) {
          setFusionImage2(asset.uri);
        }
      }
    });
  }

  async function handleFaceSwapAI() {
    if (!fusionImage1 || !fusionImage2) return;
    setFusionLoading(true);
    setFusionError(null);

    try {
      const img1Obj = {
        uri: fusionImage1,
        name: 'fusion1.jpg',
        type: 'image/jpeg',
      };
      const img2Obj = {
        uri: fusionImage2,
        name: 'fusion2.jpg',
        type: 'image/jpeg',
      };

      const result = await modifyImageViaAI(backendUrl, img1Obj, '', img2Obj);

      if (result && result.prompt) {
        const seed = Math.floor(Math.random() * 1000000);
        const enhancedPrompt = encodeURIComponent(
          result.prompt +
            ', beautiful die-cut cartoon sticker, white border, vector style, isolated background'
        );
        const stickerUrl = `https://image.pollinations.ai/prompt/${enhancedPrompt}?width=512&height=512&nologo=true&seed=${seed}`;
        addLayer('sticker', 'Fusion IA', stickerUrl);
        setFusionImage1(null);
        setFusionImage2(null);
        setActiveTool(null);
      } else {
        setFusionError('La fusion a échoué.');
      }
    } catch (err: any) {
      console.warn(err);
      setFusionError(err.message || 'La fusion a échoué.');
    } finally {
      setFusionLoading(false);
    }
  }

  async function exportSelectedSticker() {
    const selected = layers.find(layer => layer.id === selectedLayerId);
    if (!selected || !selected.uri) return;
    try {
      await Share.share({
        title: 'MemeAI Sticker',
        url: selected.uri,
        message: `Sticker créé avec l'IA MemeAI ! ${selected.uri}`,
      });
    } catch {
      Alert.alert('Partage échoué', 'Impossible d’exporter le sticker.');
    }
  }

  async function publishMeme() {
    if (!canvasRef.current) return;
    try {
      setPublishing(true);
      const uri = await captureRef(canvasRef, {
        format: 'png',
        quality: 0.9,
      });

      const {uploadMemeImage, publishMemeToGallery} = require('../services/api');
      const uploadResult = await uploadMemeImage(backendUrl, uri);

      const textLayer = layers.find(l => l.type === 'text');
      const caption = textLayer ? textLayer.label : 'Meme créé dans l’Atelier';

      await publishMemeToGallery(
        backendUrl,
        caption,
        'Atelier',
        uploadResult.url,
        'Artiste MemeAI'
      );

      Alert.alert('Publié !', 'Votre création a été ajoutée à la galerie publique.');
    } catch (err: any) {
      console.warn(err);
      Alert.alert('Échec de la publication', err.message || 'Impossible de publier le mème.');
    } finally {
      setPublishing(false);
    }
  }
  
  const canvasRef = useRef<View>(null);

  // Initialize with params from navigation
  useEffect(() => {
    if (route.params?.caption) {
      const nextLayers: EditorLayer[] = [];
      if (route.params.imageUri) {
        nextLayers.push({
          id: `image-${Date.now()}`,
          type: 'image',
          label: 'Photo',
          uri: route.params.imageUri,
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
        });
      }
      const textLayer: EditorLayer = {
        id: `text-${Date.now()}`,
        type: 'text',
        label: route.params.caption,
        x: 0,
        y: route.params.imageUri ? 80 : 0,
        scale: 1,
        rotation: 0,
        color: '#FFFFFF',
        fontSize: 22,
      };
      nextLayers.push(textLayer);
      setLayers(nextLayers);
      setSelectedLayerId(textLayer.id);

      if (route.params.palette) {
        setBackgroundPalette(route.params.palette);
        setBackgroundIndex(3);
      } else {
        setBackgroundIndex(0);
      }
    }
  }, [route.params]);

  function addLayer(type: 'image' | 'text' | 'emoji' | 'sticker' | 'gif', val?: string, uri?: string) {
    const defaultLabels = {
      image: 'Image',
      text: 'TEXTE',
      emoji: '😎',
      sticker: 'STICKER',
      gif: 'GIF',
    };

    const nextLayer: EditorLayer = {
      id: `${type}-${Date.now()}`,
      type,
      label: val || defaultLabels[type],
      uri,
      x: (layers.length % 3) * 15,
      y: (layers.length % 3) * 15,
      scale: 1,
      rotation: 0,
      color: '#FFFFFF',
      fontSize: type === 'emoji' ? 44 : 22,
    };

    setLayers(current => [...current, nextLayer]);
    setSelectedLayerId(nextLayer.id);
  }

  async function pickImageLayer() {
    launchImageLibrary({mediaType: 'photo', quality: 0.8}, response => {
      if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0];
        if (asset.uri) {
          addLayer('image', asset.fileName || 'Photo', asset.uri);
        }
      }
    });
  }

  async function pickBackgroundImage() {
    launchImageLibrary({mediaType: 'photo', quality: 0.8}, response => {
      if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0];
        if (asset.uri) {
          setBackgroundImageUri(asset.uri);
          setBackgroundIndex(4);
        }
      }
    });
  }

  function updateSelectedLayer(updates: Partial<EditorLayer>) {
    setLayers(current =>
      current.map(layer =>
        layer.id === selectedLayerId ? {...layer, ...updates} : layer,
      ),
    );
  }

  function deleteSelectedLayer() {
    setLayers(current => current.filter(layer => layer.id !== selectedLayerId));
    setSelectedLayerId('');
  }

  async function exportAndShareMeme() {
    try {
      if (!canvasRef.current) return;
      const uri = await captureRef(canvasRef, {
        format: 'png',
        quality: 0.9,
      });

      await Share.share({
        title: 'MemeAI',
        url: uri,
        message: 'Meme créé avec l’atelier MemeAI !',
      });
    } catch {
      Alert.alert('Exportation échouée', 'Impossible de capturer le canvas.');
    }
  }

  const selectedLayer = layers.find(layer => layer.id === selectedLayerId);

  return (
    <View style={[styles.screen, {backgroundColor: colors.background}]}>
      {/* Top Header */}
      <View style={[styles.topHeader, {borderBottomColor: colors.border}]}>
        <Text style={[styles.headerTitle, {color: colors.text}]}>Atelier</Text>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Publier le mème"
            onPress={publishMeme}
            disabled={publishing}
            style={({pressed}) => [
              styles.headerBtn,
              {backgroundColor: colors.success, marginRight: spacing.xs},
              publishing && {opacity: 0.6},
              pressed && styles.pressed,
            ]}>
            {publishing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <IconSymbol name="magic" color="#FFFFFF" size={16} />
                <Text style={styles.headerBtnText}>Publier</Text>
              </>
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Partager le mème"
            onPress={exportAndShareMeme}
            style={({pressed}) => [
              styles.headerBtn,
              {backgroundColor: colors.info},
              pressed && styles.pressed,
            ]}>
            <IconSymbol name="share" color="#FFFFFF" size={18} />
            <Text style={styles.headerBtnText}>Export</Text>
          </Pressable>
        </View>
      </View>

      {/* Canvas Area */}
      <View style={styles.canvasContainer}>
        <View
          ref={canvasRef}
          collapsable={false}
          style={[styles.canvasArea, {borderColor: colors.border}]}>
          
          {/* Background Render */}
          {backgroundIndex === 0 && (
            <View style={styles.checkerboard}>
              {Array.from({length: 120}).map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.checkerCell,
                    (Math.floor(index / 10) + index) % 2 === 0
                      ? styles.checkerCellA
                      : styles.checkerCellB,
                  ]}
                />
              ))}
            </View>
          )}

          {backgroundIndex === 1 && (
            <LinearGradient colors={presetGradients[0]} style={StyleSheet.absoluteFill} />
          )}

          {backgroundIndex === 2 && (
            <LinearGradient colors={presetGradients[1]} style={StyleSheet.absoluteFill} />
          )}

          {backgroundIndex === 3 && (
            <LinearGradient colors={backgroundPalette} style={StyleSheet.absoluteFill} />
          )}

          {backgroundIndex === 4 && backgroundImageUri && (
            <Image source={{uri: backgroundImageUri}} style={StyleSheet.absoluteFill} resizeMode="cover" />
          )}

          {/* Render Layers */}
          {layers.length === 0 ? (
            <View style={styles.canvasPlaceholderContainer}>
              <Text style={styles.canvasPlaceholder}>Atelier MemeAI</Text>
              <Text style={styles.canvasHint}>
                Ajoute du texte, un emoji ou une image pour commencer.
              </Text>
            </View>
          ) : (
            layers.map(layer => (
              <DraggableLayer
                key={layer.id}
                layer={layer}
                selected={selectedLayerId === layer.id}
                colors={colors}
                onSelect={() => setSelectedLayerId(layer.id)}
                onUpdate={updateSelectedLayer}
              />
            ))
          )}
        </View>
      </View>

      {/* Toolbox Panel */}
      <View style={[styles.toolbox, {backgroundColor: colors.card, borderTopColor: colors.border}]}>
        <View style={styles.dragHandle} />
        
        {/* Dynamic Tool Content */}
        {activeTool === 'text' && selectedLayer?.type === 'text' && (
          <View style={styles.toolSubPanel}>
            <View style={styles.subPanelHeader}>
              <Text style={[styles.subPanelTitle, {color: colors.text}]}>Modifier le Texte</Text>
              <Pressable onPress={() => setActiveTool(null)}>
                <IconSymbol name="close" color={colors.text} size={18} />
              </Pressable>
            </View>
            <TextInput
              value={selectedLayer.label}
              onChangeText={val => updateSelectedLayer({label: val})}
              style={[styles.textInput, {backgroundColor: colors.input, borderColor: colors.border, color: colors.text}]}
              placeholder="Écris ton texte..."
              placeholderTextColor={colors.placeholder}
            />
            {/* Color Selectors */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorRow}>
              {['#FFFFFF', '#000000', '#FFCC00', '#FF3B30', '#4CD964', '#007AFF', '#FF2D55'].map(c => (
                <Pressable
                  key={c}
                  onPress={() => updateSelectedLayer({color: c})}
                  style={[
                    styles.colorOption,
                    {backgroundColor: c, borderColor: selectedLayer.color === c ? colors.info : 'transparent'},
                  ]}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {activeTool === 'emoji' && (
          <View style={styles.toolSubPanel}>
            <View style={styles.subPanelHeader}>
              <Text style={[styles.subPanelTitle, {color: colors.text}]}>Ajouter un Emoji</Text>
              <Pressable onPress={() => setActiveTool(null)}>
                <IconSymbol name="close" color={colors.text} size={18} />
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiList}>
              {popularEmojis.map(emo => (
                <Pressable key={emo} onPress={() => addLayer('emoji', emo)} style={styles.emojiItem}>
                  <Text style={styles.emojiItemText}>{emo}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {activeTool === 'sticker' && (
          <View style={styles.toolSubPanel}>
            <View style={styles.subPanelHeader}>
              <Text style={[styles.subPanelTitle, {color: colors.text}]}>Ajouter un Sticker</Text>
              <Pressable onPress={() => setActiveTool(null)}>
                <IconSymbol name="close" color={colors.text} size={18} />
              </Pressable>
            </View>

            <View style={styles.aiStickerForm}>
              <TextInput
                placeholder="Créer par IA (ex: un singe astronaute)..."
                value={aiStickerPrompt}
                onChangeText={setAiStickerPrompt}
                style={[
                  styles.aiStickerInput,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: colors.input,
                  },
                ]}
                placeholderTextColor={colors.placeholder}
              />
              <Pressable
                onPress={handleGenerateAISticker}
                disabled={aiStickerLoading || !aiStickerPrompt.trim()}
                style={({pressed}) => [
                  styles.aiStickerBtn,
                  {backgroundColor: colors.info},
                  (aiStickerLoading || !aiStickerPrompt.trim()) && {opacity: 0.6},
                  pressed && styles.pressed,
                ]}>
                {aiStickerLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.aiStickerBtnText}>Créer</Text>
                )}
              </Pressable>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiList}>
              {popularStickers.map(stk => (
                <Pressable key={stk} onPress={() => addLayer('sticker', stk)} style={[styles.stickerItem, {backgroundColor: colors.input}]}>
                  <Text style={[styles.stickerItemText, {color: colors.text}]}>{stk}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {activeTool === 'background' && (
          <View style={styles.toolSubPanel}>
            <View style={styles.subPanelHeader}>
              <Text style={[styles.subPanelTitle, {color: colors.text}]}>Fond d'écran</Text>
              <Pressable onPress={() => setActiveTool(null)}>
                <IconSymbol name="close" color={colors.text} size={18} />
              </Pressable>
            </View>
            <View style={styles.bgOptions}>
              <Pressable onPress={() => setBackgroundIndex(0)} style={[styles.bgOptionBtn, {backgroundColor: colors.input}]}>
                <Text style={{color: colors.text, fontSize: 13}}>Quadrillé</Text>
              </Pressable>
              <Pressable onPress={() => setBackgroundIndex(1)} style={[styles.bgOptionBtn, {backgroundColor: colors.input}]}>
                <Text style={{color: colors.text, fontSize: 13}}>Sunset</Text>
              </Pressable>
              <Pressable onPress={() => setBackgroundIndex(2)} style={[styles.bgOptionBtn, {backgroundColor: colors.input}]}>
                <Text style={{color: colors.text, fontSize: 13}}>Ocean</Text>
              </Pressable>
              <Pressable onPress={pickBackgroundImage} style={[styles.bgOptionBtn, {backgroundColor: colors.info}]}>
                <Text style={{color: '#FFFFFF', fontSize: 13}}>Importer Image</Text>
              </Pressable>
            </View>
          </View>
        )}

        {activeTool === 'face_swap' && (
          <View style={styles.toolSubPanel}>
            <View style={styles.subPanelHeader}>
              <Text style={[styles.subPanelTitle, {color: colors.text}]}>Fusion Visage / Contexte</Text>
              <Pressable onPress={() => setActiveTool(null)}>
                <IconSymbol name="close" color={colors.text} size={18} />
              </Pressable>
            </View>

            <View style={styles.swapInputsContainer}>
              <View style={styles.swapInputBlock}>
                <Text style={[styles.swapInputLabel, {color: colors.textMuted}]}>1. Scene / Fond</Text>
                {fusionImage1 ? (
                  <Image source={{uri: fusionImage1}} style={styles.swapInputThumb} />
                ) : (
                  <View style={[styles.swapInputPlaceholder, {backgroundColor: colors.input}]} />
                )}
                <Pressable
                  onPress={pickFusionImage1}
                  style={({pressed}) => [styles.pickSwapBtn, {backgroundColor: colors.info}, pressed && styles.pressed]}
                >
                  <Text style={styles.pickSwapBtnText}>Choisir</Text>
                </Pressable>
              </View>

              <View style={styles.swapInputBlock}>
                <Text style={[styles.swapInputLabel, {color: colors.textMuted}]}>2. Visage / Sujet</Text>
                {fusionImage2 ? (
                  <Image source={{uri: fusionImage2}} style={styles.swapInputThumb} />
                ) : (
                  <View style={[styles.swapInputPlaceholder, {backgroundColor: colors.input}]} />
                )}
                <Pressable
                  onPress={pickFusionImage2}
                  style={({pressed}) => [styles.pickSwapBtn, {backgroundColor: colors.info}, pressed && styles.pressed]}
                >
                  <Text style={styles.pickSwapBtnText}>Choisir</Text>
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={handleFaceSwapAI}
              disabled={fusionLoading || !fusionImage1 || !fusionImage2}
              style={({pressed}) => [
                styles.fusionActionBtn,
                {backgroundColor: colors.success},
                (fusionLoading || !fusionImage1 || !fusionImage2) && {opacity: 0.6},
                pressed && styles.pressed
              ]}
            >
              {fusionLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.fusionActionBtnText}>Fusionner par IA</Text>
              )}
            </Pressable>
            {fusionError ? <Text style={styles.fusionError}>{fusionError}</Text> : null}
          </View>
        )}

        {/* Selected Layer Controls (Rot/Scale) */}
        {selectedLayer && !activeTool && (
          <View style={styles.adjustPanel}>
            <View style={styles.subPanelHeader}>
              <Text style={[styles.subPanelTitle, {color: colors.text}]}>
                Ajuster : {selectedLayer.type.toUpperCase()}
              </Text>
              {selectedLayer.type === 'text' && (
                <Pressable onPress={() => setActiveTool('text')} style={[styles.editPill, {backgroundColor: colors.input}]}>
                  <Text style={{color: colors.text, fontSize: 12}}>Modifier Texte</Text>
                </Pressable>
              )}
            </View>
            <View style={styles.rangeRow}>
              <RangeAdjuster
                label="Taille"
                value={selectedLayer.scale}
                min={0.4}
                max={3.5}
                step={0.15}
                onChange={val => updateSelectedLayer({scale: val})}
                colors={colors}
              />
              <RangeAdjuster
                label="Rotation"
                value={selectedLayer.rotation}
                min={-180}
                max={180}
                step={10}
                onChange={val => updateSelectedLayer({rotation: val})}
                colors={colors}
              />
            </View>

            {selectedLayer.uri && (
              <View style={[styles.aiModifyContainer, {borderTopColor: colors.border}]}>
                <Text style={[styles.aiModifyLabel, {color: colors.textMuted}]}>Modifier par IA :</Text>
                <View style={styles.aiModifyForm}>
                  <TextInput
                    placeholder="Consigne (ex: ajoute des lunettes)..."
                    value={aiModifyPrompt}
                    onChangeText={setAiModifyPrompt}
                    style={[
                      styles.aiModifyInput,
                      {
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: colors.input,
                      },
                    ]}
                    placeholderTextColor={colors.placeholder}
                  />
                  <Pressable
                    onPress={handleModifyImageAI}
                    disabled={aiModifyLoading || !aiModifyPrompt.trim()}
                    style={({pressed}) => [
                      styles.aiModifyBtn,
                      {backgroundColor: colors.info},
                      (aiModifyLoading || !aiModifyPrompt.trim()) && {opacity: 0.6},
                      pressed && styles.pressed,
                    ]}>
                    {aiModifyLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.aiModifyBtnText}>Modifier</Text>
                    )}
                  </Pressable>
                </View>
                {aiModifyError ? <Text style={styles.aiModifyError}>{aiModifyError}</Text> : null}

                <View style={{marginTop: spacing.md}}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Exporter ce sticker uniquement"
                    onPress={exportSelectedSticker}
                    style={({pressed}) => [
                      styles.exportStickerBtn,
                      {backgroundColor: colors.input, borderColor: colors.border},
                      pressed && styles.pressed,
                    ]}>
                    <IconSymbol name="share" color={colors.text} size={15} />
                    <Text style={{color: colors.text, fontSize: 13, fontWeight: '600', marginLeft: spacing.xs}}>
                      Exporter ce Sticker uniquement
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Main Toolbar Tabs */}
        {!activeTool && (
          <View style={styles.toolTabs}>
            {tools.map(tool => (
              <Pressable
                key={tool.title}
                accessibilityRole="button"
                accessibilityLabel={tool.title}
                onPress={() => {
                  if (tool.type === 'image') {
                    pickImageLayer();
                  } else {
                    setActiveTool(tool.type);
                  }
                }}
                style={({pressed}) => [styles.toolTabButton, pressed && styles.pressed]}>
                <View style={[styles.tabIconBox, {backgroundColor: colors.input}]}>
                  <IconSymbol name={tool.icon} color={colors.text} size={22} />
                </View>
                <Text style={[styles.tabTitle, {color: colors.text}]}>{tool.title}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Status Bar Controls */}
        <View style={[styles.statusBar, {borderTopColor: colors.border}]}>
          <View style={styles.statusLabelWrap}>
            <Text style={[styles.statusTitle, {color: colors.text}]} numberOfLines={1}>
              {selectedLayer ? selectedLayer.label : 'Nouveau mème'}
            </Text>
            <Text style={[styles.statusText, {color: colors.textMuted}]}>
              {selectedLayer ? 'Faites glisser pour déplacer' : 'Sélectionnez un élément'}
            </Text>
          </View>
          <View style={styles.statusActions}>
            {selectedLayer ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Supprimer le calque"
                onPress={deleteSelectedLayer}
                style={({pressed}) => [
                  styles.actionPill,
                  {backgroundColor: colors.danger},
                  pressed && styles.pressed,
                ]}>
                <IconSymbol name="close" color="#FFFFFF" size={16} />
                <Text style={styles.actionPillText}>Suppr.</Text>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ajouter du texte"
                onPress={() => addLayer('text')}
                style={({pressed}) => [
                  styles.actionPill,
                  {backgroundColor: colors.info},
                  pressed && styles.pressed,
                ]}>
                <IconSymbol name="import" color="#FFFFFF" size={16} />
                <Text style={styles.actionPillText}>Texte</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

function DraggableLayer({
  layer,
  selected,
  colors,
  onSelect,
  onUpdate,
}: {
  layer: EditorLayer;
  selected: boolean;
  colors: any;
  onSelect: () => void;
  onUpdate: (updated: Partial<EditorLayer>) => void;
}) {
  const startPos = useRef({x: 0, y: 0});

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        onSelect();
        startPos.current = {x: layer.x, y: layer.y};
      },
      onPanResponderMove: (evt, gestureState) => {
        onUpdate({
          x: startPos.current.x + gestureState.dx,
          y: startPos.current.y + gestureState.dy,
        });
      },
    }),
  ).current;

  return (
    <View
      {...panResponder.panHandlers}
      style={[
        styles.layerContainer,
        {
          transform: [
            {translateX: layer.x},
            {translateY: layer.y},
            {scale: layer.scale},
            {rotate: `${layer.rotation}deg`},
          ],
          borderColor: selected ? colors.info : 'transparent',
          borderWidth: selected ? 2 : 0,
        },
      ]}>
      {layer.uri ? (
        <Image source={{uri: layer.uri}} style={styles.layerImage} />
      ) : (
        <Text
          style={[
            styles.layerText,
            {
              color: layer.color || '#FFFFFF',
              fontSize: layer.fontSize || 22,
            },
          ]}>
          {layer.label}
        </Text>
      )}
    </View>
  );
}

function RangeAdjuster({
  label,
  value,
  min,
  max,
  step,
  onChange,
  colors,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
  colors: any;
}) {
  return (
    <View style={styles.adjusterRow}>
      <Text style={[styles.adjusterLabel, {color: colors.textMuted}]}>{label}</Text>
      <View style={styles.adjusterControls}>
        <Pressable
          onPress={() => onChange(Math.max(min, value - step))}
          style={({pressed}) => [styles.adjusterBtn, {backgroundColor: colors.input}, pressed && styles.pressed]}>
          <Text style={[styles.adjusterBtnText, {color: colors.text}]}>-</Text>
        </Pressable>
        <Text style={[styles.adjusterValue, {color: colors.text}]}>{value.toFixed(1)}</Text>
        <Pressable
          onPress={() => onChange(Math.min(max, value + step))}
          style={({pressed}) => [styles.adjusterBtn, {backgroundColor: colors.input}, pressed && styles.pressed]}>
          <Text style={[styles.adjusterBtnText, {color: colors.text}]}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topHeader: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
  },
  headerTitle: {
    ...typography.h2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    height: 36,
    borderRadius: 18,
  },
  headerBtnText: {
    ...typography.label,
    color: '#FFFFFF',
    fontSize: 13,
  },
  canvasContainer: {
    flex: 1,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvasArea: {
    width: '100%',
    aspectRatio: 1,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  checkerboard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  checkerCell: {
    width: '10%',
    aspectRatio: 1,
  },
  checkerCellA: {
    backgroundColor: '#1E1E24',
  },
  checkerCellB: {
    backgroundColor: '#15151A',
  },
  canvasPlaceholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  canvasPlaceholder: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: '#000000',
    textShadowRadius: 6,
  },
  canvasHint: {
    ...typography.caption,
    color: '#D5D5DC',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  layerContainer: {
    position: 'absolute',
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  layerImage: {
    width: 140,
    height: 100,
    resizeMode: 'contain',
  },
  layerText: {
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: '#000000',
    textShadowRadius: 6,
    textShadowOffset: {width: 1, height: 1},
  },
  toolbox: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#4E4E5A',
    borderRadius: 2,
    alignSelf: 'center',
    marginVertical: spacing.md,
  },
  toolTabs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: spacing.md,
  },
  toolTabButton: {
    alignItems: 'center',
    flex: 1,
  },
  tabIconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  tabTitle: {
    ...typography.caption,
    fontSize: 12,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    marginTop: spacing.md,
  },
  statusLabelWrap: {
    flex: 1,
  },
  statusTitle: {
    ...typography.label,
    fontSize: 14,
  },
  statusText: {
    ...typography.caption,
    fontSize: 11,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    height: 36,
    borderRadius: 18,
  },
  actionPillText: {
    ...typography.label,
    color: '#FFFFFF',
    fontSize: 12,
  },
  statusActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  toolSubPanel: {
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  subPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subPanelTitle: {
    ...typography.label,
    fontSize: 14,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    height: 46,
    paddingHorizontal: spacing.lg,
    fontSize: 15,
  },
  colorRow: {
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
  },
  emojiList: {
    gap: spacing.md,
  },
  emojiItem: {
    padding: spacing.md,
  },
  emojiItemText: {
    fontSize: 32,
  },
  stickerItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  stickerItemText: {
    fontWeight: '800',
    fontSize: 14,
  },
  bgOptions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  bgOptionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustPanel: {
    paddingVertical: spacing.md,
  },
  editPill: {
    paddingHorizontal: spacing.lg,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.md,
  },
  adjusterRow: {
    flex: 1,
    gap: spacing.sm,
  },
  adjusterLabel: {
    ...typography.caption,
    fontSize: 12,
  },
  adjusterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  adjusterBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjusterBtnText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  adjusterValue: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  aiStickerForm: {
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  aiStickerInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    fontSize: 13,
  },
  aiStickerBtn: {
    paddingHorizontal: spacing.md,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiStickerBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  aiModifyContainer: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    marginTop: spacing.md,
    width: '100%',
  },
  aiModifyLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  aiModifyForm: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  aiModifyInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    fontSize: 13,
  },
  aiModifyBtn: {
    paddingHorizontal: spacing.md,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiModifyBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  aiModifyError: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: spacing.xs,
  },
  exportStickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
  },
  swapInputsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: spacing.md,
    gap: spacing.md,
  },
  swapInputBlock: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  swapInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  swapInputThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },
  swapInputPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#AAAAAA',
  },
  pickSwapBtn: {
    height: 28,
    paddingHorizontal: spacing.md,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  pickSwapBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  fusionActionBtn: {
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: spacing.sm,
  },
  fusionActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  fusionError: {
    color: '#FF3B30',
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
