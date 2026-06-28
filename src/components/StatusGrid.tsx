import React from 'react';
import {FlatList, Image, Pressable, StyleSheet, Text, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {colors, radii, rainbow, spacing, typography} from '../theme/theme';
import {IconSymbol} from './IconSymbol';

export type StatusItem = {
  id: string;
  label: string;
  type: 'image' | 'video';
  colors: string[];
  uri?: string;
};

type StatusGridProps = {
  data: StatusItem[];
  onSelect: (item: StatusItem) => void;
};

export function StatusGrid({data, onSelect}: StatusGridProps) {
  return (
    <FlatList
      data={data}
      keyExtractor={item => item.id}
      numColumns={2}
      scrollEnabled={false}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.list}
      renderItem={({item}) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Choisir ${item.label}`}
          onPress={() => onSelect(item)}
          style={({pressed}) => [styles.cell, pressed && styles.pressed]}>
          {item.uri ? (
            <Image source={{uri: item.uri}} style={styles.tileImage} />
          ) : (
            <LinearGradient colors={item.colors} style={styles.tile}>
              <View style={styles.tileTop}>
                <Text style={styles.tileLabel}>{item.label}</Text>
                {item.type === 'video' ? (
                  <View style={styles.videoBadge}>
                    <IconSymbol name="video" color="#FFFFFF" size={14} />
                  </View>
                ) : undefined}
              </View>
              <Text style={styles.mockImage}>MemeAI</Text>
            </LinearGradient>
          )}
          {item.uri && item.type === 'video' ? (
            <View style={styles.videoBadgeOverlay}>
              <IconSymbol name="video" color="#FFFFFF" size={14} />
            </View>
          ) : undefined}
        </Pressable>
      )}
      ListFooterComponent={<View style={styles.footerLine} />}
    />
  );
}

export const mockStatuses: StatusItem[] = [
  {id: '1', label: 'Statut 1', type: 'image', colors: [colors.danger, colors.orange]},
  {id: '2', label: 'Statut 2', type: 'image', colors: [colors.info, colors.blue]},
  {id: '3', label: 'Statut 3', type: 'image', colors: [colors.success, colors.info]},
  {id: '4', label: 'Statut 4', type: 'video', colors: [colors.violet, colors.pink]},
  {id: '5', label: 'Statut 5', type: 'image', colors: rainbow},
  {id: '6', label: 'Statut 6', type: 'video', colors: [colors.warning, colors.danger]},
];

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
  },
  row: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.input,
  },
  tileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  tile: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tileLabel: {
    ...typography.micro,
    color: colors.text,
  },
  videoBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoBadgeOverlay: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockImage: {
    ...typography.h2,
    color: colors.text,
    opacity: 0.88,
    alignSelf: 'center',
  },
  pressed: {
    opacity: 0.8,
    transform: [{scale: 0.98}],
  },
  footerLine: {
    height: 1,
  },
});
