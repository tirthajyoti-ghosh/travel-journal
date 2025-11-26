import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as storageService from '@/services/storageService';
import { AlbumPhotoBrowser } from './AlbumPhotoBrowser';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

interface MediaPickerProps {
  onMediaSelected: (albumShareUrl: string) => void;
  onPhotoInsert?: (photoUrl: string) => void;
  initialAlbumUrl?: string;
}

const ALBUM_URL_KEY = '@travel_journal:google_photos_album_url';

export function MediaPicker({ onMediaSelected, onPhotoInsert, initialAlbumUrl }: MediaPickerProps) {
  const [albumUrl, setAlbumUrl] = useState<string>(initialAlbumUrl || '');
  const [inputUrl, setInputUrl] = useState<string>('');
  const [showBrowser, setShowBrowser] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAlbumUrl();
  }, []);

  const loadStoredAlbumUrl = async () => {
    try {
      if (initialAlbumUrl) {
        setAlbumUrl(initialAlbumUrl);
        setLoading(false);
        return;
      }

      const stored = await storageService.getData(ALBUM_URL_KEY);
      if (stored) {
        setAlbumUrl(stored);
      }
    } catch (error) {
      console.error('Error loading album URL:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUrl = async () => {
    const trimmedUrl = inputUrl.trim();
    
    if (!trimmedUrl) {
      Alert.alert('Error', 'Please enter a valid Google Photos album URL');
      return;
    }

    // Basic validation for Google Photos URL
    if (!trimmedUrl.includes('photos.google.com') && !trimmedUrl.includes('photos.app.goo.gl')) {
      Alert.alert('Error', 'Please enter a valid Google Photos share URL');
      return;
    }

    try {
      setAlbumUrl(trimmedUrl);
      await storageService.saveData(ALBUM_URL_KEY, trimmedUrl);
      onMediaSelected(trimmedUrl);
      setIsEditing(false);
      setInputUrl('');
    } catch (error) {
      console.error('Error saving album URL:', error);
      Alert.alert('Error', 'Failed to save album URL. Please try again.');
    }
  };

  const handleEditUrl = () => {
    setInputUrl(albumUrl);
    setIsEditing(true);
  };

  const handleOpenBrowser = () => {
    setShowBrowser(true);
  };

  const handleCloseBrowser = () => {
    setShowBrowser(false);
  };

  const handlePhotoSelect = (photoUrl: string) => {
    if (onPhotoInsert) {
      onPhotoInsert(photoUrl);
    }
    // Optionally close browser after inserting photo
    // setShowBrowser(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (isEditing || !albumUrl) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Google Photos Album URL</Text>
        <TextInput
          style={styles.input}
          placeholder="https://photos.app.goo.gl/xxxxx"
          placeholderTextColor={colors.text + '60'}
          value={inputUrl}
          onChangeText={setInputUrl}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
        />
        <Text style={styles.helperText}>
          Create a shared album in Google Photos and paste the share link here
        </Text>
        <View style={styles.buttonRow}>
          {albumUrl && (
            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton]} 
              onPress={() => {
                setIsEditing(false);
                setInputUrl('');
              }}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]} 
            onPress={handleSaveUrl}
          >
            <Feather name="save" size={16} color={colors.white} />
            <Text style={styles.buttonText}>Save Album</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showBrowser && albumUrl && (
        <Modal
          visible={showBrowser}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={handleCloseBrowser}
        >
          <AlbumPhotoBrowser
            albumShareUrl={albumUrl}
            onClose={handleCloseBrowser}
            onPhotoSelect={handlePhotoSelect}
          />
        </Modal>
      )}
      
      <View style={styles.albumInfo}>
        <Feather name="image" size={20} color={colors.accent} />
        <Text style={styles.albumText} numberOfLines={1}>Album linked</Text>
      </View>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleEditUrl}>
          <Feather name="edit-2" size={16} color={colors.accent} />
          <Text style={styles.secondaryButtonText}>Change</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleOpenBrowser}>
          <Feather name="eye" size={16} color={colors.white} />
          <Text style={styles.buttonText}>View Photos</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    gap: 12,
  },
  label: {
    color: colors.text,
    fontFamily: typography.fonts.ui,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.accent + '40',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontFamily: typography.fonts.ui,
    fontSize: 14,
    minHeight: 60,
  },
  helperText: {
    color: colors.text,
    fontFamily: typography.fonts.ui,
    fontSize: 12,
    opacity: 0.6,
    marginTop: -4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryButton: {
    backgroundColor: colors.accent,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  buttonText: {
    color: colors.white,
    fontFamily: typography.fonts.ui,
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: colors.accent,
    fontFamily: typography.fonts.ui,
    fontSize: 14,
    fontWeight: '600',
  },
  albumInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  albumText: {
    flex: 1,
    color: colors.text,
    fontFamily: typography.fonts.ui,
    fontSize: 14,
  },
  loadingText: {
    marginTop: 8,
    color: colors.text,
    fontFamily: typography.fonts.ui,
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.6,
  },
});
