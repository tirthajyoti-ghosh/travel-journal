import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as googleAuthService from '@/services/googleAuthService';
import * as googlePhotosService from '@/services/googlePhotosService';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

interface MediaPickerProps {
  onMediaSelected: (mediaItemIds: string[], albumId: string, albumShareUrl: string) => void;
}

export function MediaPicker({ onMediaSelected }: MediaPickerProps) {
  const [loading, setLoading] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      const token = await googleAuthService.signInToGoogle();
      if (token) {
        setSignedIn(true);
        Alert.alert('Success', 'Signed in to Google Photos!');
      } else {
        Alert.alert('Error', 'Failed to sign in. Please try again.');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      Alert.alert('Error', 'Failed to sign in to Google Photos');
    } finally {
      setLoading(false);
    }
  };

  const handlePickPhotos = async () => {
    setLoading(true);
    try {
      // Check if signed in
      const isSignedIn = await googleAuthService.isSignedIn();
      if (!isSignedIn) {
        Alert.alert(
          'Sign In Required',
          'Please sign in to Google Photos first',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign In', onPress: handleSignIn },
          ]
        );
        setLoading(false);
        return;
      }

      // For now, show a placeholder message
      // In a real implementation, we'd open Google Photos Picker here
      Alert.alert(
        'Photo Picker',
        'Google Photos Picker integration coming soon!\n\nFor now, you can:\n1. Get photos from Google Photos app\n2. Copy the share link\n3. Paste it in the story',
        [{ text: 'OK' }]
      );

      // Mock implementation - in real version this would open picker
      // const mediaItemIds = await openPhotoPicker();
      // const album = await googlePhotosService.getOrCreateSharedAlbum();
      // if (album) {
      //   await googlePhotosService.addMediaToAlbum(album.id, mediaItemIds);
      //   onMediaSelected(mediaItemIds, album.id, album.shareUrl);
      // }
    } catch (error) {
      console.error('Photo picker error:', error);
      Alert.alert('Error', 'Failed to pick photos');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={handlePickPhotos}>
        <Feather name="image" size={20} color={colors.white} />
        <Text style={styles.buttonText}>Add Photos</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: colors.white,
    fontFamily: typography.fonts.ui,
    fontSize: 14,
  },
});
