import { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, ScrollView, Alert, KeyboardAvoidingView, Platform, Modal, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import Feather from '@expo/vector-icons/Feather';
import * as storageService from '@/services/storageService';
import { MediaPicker } from '@/components/MediaPicker';
import { AlbumPhotoBrowser } from '@/components/AlbumPhotoBrowser';
import { DottedBackground } from '@/components/DottedBackground';
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
    avoidIosKeyboard: true,
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

    setLoading(true);
    try {
      // Get HTML content from editor
      const content = await editor.getHTML();
      
      await storageService.saveStory({
        id: storyId,
        title: title.trim(),
        content: content,
        location: location.trim() || 'Unknown Location',
        isDraft: true,
        albumShareUrl,
      });
      router.back();
    } catch (error) {
      console.error('Failed to save story:', error);
      Alert.alert('Error', 'Failed to save story. Please try again.');
    } finally {
      setLoading(false);
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
          <TouchableOpacity 
            style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveText}>{loading ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollContent} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContentContainer}>
          <TextInput
            style={styles.titleInput}
            placeholder="Story Title..."
            placeholderTextColor={colors.lines}
            value={title}
            onChangeText={setTitle}
            multiline
          />
          
          <View style={styles.metaContainer}>
            <TextInput
              style={styles.metaInput}
              placeholder="Location (e.g., Bangkok, Thailand)"
              placeholderTextColor={colors.lines}
              value={location}
              onChangeText={setLocation}
            />
            <Text style={styles.metaText}>
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>

          <View style={styles.editorWrapper}>
            <RichText 
              editor={editor}
            />
          </View>
        </ScrollView>

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
  saveButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveText: {
    color: colors.white,
    fontFamily: typography.fonts.ui,
    fontSize: 14,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContentContainer: {
    flexGrow: 1,
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
    minHeight: 600,
    maxHeight: 600,
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
