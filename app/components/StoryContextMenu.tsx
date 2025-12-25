import { View, Text, StyleSheet, TouchableOpacity, Modal, TouchableWithoutFeedback, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { PencilSimpleIcon, ArchiveIcon, ArrowCounterClockwiseIcon, TrashIcon } from 'phosphor-react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

interface StoryContextMenuProps {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
  isPublished: boolean;
  isArchived?: boolean;
  position?: { x: number; y: number };
}

export function StoryContextMenu({
  visible,
  onClose,
  onEdit,
  onDelete,
  onArchive,
  onUnarchive,
  isPublished,
  isArchived,
  position,
}: StoryContextMenuProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.menu,
                {
                  transform: [{ scale: scaleAnim }],
                  top: position?.y || 200,
                  left: position?.x ? position.x - 200 : 20,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  onEdit();
                  onClose();
                }}
              >
                <PencilSimpleIcon size={20} color={colors.text} />
                <Text style={styles.menuItemText}>Edit</Text>
              </TouchableOpacity>

              <View style={styles.separator} />

              {isPublished && !isArchived && onArchive && (
                <>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      onArchive();
                      onClose();
                    }}
                  >
                    <ArchiveIcon size={20} color={colors.text} />
                    <Text style={styles.menuItemText}>Archive</Text>
                  </TouchableOpacity>
                  <View style={styles.separator} />
                </>
              )}

              {isArchived && onUnarchive && (
                <>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      onUnarchive();
                      onClose();
                    }}
                  >
                    <ArrowCounterClockwiseIcon size={20} color={colors.text} />
                    <Text style={styles.menuItemText}>Unarchive</Text>
                  </TouchableOpacity>
                  <View style={styles.separator} />
                </>
              )}

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  onDelete();
                  onClose();
                }}
              >
                <TrashIcon size={20} color={colors.error} />
                <Text style={[styles.menuItemText, { color: colors.error }]}>
                  {isPublished ? 'Delete Local' : 'Delete'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  menu: {
    position: 'absolute',
    width: 200,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: colors.lines,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemText: {
    fontFamily: typography.fonts.ui,
    fontSize: 16,
    color: colors.text,
  },
  deleteText: {
    color: '#E74C3C',
  },
  separator: {
    height: 1,
    backgroundColor: colors.lines,
    marginHorizontal: 8,
  },
});
