import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { useMediaUpload } from '@/hooks/use-media-upload';

interface MediaPickerProps {
  onMediaUpload: (cdnUrl: string) => void;
  onUploadStart?: (placeholderId: string) => void | Promise<void>;
  onUploadProgress?: (placeholderId: string, percentage: number) => void;
  onUploadComplete?: (placeholderId: string, cdnUrl: string) => void | Promise<void>;
  onUploadError?: (placeholderId: string, error: string) => void;
}

export function MediaPicker({ 
  onMediaUpload,
  onUploadStart,
  onUploadProgress,
  onUploadComplete,
  onUploadError 
}: MediaPickerProps) {
  const { isUploading, progress, uploadMedia, reset: resetUpload } = useMediaUpload();

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant media library access to upload photos.');
        return false;
      }
    }
    return true;
  };

  const handlePickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: false,
        quality: 0.9,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        await handleUploadMedia(asset.uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleTakePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera access to take photos.');
        return;
      }
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        await handleUploadMedia(asset.uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handleUploadMedia = async (uri: string) => {
    // Generate unique placeholder ID
    const placeholderId = `upload_${Date.now()}`;
    
    // Notify upload start (await in case it's async)
    await onUploadStart?.(placeholderId);
    
    // Import the upload service directly to get progress callbacks
    const { uploadMedia: directUpload } = await import('@/services/mediaUploadService');
    
    // Perform upload with progress tracking
    const result = await directUpload(uri, (prog) => {
      onUploadProgress?.(placeholderId, prog.percentage);
    });
    
    if (result.success) {
      onUploadComplete?.(placeholderId, result.cdnUrl);
      onMediaUpload(result.cdnUrl);
    } else {
      onUploadError?.(placeholderId, result.error || 'Upload failed');
      Alert.alert('Upload Failed', result.error || 'Failed to upload media. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      {isUploading ? (
        <View style={styles.uploadProgress}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.progressText}>
            {progress ? `Uploading... ${progress.percentage}%` : 'Preparing upload...'}
          </Text>
        </View>
      ) : (
        <View style={styles.buttonRow}>
          {/* {Platform.OS !== 'web' && (
            <TouchableOpacity 
              style={[styles.button, styles.primaryButton]} 
              onPress={handleTakePhoto}
            >
              <Feather name="camera" size={16} color={colors.white} />
              <Text style={styles.buttonText}>Take Photo</Text>
            </TouchableOpacity>
          )} */}
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]} 
            onPress={handlePickImage}
          >
            <Feather name="image" size={16} color={colors.white} />
            <Text style={styles.buttonText}>Pick Photo</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    gap: 16,
  },
  section: {
    gap: 12,
  },
  sectionLabel: {
    color: colors.text,
    fontFamily: typography.fonts.ui,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  label: {
    color: colors.text,
    fontFamily: typography.fonts.ui,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  uploadProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  progressText: {
    color: colors.text,
    fontFamily: typography.fonts.ui,
    fontSize: 14,
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
