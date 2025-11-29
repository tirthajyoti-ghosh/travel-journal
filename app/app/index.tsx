import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { StoryCard } from '@/components/StoryCard';
import { EmptyState } from '@/components/EmptyState';
import { Story } from '@/types';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import Feather from '@expo/vector-icons/Feather';
import * as storageService from '@/services/storageService';

export default function HomeScreen() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

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
