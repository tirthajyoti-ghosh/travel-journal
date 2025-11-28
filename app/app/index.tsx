import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, ActionSheetIOS, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { StoryCard } from '@/components/StoryCard';
import { EmptyState } from '@/components/EmptyState';
import { Story } from '@/types';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { useNetworkStatus } from '@/hooks/use-network-status';
import Feather from '@expo/vector-icons/Feather';
import * as storageService from '@/services/storageService';
import * as githubService from '@/services/githubService';

export default function HomeScreen() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOffline } = useNetworkStatus();

  const loadStories = async () => {
    setLoading(true);
    try {
      const loadedStories = await storageService.getStories();
      // Filter out archived stories
      const visible = loadedStories.filter(s => !s.archived);
      // Sort by updatedAt descending (newest first)
      const sorted = visible.sort((a, b) => 
        new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()
      );
      setStories(sorted);
    } catch (error) {
      console.error('Failed to load stories:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load stories when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadStories();
    }, [])
  );

  const handleDeleteStory = async (story: Story) => {
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
                  await loadStories();
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
                await loadStories();
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

  const handleLongPress = (story: Story) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Edit', story.isPublished && !story.isDraft ? 'Archive' : 'Delete'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            // Edit
            if (story.isDraft) {
              router.push({ pathname: '/editor', params: { storyId: story.id }});
            } else {
              router.push(`/viewer/${story.id}`);
            }
          } else if (buttonIndex === 2) {
            // Delete/Archive
            handleDeleteStory(story);
          }
        }
      );
    } else {
      // Android fallback with Alert
      Alert.alert(
        story.title,
        'What would you like to do?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Edit', 
            onPress: () => {
              if (story.isDraft) {
                router.push({ pathname: '/editor', params: { storyId: story.id }});
              } else {
                router.push(`/viewer/${story.id}`);
              }
            }
          },
          { 
            text: story.isPublished && !story.isDraft ? 'Archive' : 'Delete',
            style: 'destructive',
            onPress: () => handleDeleteStory(story)
          }
        ]
      );
    }
  };

  const renderEmptyState = () => (
    <EmptyState
      icon={require('@/assets/doodles/Plane.png')}
      title="Your travel stories will live here"
      subtitle="Tap + below to start writing"
      iconSize={140}
    />
  );

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
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Your Travel Stories</Text>
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={() => router.push('/settings')}
            >
              <Feather name="settings" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={stories}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <StoryCard 
                story={item} 
                onPress={() => {
                  // Drafts go to editor, published go to viewer
                  if (item.isDraft) {
                    router.push({ pathname: '/editor', params: { storyId: item.id }});
                  } else {
                    router.push(`/viewer/${item.id}`);
                  }
                }}
                onLongPress={() => handleLongPress(item)}
              />
            )}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmptyState}
          />

          <TouchableOpacity 
            style={styles.fab} 
            onPress={() => router.push('/editor')}
          >
            <Feather name="plus" size={32} color={colors.white} />
          </TouchableOpacity>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 10,
  },
  headerTitle: {
    fontFamily: typography.fonts.display,
    fontSize: 36,
    color: colors.text,
  },
  settingsButton: {
    padding: 8,
  },
  listContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
});
