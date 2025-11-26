import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator, Alert, Linking } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

interface PhotoItem {
  id: string;
  url: string;
  thumbnail: string;
}

interface AlbumPhotoBrowserProps {
  albumShareUrl: string;
  onClose: () => void;
  onPhotoSelect?: (photoUrl: string) => void;
}

export function AlbumPhotoBrowser({albumShareUrl, onClose, onPhotoSelect }: AlbumPhotoBrowserProps) {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPhotos();
  }, [albumShareUrl]);

  const loadPhotos = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch the public album page HTML
      const response = await fetch(albumShareUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      
      // Log a sample of the HTML for debugging (first 500 chars)
      console.log('Album HTML sample:', html.substring(0, 500));
      
      // Extract photo URLs from the HTML
      const photoUrls = extractPhotoUrls(html);
      
      console.log(`Extracted ${photoUrls.length} photos from album`);
      
      if (photoUrls.length === 0) {
        setError('No photos found. The album may be empty or the URL format has changed.');
      }
      
      setPhotos(photoUrls);
    } catch (err) {
      console.error('Error loading photos:', err);
      setError(err instanceof Error ? err.message : 'Failed to load photos from album');
    } finally {
      setLoading(false);
    }
  };

  const extractPhotoUrls = (html: string): PhotoItem[] => {
    const photos: PhotoItem[] = [];
    
    try {
      // Google Photos embeds data in script tags and data attributes
      // URLs can be in format: /pw/[hash] or just /[hash]
      // Method 1: Look for data in AF_initDataCallback or similar structures
      const dataPattern = /"(https:\/\/lh3\.googleusercontent\.com\/(?:pw\/)?[^"=]+)(?:=[^"]*)?"/g;
      let match;
      const foundUrls = new Set<string>();
      
      while ((match = dataPattern.exec(html)) !== null) {
        const baseUrl = match[1];
        // Only include photo URLs (not profile pictures)
        // Photo URLs contain /pw/ and are long enough
        if (baseUrl.includes('/pw/') && baseUrl.length > 50) {
          foundUrls.add(baseUrl);
        }
      }
      
      // Method 2: Look for img src attributes
      const imgPattern = /<img[^>]+src="(https:\/\/lh3\.googleusercontent\.com\/(?:pw\/)?[^"=]+)(?:=[^"]*)?"/g;
      while ((match = imgPattern.exec(html)) !== null) {
        const baseUrl = match[1];
        if (baseUrl.includes('/pw/') && baseUrl.length > 50) {
          foundUrls.add(baseUrl);
        }
      }
      
      // Method 3: Look for background-image styles
      const bgPattern = /background-image:\s*url\((https:\/\/lh3\.googleusercontent\.com\/(?:pw\/)?[^)=]+)(?:=[^)]*)?\)/g;
      while ((match = bgPattern.exec(html)) !== null) {
        const baseUrl = match[1].replace(/['"]/g, '');
        if (baseUrl.includes('/pw/') && baseUrl.length > 50) {
          foundUrls.add(baseUrl);
        }
      }
      
      // Convert to PhotoItems
      Array.from(foundUrls).forEach((baseUrl, index) => {
        photos.push({
          id: `photo-${index}`,
          url: `${baseUrl}=w2048-h2048`, // Full size
          thumbnail: `${baseUrl}=w400-h400-c`, // Thumbnail with crop
        });
      });
      
      console.log(`Extracted ${photos.length} unique photo URLs`);
      
      // If no photos found, try a more aggressive pattern
      if (photos.length === 0) {
        console.log('No photos found with primary methods, trying aggressive pattern...');
        const aggressivePattern = /https:\/\/lh3\.googleusercontent\.com\/pw\/[a-zA-Z0-9_-]{30,}/g;
        const matches = html.match(aggressivePattern);
        
        if (matches) {
          const uniqueUrls = [...new Set(matches)];
          uniqueUrls.forEach((url, index) => {
            photos.push({
              id: `photo-${index}`,
              url: `${url}=w2048-h2048`,
              thumbnail: `${url}=w400-h400-c`,
            });
          });
          console.log(`Aggressive pattern found ${photos.length} photos`);
        }
      }
    } catch (err) {
      console.error('Error extracting photo URLs:', err);
    }
    
    return photos;
  };

  const handleOpenInGooglePhotos = async () => {
    try {
      const canOpen = await Linking.canOpenURL(albumShareUrl);
      if (canOpen) {
        await Linking.openURL(albumShareUrl);
      } else {
        Alert.alert('Error', 'Cannot open Google Photos');
      }
    } catch (err) {
      console.error('Error opening URL:', err);
      Alert.alert('Error', 'Failed to open Google Photos');
    }
  };

  const renderPhoto = ({ item }: { item: PhotoItem }) => (
    <TouchableOpacity 
      style={styles.photoItem}
      onPress={() => {
        console.log('Photo tapped:', item.id);
        if (onPhotoSelect) {
          onPhotoSelect(item.url);
        }
      }}
    >
      <Image
        source={{ uri: item.thumbnail }}
        style={styles.photoImage}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  const renderEmpty = () => {
    if (loading) {
      return null;
    }

    return (
      <View style={styles.emptyContainer}>
        <Feather name="image" size={48} color={colors.text + '40'} />
        <Text style={styles.emptyText}>
          {error || 'No photos found in album'}
        </Text>
        <Text style={styles.emptySubtext}>
          Note: Google Photos may use JavaScript to load images, which limits scraping. 
          Videos will appear as static thumbnails. Open the album in Google Photos to view full content.
        </Text>
        <TouchableOpacity style={styles.openButton} onPress={handleOpenInGooglePhotos}>
          <Feather name="external-link" size={16} color={colors.white} />
          <Text style={styles.openButtonText}>Open in Google Photos</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading album photos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Feather name="x" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Album Photos</Text>
          {photos.length > 0 && (
            <Text style={styles.subtitle}>{photos.length} items</Text>
          )}
        </View>
        <TouchableOpacity onPress={handleOpenInGooglePhotos} style={styles.linkButton}>
          <Feather name="external-link" size={20} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {photos.length > 0 && !loading && (
        <View style={styles.infoBar}>
          <Feather name="info" size={14} color={colors.text + '80'} />
          <Text style={styles.infoText}>
            Videos appear as thumbnails. Tap external link to watch videos in Google Photos.
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading photos...</Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          renderItem={renderPhoto}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.grid}
          ListEmptyComponent={renderEmpty}
        />
      )}

      <View style={styles.footer}>
        <Text style={styles.infoText}>
          Photos are loaded from your shared Google Photos album
        </Text>
        <TouchableOpacity style={styles.refreshButton} onPress={loadPhotos}>
          <Feather name="refresh-cw" size={16} color={colors.accent} />
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.text + '20',
  },
  headerLeft: {
    flex: 1,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    textAlign: 'center',
    fontFamily: typography.fonts.ui,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    textAlign: 'center',
    fontFamily: typography.fonts.ui,
    fontSize: 12,
    color: colors.text,
    opacity: 0.6,
    marginTop: 2,
  },
  linkButton: {
    padding: 4,
  },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.accent + '15',
    borderBottomWidth: 1,
    borderBottomColor: colors.accent + '20',
  },
  infoText: {
    flex: 1,
    fontFamily: typography.fonts.ui,
    fontSize: 12,
    color: colors.text,
    opacity: 0.8,
    lineHeight: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: typography.fonts.ui,
    fontSize: 14,
    color: colors.text,
    opacity: 0.6,
  },
  grid: {
    padding: 4,
  },
  photoItem: {
    flex: 1/3,
    aspectRatio: 1,
    padding: 2,
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.text + '10',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  emptyText: {
    fontFamily: typography.fonts.ui,
    fontSize: 14,
    color: colors.text,
    opacity: 0.6,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontFamily: typography.fonts.ui,
    fontSize: 12,
    color: colors.text,
    opacity: 0.5,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  openButtonText: {
    fontFamily: typography.fonts.ui,
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.text + '20',
    gap: 12,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  refreshText: {
    fontFamily: typography.fonts.ui,
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
});
