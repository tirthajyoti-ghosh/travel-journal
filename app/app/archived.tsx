import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { StoryCard } from '@/components/StoryCard';
import { EmptyState } from '@/components/EmptyState';
import { StoryContextMenu } from '@/components/StoryContextMenu';
import { Story } from '@/types';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import Feather from '@expo/vector-icons/Feather';
import * as storageService from '@/services/storageService';
import * as githubService from '@/services/githubService';

export default function ArchivedScreen() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const loadStories = async () => {
    setLoading(true);
    try {
      const loadedStories = await storageService.getStories();
      const archived = loadedStories.filter(s => s.archived);
      
      const sorted = archived.sort((a, b) => 
        new Date(b.archivedAt || b.updatedAt || 0).getTime() - new Date(a.archivedAt || a.updatedAt || 0).getTime()
      );
      
      setStories(sorted);
    } catch (error) {
      console.error('Failed to load stories:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadStories();
    }, [])
  );

  const handleUnarchive = async (story: Story) => {
    Alert.alert(
      'Unarchive Story',
      'This will move the story back to your main feed. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unarchive',
          onPress: async () => {
            try {
              // 1. Update GitHub
              const result = await githubService.unarchiveStory(story);
              if (!result.success) {
                Alert.alert('Error', result.error || 'Failed to unarchive on GitHub');
                return;
              }

              // 2. Update local storage
              await storageService.saveStory({
                ...story,
                archived: false,
                archivedAt: undefined,
              });

              loadStories();
            } catch (error) {
              Alert.alert('Error', 'Failed to unarchive story');
            }
          },
        },
      ]
    );
  };

  const handleDeleteLocal = async (story: Story) => {
    Alert.alert(
      'Remove from Device',
      'This will remove the story from this device only. It will remain on GitHub.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await storageService.deleteStory(story.id);
            loadStories();
          },
        },
      ]
    );
  };

  const handleLongPress = (story: Story, event: any) => {
    const { pageX, pageY } = event.nativeEvent;
    setSelectedStory(story);
    setMenuPosition({ x: pageX, y: pageY });
    setMenuVisible(true);
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

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Archived Stories</Text>
          <View style={{ width: 24 }} />
        </View>

        {stories.length === 0 ? (
          <EmptyState
            icon={require('@/assets/doodles/Plane.png')}
            title="No archived stories"
            subtitle="Stories you archive will appear here"
            iconSize={140}
          />
        ) : (
          <FlatList
            data={stories}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <StoryCard
                story={item}
                onPress={() => router.push(`/viewer/${item.id}`)}
                onLongPress={(e) => handleLongPress(item, e)}
              />
            )}
            contentContainerStyle={styles.listContent}
          />
        )}

        <StoryContextMenu
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          onEdit={() => {
            if (selectedStory) router.push(`/editor?id=${selectedStory.id}`);
          }}
          onDelete={() => selectedStory && handleDeleteLocal(selectedStory)}
          onUnarchive={() => selectedStory && handleUnarchive(selectedStory)}
          isPublished={true}
          isArchived={true}
          position={menuPosition}
        />
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lines,
  },
  headerTitle: {
    fontFamily: typography.fonts.ui,
    fontSize: 20,
    color: colors.text,
  },
  listContent: {
    padding: 20,
  },
});
