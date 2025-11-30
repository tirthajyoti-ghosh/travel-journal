import AsyncStorage from '@react-native-async-storage/async-storage';
import { Story } from '@/types';

const STORAGE_KEY = '@travel_journal:stories';

/**
 * Get all stories from storage
 */
export async function getStories(): Promise<Story[]> {
  try {
    const storiesJson = await AsyncStorage.getItem(STORAGE_KEY);
    if (!storiesJson) return [];
    return JSON.parse(storiesJson);
  } catch (error) {
    console.error('Error loading stories:', error);
    return [];
  }
}

/**
 * Get a single story by ID
 */
export async function getStory(id: string): Promise<Story | null> {
  try {
    const stories = await getStories();
    return stories.find(story => story.id === id) || null;
  } catch (error) {
    console.error('Error loading story:', error);
    return null;
  }
}

/**
 * Save a story (create or update)
 */
export async function saveStory(story: Partial<Story>): Promise<Story> {
  try {
    const stories = await getStories();
    const now = new Date().toISOString();
    
    // Check if updating existing story
    const existingIndex = stories.findIndex(s => s.id === story.id);
    
    if (existingIndex >= 0) {
      // Update existing
      const updatedStory: Story = {
        ...stories[existingIndex],
        ...story,
        updatedAt: now,
      };
      stories[existingIndex] = updatedStory;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
      return updatedStory;
    } else {
      // Create new
      const newStory: Story = {
        id: story.id || generateId(),
        title: story.title || '',
        date: story.date || new Date().toISOString().split('T')[0],
        location: story.location || '',
        content: story.content || '',
        images: story.images || [],
        albumShareUrl: story.albumShareUrl,
        isDraft: story.isDraft !== undefined ? story.isDraft : true,
        createdAt: now,
        updatedAt: now,
        coverImage: story.coverImage,
      };
      stories.push(newStory);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
      return newStory;
    }
  } catch (error) {
    console.error('Error saving story:', error);
    throw error;
  }
}

/**
 * Delete a story by ID
 */
export async function deleteStory(id: string): Promise<void> {
  try {
    const stories = await getStories();
    const filtered = stories.filter(story => story.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting story:', error);
    throw error;
  }
}

/**
 * Clear all stories (Danger Zone)
 */
export async function clearAllStories(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing stories:', error);
    throw error;
  }
}

/**
 * Bulk save stories (for syncing from GitHub)
 */
export async function saveStories(stories: Story[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
  } catch (error) {
    console.error('Error saving stories:', error);
    throw error;
  }
}

/**
 * Generate a unique ID for stories
 */
function generateId(): string {
  return `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Save generic data to AsyncStorage
 */
export async function saveData(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    console.error('Error saving data:', error);
    throw error;
  }
}

/**
 * Get generic data from AsyncStorage
 */
export async function getData(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.error('Error getting data:', error);
    return null;
  }
}
