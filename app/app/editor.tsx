import { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import Feather from '@expo/vector-icons/Feather';
import * as storageService from '@/services/storageService';
import { MediaPicker } from '@/components/MediaPicker';

export default function EditorScreen() {
  const { storyId } = useLocalSearchParams<{ storyId?: string }>();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [mediaItemIds, setMediaItemIds] = useState<string[]>([]);
  const [albumId, setAlbumId] = useState<string | undefined>();
  const [albumShareUrl, setAlbumShareUrl] = useState<string | undefined>();

  useEffect(() => {
    if (storyId) {
      loadStory();
    }
  }, [storyId]);

  const loadStory = async () => {
    if (!storyId) return;
    try {
      const story = await storageService.getStory(storyId);
      if (story) {
        setTitle(story.title);
        setContent(story.content);
        setLocation(story.location);
        setMediaItemIds(story.mediaItemIds || []);
        setAlbumId(story.albumId);
        setAlbumShareUrl(story.albumShareUrl);
      }
    } catch (error) {
      console.error('Failed to load story:', error);
      Alert.alert('Error', 'Failed to load story');
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please add a title to your story');
      return;
    }

    setLoading(true);
    try {
      await storageService.saveStory({
        id: storyId,
        title: title.trim(),
        content: content.trim(),
        location: location.trim() || 'Unknown Location',
        isDraft: true,
        mediaItemIds,
        albumId,
        albumShareUrl,
      });
      router.back();
    } catch (error) {
      console.error('Failed to save story:', error);
      Alert.alert('Error', 'Failed to save story. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMediaSelected = (items: string[], album: string, shareUrl: string) => {
    setMediaItemIds(items);
    setAlbumId(album);
    setAlbumShareUrl(shareUrl);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveText}>{loading ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollContent}>
          <TextInput
            style={styles.titleInput}
            placeholder="Story Title..."
            placeholderTextColor={colors.lines}
            value={title}
            onChangeText={setTitle}
            multiline
          />
          
          <View style={styles.metaContainer}>
            <TextInput
              style={styles.metaInput}
              placeholder="Location (e.g., Bangkok, Thailand)"
              placeholderTextColor={colors.lines}
              value={location}
              onChangeText={setLocation}
            />
            <Text style={styles.metaText}>
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>

          <TextInput
            style={styles.contentInput}
            placeholder="Start writing..."
            placeholderTextColor={colors.lines}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
        </ScrollView>

        <View style={styles.toolbar}>
          <MediaPicker onMediaSelected={handleMediaSelected} />
          {mediaItemIds.length > 0 && (
            <Text style={styles.mediaCount}>
              {mediaItemIds.length} {mediaItemIds.length === 1 ? 'photo' : 'photos'} selected
            </Text>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  saveButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveText: {
    color: colors.white,
    fontFamily: typography.fonts.ui,
    fontSize: 14,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  titleInput: {
    fontFamily: typography.fonts.display,
    fontSize: 32,
    color: colors.text,
    marginBottom: 8,
  },
  metaContainer: {
    marginBottom: 24,
    gap: 8,
  },
  metaInput: {
    fontFamily: typography.fonts.caption,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.polaroidFrame,
    borderRadius: 8,
  },
  metaText: {
    fontFamily: typography.fonts.caption,
    fontSize: 14,
    color: colors.text,
    opacity: 0.6,
  },
  contentInput: {
    fontFamily: typography.fonts.body,
    fontSize: 18,
    color: colors.text,
    lineHeight: 28,
    minHeight: 300,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: colors.lines,
  },
  toolbarButton: {
    padding: 8,
  },
  mediaCount: {
    fontFamily: typography.fonts.caption,
    fontSize: 12,
    color: colors.text,
    opacity: 0.6,
  },
});
