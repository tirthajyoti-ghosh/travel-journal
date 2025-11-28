import { View, Text, StyleSheet, TouchableOpacity, Image, ImageSourcePropType } from 'react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

interface EmptyStateProps {
  icon: ImageSourcePropType;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  iconSize?: number;
}

export function EmptyState({ 
  icon, 
  title, 
  subtitle, 
  actionLabel, 
  onAction,
  iconSize = 140 
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Image 
        source={icon} 
        style={[styles.icon, { width: iconSize, height: iconSize }]}
        resizeMode="contain"
      />
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.button} onPress={onAction}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  icon: {
    opacity: 0.35,
    marginBottom: 24,
  },
  title: {
    fontFamily: typography.fonts.display,
    fontSize: 22,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: typography.fonts.body,
    fontSize: 15,
    color: colors.text,
    opacity: 0.6,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontFamily: typography.fonts.ui,
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent,
  },
});
