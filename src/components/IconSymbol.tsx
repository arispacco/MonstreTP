import React from 'react';
import {StyleSheet, Text, TextStyle} from 'react-native';
import {useAppTheme} from '../theme/ThemeProvider';

const iconMap = {
  zap: '⚡',
  download: '⬇',
  share: '↗',
  smile: '◉',
  video: '▶',
  folder: '▣',
  close: '×',
  context: '✎',
  atelier: '✂',
  social: '◎',
  settings: '⚙',
  camera: '▧',
  mic: '●',
  import: '＋',
  magic: '✦',
  check: '✓',
  home: '⌂',
  moon: '☾',
  sun: '☀',
  image: '▨',
  text: 'T',
  sticker: '◰',
  gif: 'GIF',
  background: '▥',
  face: '☺',
} as const;

export type IconName = keyof typeof iconMap;

type IconSymbolProps = {
  name: IconName;
  size?: number;
  color?: string;
  style?: TextStyle;
};

export function IconSymbol({name, size = 22, color, style}: IconSymbolProps) {
  const {colors} = useAppTheme();

  return (
    <Text
      allowFontScaling={false}
      style={[
        styles.icon,
        {fontSize: size, lineHeight: size + 2, color: color ?? colors.text},
        style,
      ]}>
      {iconMap[name]}
    </Text>
  );
}

const styles = StyleSheet.create({
  icon: {
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
