import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { StoryCard } from '@/components/StoryCard';
import { EmptyState } from '@/components/EmptyState';
import { StoryContextMenu } from '@/components/StoryContextMenu';
import { SyncStatusBar } from '@/components/SyncStatusBar';
import { Story } from '@/types';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { GearIcon, PlusIcon } from 'phosphor-react-native';
import * as storageService from '@/services/storageService';
import * as githubService from '@/services/githubService';
import { useSync } from '@/hooks/use-sync';

export default function HomeScreen() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const { syncing, status, startSync } = useSync();

  const loadStories = async (skipSync: boolean = false) => {
    setLoading(true);
    try {
      // Trigger sync first (if not skipped and not already syncing)
      if (!skipSync) {
        await startSync();
      }

      // After sync, load from local storage (which now has the latest data)
      const localStories = await storageService.getStories();
      
      // Filter out archived stories
      const visible = localStories.filter(s => !s.archived);
      
      // Separate drafts and published
      const drafts = visible.filter(s => s.isDraft || !s.isPublished);
      const published = visible.filter(s => !s.isDraft && s.isPublished);
      
      // Sort each group by updatedAt descending (newest first)
      const sortedDrafts = drafts.sort((a, b) => 
        new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()
      );
      const sortedPublished = published.sort((a, b) => 
        new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()
      );
      
      // Combine: drafts first, then published
      setStories([...sortedDrafts, ...sortedPublished]);
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

  const handleLongPress = (story: Story, event: any) => {
    const { pageX, pageY } = event.nativeEvent;
    setSelectedStory(story);
    setMenuPosition({ x: pageX, y: pageY });
    setMenuVisible(true);
  };

  const handleArchive = async (story: Story) => {
    Alert.alert(
      'Archive Story',
      'This will remove the story from your main feed but keep it on GitHub. You can view it in Archived Stories.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          onPress: async () => {
            try {
              // 1. Update GitHub
              const result = await githubService.archiveStory(story);
              if (!result.success) {
                Alert.alert('Error', result.error || 'Failed to archive on GitHub');
                return;
              }

              // 2. Update local storage
              await storageService.saveStory({
                ...story,
                archived: true,
                archivedAt: new Date().toISOString(),
              });

              loadStories();
            } catch (error) {
              Alert.alert('Error', 'Failed to archive story');
            }
          },
        },
      ]
    );
  };

  const handleDelete = async (story: Story) => {
    const isDraft = story.isDraft || !story.isPublished;
    
    Alert.alert(
      isDraft ? 'Delete Draft' : 'Remove from Device',
      isDraft 
        ? 'This will permanently delete this draft. This action cannot be undone.'
        : 'This will remove the story from this device only. It will remain on GitHub.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await storageService.deleteStory(story.id);
            loadStories();
          },
        },
      ]
    );
  };

  const renderEmptyState = () => (
    <EmptyState
      icon={require('@/assets/doodles/Plane.png')}
      title="Your travel stories will live here"
      subtitle="Tap + below to start writing"
      iconSize={140}
    />
  );

  // if (loading) {
  //   return (
  //     <View style={styles.container}>
  //       <SafeAreaView style={styles.safeArea}>
  //         <View style={styles.loadingContainer}>
  //           <ActivityIndicator size="large" color={colors.accent} />
  //         </View>
  //       </SafeAreaView>
  //     </View>
  //   );
  // }
  return (
    <View style={styles.container}>
      <SyncStatusBar visible={syncing} status={status} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Your Travel Stories</Text>
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={() => router.push('/settings')}
            >
              <GearIcon size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={stories}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => {
              const isDraft = item.isDraft || !item.isPublished;
              const prevItem = index > 0 ? stories[index - 1] : null;
              const prevIsDraft = prevItem ? (prevItem.isDraft || !prevItem.isPublished) : true;
              
              // Show divider when transitioning from drafts to published
              const showDivider = prevItem && prevIsDraft && !isDraft;
              
              return (
                <>
                  {showDivider && (
                    <View style={styles.divider}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>Published Stories</Text>
                      <View style={styles.dividerLine} />
                    </View>
                  )}
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
                    onLongPress={(e) => handleLongPress(item, e)}
                  />
                </>
              );
            }}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmptyState}
          />

          <TouchableOpacity 
            style={styles.fab} 
            onPress={() => router.push('/editor')}
          >
            <PlusIcon size={32} color={colors.white} weight="bold" />
          </TouchableOpacity>

          <StoryContextMenu
            visible={menuVisible}
            onClose={() => setMenuVisible(false)}
            onEdit={() => {
              if (selectedStory) router.push(`/editor?id=${selectedStory.id}`);
            }}
            onDelete={() => selectedStory && handleDelete(selectedStory)}
            onArchive={() => selectedStory && handleArchive(selectedStory)}
            isPublished={selectedStory ? (!selectedStory.isDraft && !!selectedStory.isPublished) : false}
            position={menuPosition}
          />
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.lines,
    opacity: 0.5,
  },
  dividerText: {
    fontFamily: typography.fonts.caption,
    fontSize: 12,
    color: colors.text,
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
