import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Alert, ActionSheetIOS, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { WebView } from 'react-native-webview';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { getViewerHTML } from '@/theme/editorStyles';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { EmptyState } from '@/components/EmptyState';
import Feather from '@expo/vector-icons/Feather';
import * as storageService from '@/services/storageService';
import * as githubService from '@/services/githubService';
import { Story } from '@/types';

export default function ViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [webViewHeight, setWebViewHeight] = useState(400);
  const { isOffline } = useNetworkStatus();

  const loadStory = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const loadedStory = await storageService.getStory(id);
      setStory(loadedStory);
    } catch (error) {
      console.error('Failed to load story:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reload story when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadStory();
    }, [id])
  );

  const handleDeleteStory = async () => {
    if (!story) return;

    if (story.isPublished && !story.isDraft) {
      // Published story - archive on GitHub if online
      if (isOffline) {
        Alert.alert(
          'Offline',
          'You need to be online to archive published stories.',
          [{ text: 'OK' }]
        );
        return;
      }

      Alert.alert(
        'Archive Story',
        'This will mark the story as archived on GitHub. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Archive', 
            style: 'destructive',
            onPress: async () => {
              try {
                const result = await githubService.archiveStory(story);
                if (result.success) {
                  // Update local storage
                  const updatedStory = {
                    ...story,
                    archived: true,
                    archivedAt: new Date().toISOString(),
                  };
                  await storageService.saveStory(updatedStory);
                  router.back();
                  Alert.alert('Success', 'Story archived successfully');
                } else {
                  Alert.alert('Error', result.error || 'Failed to archive story');
                }
              } catch (error) {
                Alert.alert('Error', 'Failed to archive story');
                console.error('Archive error:', error);
              }
            }
          }
        ]
      );
    } else {
      // Draft - simple local deletion
      Alert.alert(
        'Delete Draft',
        'This will permanently delete this draft. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive',
            onPress: async () => {
              try {
                await storageService.deleteStory(story.id);
                router.back();
              } catch (error) {
                Alert.alert('Error', 'Failed to delete draft');
                console.error('Delete error:', error);
              }
            }
          }
        ]
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!story) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Feather name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.errorContainer}>
            <EmptyState
              icon={require('@/assets/doodles/Map.png')}
              title="Story not found"
              subtitle="This story may have been deleted"
              actionLabel="Go Back"
              onAction={() => router.back()}
              iconSize={120}
            />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteStory}>
            <Feather name="archive" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollContent}>
          <Text style={styles.title}>{story.title}</Text>
          <Text style={styles.meta}>{story.date} • {story.location}</Text>
          
          {story.albumShareUrl && (
            <TouchableOpacity 
              style={styles.photoButton}
              onPress={() => Linking.openURL(story.albumShareUrl!)}
            >
              <Feather name="image" size={20} color={colors.white} />
              <Text style={styles.photoButtonText}>View Album Photos</Text>
            </TouchableOpacity>
          )}
          
          <View style={styles.contentContainer}>
            <WebView
              originWhitelist={['*']}
              source={{ html: getViewerHTML(story.content) }}
              style={[styles.webview, { height: webViewHeight }]}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
              onMessage={(event) => {
                try {
                  const data = JSON.parse(event.nativeEvent.data);
                  if (data.height) {
                    setWebViewHeight(data.height + 20);
                  }
                } catch (e) {
                  console.error('Error parsing WebView message:', e);
                }
              }}
            />
          </View>
        </ScrollView>

        {/* Edit FAB */}
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => router.push({ pathname: '/editor', params: { storyId: id } })}
        >
          <Feather name="edit-2" size={24} color={colors.white} />
        </TouchableOpacity>
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
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontFamily: typography.fonts.body,
    fontSize: 16,
    color: colors.text,
    opacity: 0.6,
  },
  title: {
    fontFamily: typography.fonts.display,
    fontSize: 32,
    color: colors.text,
    marginBottom: 8,
  },
  meta: {
    fontFamily: typography.fonts.caption,
    fontSize: 14,
    color: colors.text,
    opacity: 0.6,
    marginBottom: 24,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  photoButtonText: {
    color: colors.white,
    fontFamily: typography.fonts.ui,
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  contentContainer: {
    width: '100%',
  },
  webview: {
    backgroundColor: 'transparent',
  },
});
