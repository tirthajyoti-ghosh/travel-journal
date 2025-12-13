import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { SyncStatus } from '@/services/syncService';

interface SyncStatusBarProps {
  visible: boolean;
  status: SyncStatus;
}

/**
 * WhatsApp-style sync status bar
 * Shows at the top of the screen when syncing
 */
export function SyncStatusBar({ visible, status }: SyncStatusBarProps) {
  const insets = useSafeAreaInsets();
  const BAR_HEIGHT = 32;
  const translateY = useSharedValue(-(BAR_HEIGHT + insets.top));

  useEffect(() => {
    if (visible) {
      // Slide down to just below status bar
      translateY.value = withTiming(insets.top, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
    } else {
      // Slide up above status bar
      translateY.value = withTiming(-(BAR_HEIGHT + insets.top), {
        duration: 300,
        easing: Easing.in(Easing.ease),
      });
    }
  }, [visible, insets.top]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const getMessage = () => {
    switch (status) {
      case 'syncing':
        return 'Syncing stories...';
      case 'success':
        return 'Synced';
      case 'error':
        return 'Sync failed';
      default:
        return '';
    }
  };

  const getBackgroundColor = () => {
    switch (status) {
      case 'syncing':
        return colors.accent + '20'; // Accent with 20% opacity
      case 'success':
        return '#4CAF50' + '20'; // Green with 20% opacity
      case 'error':
        return '#F44336' + '20'; // Red with 20% opacity
      default:
        return colors.lines;
    }
  };

  return (
    <Animated.View style={[styles.container, animatedStyle, { backgroundColor: getBackgroundColor() }]}>
      <View style={styles.content}>
        {status === 'syncing' && (
          <ActivityIndicator size="small" color={colors.accent} style={styles.spinner} />
        )}
        <Text style={styles.text}>{getMessage()}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    borderBottomWidth: 1,
    borderBottomColor: colors.lines,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginRight: 8,
  },
  text: {
    fontFamily: typography.fonts.caption,
    fontSize: 12,
    color: colors.text,
    opacity: 0.8,
  },
});
