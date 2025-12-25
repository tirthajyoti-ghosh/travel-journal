import { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, ScrollView, Alert, KeyboardAvoidingView, Platform, Modal, Keyboard, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { ArrowLeftIcon, CloudArrowUpIcon, ImageIcon, XIcon } from 'phosphor-react-native';
import * as storageService from '@/services/storageService';
import * as githubService from '@/services/githubService';
import { Story } from '@/types';
import { MediaPicker } from '@/components/MediaPicker';
import { DottedBackground } from '@/components/DottedBackground';
import { CityAutocomplete } from '@/components/CityAutocomplete';
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

interface UploadState {
  id: string;
  percentage: number;
  error?: string;
}

export default function EditorScreen() {
  const { storyId } = useLocalSearchParams<{ storyId?: string }>();
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [coordinates, setCoordinates] = useState<[number, number] | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [editorReady, setEditorReady] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loadedStory, setLoadedStory] = useState<Story | null>(null);
  const [activeUploads, setActiveUploads] = useState<Map<string, UploadState>>(new Map());
  const { isOffline } = useNetworkStatus();
  const { location: detectedLocation, coordinates: detectedCoordinates, loading: detectingLocation, error: locationError, detectLocation } = useLocation();

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
    /* Image styling */
    img {
      max-width: 85%;
      height: auto;
      margin: 0.5em auto 0.5em auto;
      display: block;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    /* Hide video in editor (mobile) */
    video {
      display: none;
    }
    /* When image is in a paragraph, ensure proper spacing */
    p img {
      margin: 0.5em auto 1em auto;
    }
    /* Upload placeholder styling */
    p:has-text("[Uploading") {
      background-color: ${colors.accent}15;
      padding: 12px 16px;
      border-radius: 8px;
      border-left: 3px solid ${colors.accent};
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 14px;
      color: ${colors.accent};
      font-weight: 500;
      margin: 1em 0;
    }
    p:has-text("[Upload failed") {
      background-color: #EF635115;
      padding: 12px 16px;
      border-radius: 8px;
      border-left: 3px solid #EF6351;
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 14px;
      color: #EF6351;
      font-weight: 500;
      margin: 1em 0;
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
    }
    // Don't auto-detect location on mount to avoid permission prompts
    // User can manually trigger detection with the button

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
    if (detectedLocation) {
      setLocation(detectedLocation);
      if (detectedCoordinates) {
        setCoordinates(detectedCoordinates);
      }
    }
  }, [detectedLocation, detectedCoordinates]);

  // Load story content when editor is ready
  useEffect(() => {
    if (editorReady && storyId) {
      loadStory();
    }
  }, [editorReady, storyId]);

  const loadStory = async () => {
    if (!storyId) return;
    try {
      const story = await storageService.getStory(storyId);
      if (story) {
        setLoadedStory(story);
        setTitle(story.title);
        // Filter out legacy "Unknown Location" values
        setLocation(story.location === 'Unknown Location' ? '' : story.location);
        setCoordinates(story.coordinates);
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
    // Get HTML content from editor first for validation
    let content = await editor.getHTML();
    
    // Process content to ensure video tags are preserved in storage
    // The editor strips <video> tags, so we use <img> with title="video:URL" in the editor
    // On save, we transform this back to:
    // <img ... data-video-thumbnail="true"> <video src="URL" ...>
    content = content.replace(
      /<img([^>]+)title="video:([^"]+)"([^>]*)>/g, 
      (match, p1, url, p2) => {
        // Reconstruct img with data attribute and append video tag
        return `<img${p1}title="video:${url}"${p2} data-video-thumbnail="true" />\n<video src="${url}" controls playsinline></video>`;
      }
    );

    const cleanContent = content.replace(/<[^>]*>/g, '').trim();
    
    // Require either title or body content
    if (!title.trim() && !cleanContent) {
      Alert.alert('Empty Draft', 'Please add a title or some content to save your draft');
      return;
    }

    setLoading(true);
    try {
      // Save locally first
      const savedStory = await storageService.saveStory({
        id: storyId,
        title: title.trim(),
        content: content,
        location: location.trim(),
        coordinates: coordinates,
        isDraft: true,
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
             console.log('Draft saved to GitHub:', result.path);
           } else {
             console.error('Failed to save draft to GitHub:', result.error);
             // Show alert to user about GitHub sync failure
             Alert.alert(
               'Draft Saved Locally',
               `Your draft was saved on this device, but couldn't be synced to GitHub: ${result.error}`,
               [{ text: 'OK' }]
             );
           }
        } else {
          console.log('GitHub not configured - draft saved locally only');
        }
      } else {
        console.log('Offline - draft saved locally only');
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
      const storyDate = loadedStory?.date || new Date().toISOString();
      const story: Story = {
        ...loadedStory, // Merge existing story data (includes isPublished, publishedAt, githubPath)
        id: storyId || new Date(storyDate).getTime().toString(),
        title: title.trim(),
        content: content,
        location: location.trim(),
        coordinates: coordinates,
        date: storyDate,
        isDraft: false,
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

  const handleUploadStart = async (placeholderId: string) => {
    // Insert placeholder text immediately
    const placeholderText = `[Uploading media... 0%]`;
    const currentContent = await editor.getHTML();
    editor.setContent(currentContent + `<p>${placeholderText}</p>`);
    
    // Track upload state
    setActiveUploads(prev => new Map(prev).set(placeholderId, { id: placeholderId, percentage: 0 }));
    
    // Close modal so user can see the placeholder
    setShowMediaPicker(false);
  };

  const handleUploadProgress = (placeholderId: string, percentage: number) => {
    setActiveUploads(prev => {
      const newMap = new Map(prev);
      const upload = newMap.get(placeholderId);
      if (upload) {
        newMap.set(placeholderId, { ...upload, percentage });
        
        // Update placeholder text in editor
        (async () => {
          const content = await editor.getHTML();
          const updatedContent = content.replace(
            /\[Uploading media\.\.\. \d+%\]/,
            `[Uploading media... ${percentage}%]`
          );
          if (content !== updatedContent) {
            editor.setContent(updatedContent);
          }
        })();
      }
      return newMap;
    });
  };

  const handleUploadComplete = async (placeholderId: string, cdnUrl: string, thumbnailBase64?: string) => {
    // Check if it's a video
    const isVideo = cdnUrl.match(/\.(mp4|mov|webm)$/i);

    // Replace placeholder with actual image or video
    const content = await editor.getHTML();
    
    let replacement = '';
    if (isVideo) {
      if (thumbnailBase64) {
        // Insert thumbnail image with video URL in title attribute
        // This allows us to reconstruct the video tag on save
        replacement = `<img src="${thumbnailBase64}" title="video:${cdnUrl}" alt="Video Thumbnail" /><br/><br/>`;
      } else {
        // Fallback if no thumbnail generated - try to use video tag (might be stripped by editor)
        replacement = `<video src="${cdnUrl}" controls playsinline></video><br/><br/>`;
      }
    } else {
      replacement = `<img src="${cdnUrl}" /><br/><br/>`;
    }

    const updatedContent = content.replace(
      /\[Uploading media\.\.\. \d+%\]/,
      replacement
    );
    editor.setContent(updatedContent);
    
    // Remove from active uploads
    setActiveUploads(prev => {
      const newMap = new Map(prev);
      newMap.delete(placeholderId);
      return newMap;
    });
  };

  const handleUploadError = async (placeholderId: string, error: string) => {
    // Replace placeholder with error message
    const content = await editor.getHTML();
    const updatedContent = content.replace(
      /\[Uploading media\.\.\. \d+%\]/,
      `[Upload failed: ${error}]`
    );
    editor.setContent(updatedContent);
    
    // Remove from active uploads
    setActiveUploads(prev => {
      const newMap = new Map(prev);
      newMap.delete(placeholderId);
      return newMap;
    });
  };

  const handlePhotoInsert = (photoUrl: string) => {
    // This is called as final callback, can be used for additional logic if needed
    editor.focus();
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
            <ArrowLeftIcon size={24} color={colors.text} />
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
                  <CloudArrowUpIcon 
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
            <CityAutocomplete
              value={location}
              onLocationSelect={(selectedLocation, selectedCoordinates) => {
                setLocation(selectedLocation);
                setCoordinates(selectedCoordinates);
              }}
              onGPSPress={detectLocation}
              placeholder="Search city..."
              gpsDetecting={detectingLocation}
              style={styles.locationInputContainer}
            />
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
              <ImageIcon size={24} color={colors.accent} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Media Picker Modal */}
      <Modal
        visible={showMediaPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMediaPicker(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMediaPicker(false)}
        >
          <TouchableOpacity 
            style={styles.modalBottomSheet}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <SafeAreaView style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Upload Media</Text>
                <TouchableOpacity onPress={() => setShowMediaPicker(false)}>
                  <XIcon size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <View style={styles.modalContent}>
                <MediaPicker 
                  onMediaUpload={handlePhotoInsert}
                  onUploadStart={handleUploadStart}
                  onUploadProgress={handleUploadProgress}
                  onUploadComplete={handleUploadComplete}
                  onUploadError={handleUploadError}
                />
              </View>
            </SafeAreaView>
          </TouchableOpacity>
        </TouchableOpacity>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBottomSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    paddingBottom: 8,
  },
  modalContainer: {
    backgroundColor: 'transparent',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.lines,
  },
  modalTitle: {
    fontFamily: typography.fonts.display,
    fontSize: 20,
    color: colors.text,
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  mediaPickerContainer: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: colors.lines,
    backgroundColor: colors.background,
  },
});
