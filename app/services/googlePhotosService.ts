import { PHOTOS_API_BASE_URL } from '@/constants/google';
import * as googleAuthService from './googleAuthService';

const ALBUM_STORAGE_KEY = '@travel_journal:shared_album';

interface SharedAlbum {
  id: string;
  shareUrl: string;
  title: string;
}

/**
 * Get or create the shared album for all travel stories
 */
export async function getOrCreateSharedAlbum(): Promise<SharedAlbum | null> {
  try {
    // Check if we already have a stored album
    const stored = await getStoredAlbum();
    if (stored) {
      // Verify album still exists
      const exists = await verifyAlbum(stored.id);
      if (exists) return stored;
    }

    // Create new album
    return await createAndShareAlbum();
  } catch (error) {
    console.error('Error getting/creating shared album:', error);
    return null;
  }
}

/**
 * Add media items to the shared album
 */
export async function addMediaToAlbum(
  albumId: string, 
  mediaItemIds: string[]
): Promise<boolean> {
  try {
    const token = await googleAuthService.getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }

    const response = await fetch(
      `${PHOTOS_API_BASE_URL}/albums/${albumId}:batchAddMediaItems`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mediaItemIds,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to add media to album:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error adding media to album:', error);
    return false;
  }
}

/**
 * Create a new album and share it
 */
async function createAndShareAlbum(): Promise<SharedAlbum | null> {
  try {
    const token = await googleAuthService.getAccessToken();
    if (!token) return null;

    // Create album
    const createResponse = await fetch(`${PHOTOS_API_BASE_URL}/albums`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        album: {
          title: 'Travel Journal Stories',
        },
      }),
    });

    if (!createResponse.ok) {
      console.error('Failed to create album:', await createResponse.text());
      return null;
    }

    const albumData = await createResponse.json();
    const albumId = albumData.id;

    // Share album
    const shareResponse = await fetch(
      `${PHOTOS_API_BASE_URL}/albums/${albumId}:share`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sharedAlbumOptions: {
            isCollaborative: false,
            isCommentable: false,
          },
        }),
      }
    );

    if (!shareResponse.ok) {
      console.error('Failed to share album:', await shareResponse.text());
      return null;
    }

    const shareData = await shareResponse.json();
    const sharedAlbum: SharedAlbum = {
      id: albumId,
      shareUrl: shareData.shareInfo.shareableUrl,
      title: 'Travel Journal Stories',
    };

    // Store for future use
    await storeAlbum(sharedAlbum);

    return sharedAlbum;
  } catch (error) {
    console.error('Error creating and sharing album:', error);
    return null;
  }
}

/**
 * Verify album still exists
 */
async function verifyAlbum(albumId: string): Promise<boolean> {
  try {
    const token = await googleAuthService.getAccessToken();
    if (!token) return false;

    const response = await fetch(`${PHOTOS_API_BASE_URL}/albums/${albumId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Store album info locally
 */
async function storeAlbum(album: SharedAlbum): Promise<void> {
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  await AsyncStorage.setItem(ALBUM_STORAGE_KEY, JSON.stringify(album));
}

/**
 * Get stored album info
 */
async function getStoredAlbum(): Promise<SharedAlbum | null> {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const stored = await AsyncStorage.getItem(ALBUM_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    return null;
  }
}
