import { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, ScrollView, Alert, KeyboardAvoidingView, Platform, Modal, Keyboard, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import Feather from '@expo/vector-icons/Feather';
import * as storageService from '@/services/storageService';
import * as githubService from '@/services/githubService';
import { Story } from '@/types';
import { MediaPicker } from '@/components/MediaPicker';
import { AlbumPhotoBrowser } from '@/components/AlbumPhotoBrowser';
import { DottedBackground } from '@/components/DottedBackground';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useLocation } from '@/hooks/use-location';
import { 
  RichText, 
  Toolbar, 
  useEditorBridge, 
  TenTapStartKit,
  CoreBridge,
  DEFAULT_TOOLBAR_ITEMS,
  type ToolbarItem,
} from '@10play/tentap-editor';

export default function EditorScreen() {
  const { storyId } = useLocalSearchParams<{ storyId?: string }>();
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [albumShareUrl, setAlbumShareUrl] = useState<string | undefined>();
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [editorReady, setEditorReady] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loadedStory, setLoadedStory] = useState<Story | null>(null);
  const { isOffline } = useNetworkStatus();
  const { location: detectedLocation, loading: detectingLocation, error: locationError, detectLocation } = useLocation();

  const ALBUM_URL_KEY = '@travel_journal:google_photos_album_url';

  // Custom CSS for cozy notebook aesthetic
  const customEditorCSS = `
    * {
      font-family: 'Lora', serif;
      color: ${colors.text};
      font-size: 18px;
      line-height: 1.6;
    }
    p {
      margin: 0.5em 0;
    }
    h1, h2, h3 {
      font-family: 'Lora', serif;
      font-weight: 600;
      margin: 0.8em 0 0.4em 0;
    }
    h1 {
      font-size: 28px;
    }
    h2 {
      font-size: 24px;
    }
    h3 {
      font-size: 20px;
    }
    blockquote {
      border-left: 3px solid ${colors.accent};
      padding-left: 1rem;
      margin: 1em 0;
      font-style: italic;
      opacity: 0.9;
    }
    ul, ol {
      padding-left: 1.5em;
      margin: 0.5em 0;
    }
    li {
      margin: 0.3em 0;
    }
    strong {
      font-weight: 600;
    }
    em {
      font-style: italic;
    }
    img {
      max-width: 100%;
      height: auto;
      margin: 1em 0;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
  `;

  const editor = useEditorBridge({
    autofocus: false,
    avoidIosKeyboard: false,
    initialContent: '',
    bridgeExtensions: [
      ...TenTapStartKit,
      CoreBridge.configureCSS(customEditorCSS),
    ],
    theme: {
      toolbar: {
        toolbarBody: {
          backgroundColor: colors.background,
          borderTopColor: colors.lines,
          borderTopWidth: 1,
        },
        toolbarButton: {
          backgroundColor: colors.background,
        },
        iconWrapperActive: {
          backgroundColor: colors.accent + '20',
        },
        icon: {
          tintColor: colors.text,
        },
      },
      webview: {
        backgroundColor: 'transparent',
      },
    },
  });

  useEffect(() => {
    if (storyId) {
      loadStory();
    } else {
      loadStoredAlbumUrl();
      // Don't auto-detect on mount to avoid permission prompts
      // User can manually trigger detection with the button
    }

    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [storyId]);

  // Update location field when detection completes
  useEffect(() => {
    if (detectedLocation && !location) {
      setLocation(detectedLocation);
    }
  }, [detectedLocation]);

  // Load story content when editor is ready
  useEffect(() => {
    if (editorReady && storyId) {
      loadStory();
    }
  }, [editorReady, storyId]);

  const loadStoredAlbumUrl = async () => {
    try {
      const stored = await storageService.getData(ALBUM_URL_KEY);
      if (stored) {
        setAlbumShareUrl(stored);
      }
    } catch (error) {
      console.error('Error loading album URL:', error);
    }
  };

  const loadStory = async () => {
    if (!storyId) return;
    try {
      const story = await storageService.getStory(storyId);
      if (story) {
        setLoadedStory(story);
        setTitle(story.title);
        setLocation(story.location);
        setAlbumShareUrl(story.albumShareUrl);
        // Set editor content
        if (story.content) {
          editor.setContent(story.content);
        }
      }
    } catch (error) {
      console.error('Failed to load story:', error);
      Alert.alert('Error', 'Failed to load story');
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please add a title to your story');
      return;
    }

    if (!location.trim()) {
      Alert.alert('Missing Location', 'Please add a location to your story');
      return;
    }

    setLoading(true);
    try {
      // Get HTML content from editor
      const content = await editor.getHTML();
      
      // Save locally first
      const savedStory = await storageService.saveStory({
        id: storyId,
        title: title.trim(),
        content: content,
        location: location.trim() || 'Unknown Location',
        isDraft: true,
        albumShareUrl,
      });

      // Try to save to GitHub if online and configured
      if (!isOffline) {
        const isConfigured = await githubService.isGitHubConfigured();
        if (isConfigured) {
           const result = await githubService.saveDraft(savedStory);
           if (result.success) {
             // Update local story with githubPath if it was successful
             await storageService.saveStory({
               ...savedStory,
               githubPath: result.path,
             });
           } else {
             console.warn('Failed to save draft to GitHub:', result.error);
           }
        }
      }

      router.back();
    } catch (error) {
      console.error('Failed to save story:', error);
      Alert.alert('Error', 'Failed to save story. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please add a title to your story');
      return;
    }

    // Check network status first
    if (isOffline) {
      Alert.alert(
        'No Internet Connection',
        'Story saved as draft. Connect to internet to publish to GitHub.',
        [{ text: 'OK' }]
      );
      // Save as draft instead
      await handleSave();
      return;
    }

    // Check if GitHub is configured
    const isConfigured = await githubService.isGitHubConfigured();
    if (!isConfigured) {
      Alert.alert(
        'GitHub Not Configured',
        'Please configure your GitHub settings first.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => router.push('/settings') },
        ]
      );
      return;
    }

    setPublishing(true);
    try {
      // Get HTML content from editor
      const content = await editor.getHTML();
      
      // Create story object, preserving existing metadata if editing
      const story: Story = {
        ...loadedStory, // Merge existing story data (includes isPublished, publishedAt, githubPath)
        id: storyId || Date.now().toString(),
        title: title.trim(),
        content: content,
        location: location.trim() || 'Unknown Location',
        date: loadedStory?.date || new Date().toISOString(),
        isDraft: false,
        albumShareUrl,
        images: [],
        createdAt: loadedStory?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Publish to GitHub
      const result = await githubService.publishStory(story);
      
      if (result.success) {
        // Save story with published status
        await storageService.saveStory({
          ...story,
          isPublished: true,
          publishedAt: new Date().toISOString(),
          githubPath: result.path,
        });
        
        Alert.alert(
          'Published!',
          'Your story has been published to GitHub ✓',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Publish Failed', result.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Failed to publish story:', error);
      Alert.alert('Error', 'Failed to publish story. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  const handleMediaSelected = (shareUrl: string) => {
    setAlbumShareUrl(shareUrl);
    storageService.saveData(ALBUM_URL_KEY, shareUrl);
  };

  const handlePhotoInsert = (photoUrl: string) => {
    // Insert image into the rich text editor
    editor.setImage(photoUrl);
    editor.focus();
    setShowMediaPicker(false);
  };

  // Custom toolbar items with image picker button
  const customToolbarItems: ToolbarItem[] = [
    ...DEFAULT_TOOLBAR_ITEMS,
    {
      onPress: () => () => setShowMediaPicker(true),
      active: () => false,
      disabled: () => false,
      image: () => require('@/assets/images/icon.png'), // We'll use Feather icon instead
    },
  ];

  return (
    <View style={styles.container}>
      <DottedBackground />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          
          <View style={styles.headerActions}>
            {isOffline ? (
              <TouchableOpacity 
                style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
                onPress={handleSave}
                disabled={loading}
              >
                <Text style={styles.saveText}>{loading ? 'Saving...' : 'Save Draft'}</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity 
                  style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
                  onPress={handleSave}
                  disabled={loading || publishing}
                >
                  <Text style={styles.saveText}>{loading ? 'Saving...' : 'Save Draft'}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.publishButton, 
                    publishing && styles.publishButtonDisabled
                  ]} 
                  onPress={handlePublish}
                  disabled={loading || publishing}
                >
                  <Feather 
                    name="upload-cloud" 
                    size={16} 
                    color={colors.white} 
                  />
                  <Text style={styles.publishText}>
                    {publishing ? 'Publishing...' : 'Publish'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View style={styles.contentWrapper}>
          <TextInput
            style={styles.titleInput}
            placeholder="Story Title..."
            placeholderTextColor={colors.lines}
            value={title}
            onChangeText={setTitle}
            multiline
          />
          
          <View style={styles.metaContainer}>
            <View style={styles.locationInputContainer}>
              <TextInput
                style={[styles.metaInput, styles.locationInput]}
                placeholder="Location (e.g., Bangkok, Thailand)"
                placeholderTextColor={colors.lines}
                value={location}
                onChangeText={setLocation}
              />
              <TouchableOpacity 
                style={styles.detectButton}
                onPress={detectLocation}
                disabled={detectingLocation}
              >
                {detectingLocation ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <Feather name="map-pin" size={18} color={colors.accent} />
                )}
              </TouchableOpacity>
            </View>
            {locationError && (
              <Text style={styles.locationError}>{locationError}</Text>
            )}
            <Text style={styles.metaText}>
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>

          <View style={styles.editorWrapper}>
            <RichText
              editor={editor}
              onLoad={() => setEditorReady(true)}
            />
          </View>
        </View>

        <View style={[styles.toolbarWrapper, { marginBottom: keyboardHeight }]}>
          <View style={styles.toolbarContainer}>
            <View style={styles.toolbarItems}>
              <Toolbar editor={editor} hidden={false} />
            </View>
            <TouchableOpacity 
              style={styles.imageButton}
              onPress={() => setShowMediaPicker(true)}
            >
              <Feather name="image" size={24} color={colors.accent} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Media Picker Modal */}
      <Modal
        visible={showMediaPicker}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowMediaPicker(false)}
      >
        {albumShareUrl ? (
          <AlbumPhotoBrowser
            albumShareUrl={albumShareUrl}
            onClose={() => setShowMediaPicker(false)}
            onPhotoSelect={handlePhotoInsert}
          />
        ) : (
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Link Album First</Text>
              <TouchableOpacity onPress={() => setShowMediaPicker(false)}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <MediaPicker 
                onMediaSelected={handleMediaSelected}
                onPhotoInsert={handlePhotoInsert}
                initialAlbumUrl={albumShareUrl}
              />
            </View>
          </SafeAreaView>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F2',
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  offlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.lines + '40',
    borderRadius: 12,
  },
  offlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.text,
    opacity: 0.5,
  },
  offlineText: {
    fontFamily: typography.fonts.ui,
    fontSize: 12,
    color: colors.text,
    opacity: 0.6,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  saveButton: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  publishButtonDisabled: {
    backgroundColor: colors.lines,
    opacity: 0.5,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveText: {
    color: colors.accent,
    fontFamily: typography.fonts.ui,
    fontSize: 14,
  },
  publishText: {
    color: colors.white,
    fontFamily: typography.fonts.ui,
    fontSize: 14,
  },
  publishTextDisabled: {
    color: colors.text,
  },
  keyboardAvoid: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 20,
  },
  titleInput: {
    fontFamily: typography.fonts.display,
    fontSize: 32,
    color: colors.text,
    marginBottom: 8,
  },
  metaContainer: {
    marginBottom: 24,
    gap: 8,
  },
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationInput: {
    flex: 1,
  },
  detectButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationError: {
    fontFamily: typography.fonts.caption,
    fontSize: 12,
    color: '#E74C3C',
    marginTop: -4,
  },
  metaInput: {
    fontFamily: typography.fonts.caption,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.lines,
    backgroundColor: 'transparent',
  },
  metaText: {
    fontFamily: typography.fonts.caption,
    fontSize: 14,
    color: colors.text,
    opacity: 0.6,
  },
  editorContainer: {
    flex: 1,
    minHeight: 300,
  },
  editorWrapper: {
    flex: 1,
  },
  toolbarWrapper: {
    backgroundColor: colors.background,
    borderTopWidth: 2,
    borderTopColor: colors.accent,
  },
  toolbarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingVertical: 12,
    paddingHorizontal: 8,
    minHeight: 50,
  },
  toolbarItems: {
    flex: 1,
  },
  imageButton: {
    padding: 10,
    marginLeft: 8,
    backgroundColor: colors.accent + '20',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lines,
  },
  modalTitle: {
    fontFamily: typography.fonts.display,
    fontSize: 24,
    color: colors.text,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  mediaPickerContainer: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: colors.lines,
    backgroundColor: colors.background,
  },
});
