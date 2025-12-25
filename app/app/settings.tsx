import { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { ArrowLeftIcon, ArchiveIcon, CaretRightIcon, CheckCircleIcon, InfoIcon, WarningIcon } from 'phosphor-react-native';
import * as githubService from '@/services/githubService';
import * as storageService from '@/services/storageService';
import * as mediaUploadService from '@/services/mediaUploadService';
import { GitHubConfig } from '@/types';
import { GITHUB_OWNER, GITHUB_REPO } from '@/constants/github';

/**
 * Settings Screen - GitHub Configuration
 * 
 * ⚠️ SECURITY: GitHub tokens are stored encrypted in AsyncStorage
 * and NEVER committed to version control. Always use fine-grained
 * tokens with minimal permissions (Contents: Read & Write only).
 */

export default function SettingsScreen() {
  const [token, setToken] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasGitHubToken, setHasGitHubToken] = useState(false);
  const [hasAppSecret, setHasAppSecret] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  const targetBranch = githubService.getTargetBranch();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const config = await githubService.loadGitHubConfig();
    if (config && config.token) {
      setToken(config.token);
      setHasGitHubToken(true);
    }

    const secretExists = await mediaUploadService.hasAppSecret();
    setHasAppSecret(secretExists);
    if (secretExists) {
      // Don't show the actual secret, just indicate it's configured
      setAppSecret('••••••••••••••••••••••••••••••••');
    }
  };

  const autoSaveToken = async (newToken: string) => {
    if (!newToken.trim()) return;

    try {
      const config: GitHubConfig = {
        token: newToken.trim(),
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        branch: targetBranch,
      };

      await githubService.saveGitHubConfig(config);
      setHasGitHubToken(true);
    } catch (error) {
      console.error('Failed to save token:', error);
    }
  };

  const autoSaveAppSecret = async (newSecret: string) => {
    // Don't save if it's the masked placeholder
    if (!newSecret.trim() || newSecret.startsWith('••••')) return;

    try {
      await mediaUploadService.storeAppSecret(newSecret.trim());
      setHasAppSecret(true);
    } catch (error) {
      console.error('Failed to save app secret:', error);
    }
  };

  const handleTokenChange = (newToken: string) => {
    setToken(newToken);
    
    // Clear existing timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    // Set new timeout for auto-save (debounce)
    const timeout = setTimeout(() => {
      autoSaveToken(newToken);
    }, 1000);
    
    setSaveTimeout(timeout);
  };

  const handleAppSecretChange = (newSecret: string) => {
    setAppSecret(newSecret);
    
    // Clear existing timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    // Set new timeout for auto-save (debounce)
    const timeout = setTimeout(() => {
      autoSaveAppSecret(newSecret);
    }, 1000);
    
    setSaveTimeout(timeout);
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache & Refresh',
      'This will delete all local data (including drafts!) and re-download published stories from GitHub. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear & Refresh',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              // 1. Clear local storage
              await storageService.clearAllStories();
              
              // 2. Fetch from GitHub
              const stories = await githubService.fetchAllStories();
              
              // 3. Save to local storage
              await storageService.saveStories(stories);
              
              Alert.alert('Success', `Cache cleared and ${stories.length} stories restored.`);
            } catch (error) {
              console.error(error);
              Alert.alert('Error', 'Failed to refresh stories');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeftIcon size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContainer}>
          <View style={styles.envBanner}>
            <View style={styles.envBadge}>
              <Text style={styles.envBadgeText}>{__DEV__ ? 'DEV' : 'PROD'}</Text>
            </View>
            <View style={styles.envInfo}>
              <Text style={styles.envTitle}>Environment Mode</Text>
              <Text style={styles.envDescription}>
                {__DEV__ ? `Publishing to ${targetBranch} branch` : `Publishing to ${targetBranch} branch`}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Content</Text>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => router.push('/archived')}
            >
              <View style={styles.menuItemLeft}>
                <ArchiveIcon size={20} color={colors.text} />
                <Text style={styles.menuItemText}>Archived Stories</Text>
              </View>
              <CaretRightIcon size={20} color={colors.gray} />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>GitHub Configuration</Text>
            <Text style={styles.sectionDescription}>
              Repository: {GITHUB_OWNER}/{GITHUB_REPO}
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>GitHub Personal Access Token *</Text>
              {hasGitHubToken && (
                <View style={styles.configuredBadge}>
                  <CheckCircleIcon size={14} color="#4CAF50" weight="fill" />
                  <Text style={styles.configuredText}>Configured</Text>
                </View>
              )}
            </View>
            <TextInput
              style={styles.input}
              placeholder="github_pat_..."
              placeholderTextColor={colors.lines}
              value={token}
              onChangeText={handleTokenChange}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.hint}>
              Fine-grained token with Contents read/write permission. Saves automatically.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Media Upload Configuration</Text>
            <Text style={styles.sectionDescription}>
              Required for uploading photos and videos
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>App Secret *</Text>
              {hasAppSecret && (
                <View style={styles.configuredBadge}>
                  <CheckCircleIcon size={14} color="#4CAF50" weight="fill" />
                  <Text style={styles.configuredText}>Configured</Text>
                </View>
              )}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter app secret for media uploads..."
              placeholderTextColor={colors.lines}
              value={appSecret}
              onChangeText={handleAppSecretChange}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.hint}>
              Secret key for authenticating media uploads to S3. Saves automatically.
            </Text>
          </View>

          <View style={styles.infoBox}>
            <InfoIcon size={16} color={colors.accent} />
            <Text style={styles.infoText}>
              Your credentials are saved automatically and stored securely on your device.
            </Text>
          </View>

          {/* Option 8: #EF6351 - Bittersweet */}
          <View style={[styles.dangerZone, { backgroundColor: '#FFF5F3', borderColor: '#F8C7BE' }]}>
            <View style={styles.dangerHeader}>
              <WarningIcon size={20} color="#EF6351" />
              <Text style={[styles.dangerTitle, { color: '#EF6351' }]}>Danger Zone</Text>
            </View>
            <Text style={styles.dangerDescription}>
              This will delete all local drafts and re-download published stories from GitHub.
            </Text>
            <TouchableOpacity 
              style={[styles.dangerButton, { backgroundColor: '#EF6351' }]}
              onPress={handleClearCache}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.dangerButtonText}>Clear Cache & Refresh</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lines,
  },
  headerTitle: {
    fontFamily: typography.fonts.display,
    fontSize: 20,
    color: colors.text,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
  },
  envBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: __DEV__ ? colors.accent + '15' : '#4CAF50' + '15',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: __DEV__ ? colors.accent : '#4CAF50',
    marginBottom: 24,
  },
  envBadge: {
    backgroundColor: __DEV__ ? colors.accent : '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 12,
  },
  envBadgeText: {
    color: colors.white,
    fontFamily: typography.fonts.ui,
    fontSize: 12,
    fontWeight: '700',
  },
  envInfo: {
    flex: 1,
  },
  envTitle: {
    fontFamily: typography.fonts.ui,
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 4,
  },
  envDescription: {
    fontFamily: typography.fonts.caption,
    fontSize: 12,
    color: colors.text,
    opacity: 0.7,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: typography.fonts.display,
    fontSize: 24,
    color: colors.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontFamily: typography.fonts.body,
    fontSize: 14,
    color: colors.text,
    opacity: 0.6,
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontFamily: typography.fonts.ui,
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  configuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4CAF50' + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  configuredText: {
    fontFamily: typography.fonts.ui,
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
  },
  input: {
    fontFamily: typography.fonts.body,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.lines,
  },
  hint: {
    fontFamily: typography.fonts.caption,
    fontSize: 12,
    color: colors.text,
    opacity: 0.6,
    marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.accent + '10',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accent + '30',
  },
  infoText: {
    flex: 1,
    fontFamily: typography.fonts.caption,
    fontSize: 12,
    color: colors.text,
    lineHeight: 18,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.lines,
    marginBottom: 12,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontFamily: typography.fonts.ui,
    fontSize: 16,
    color: colors.text,
  },
  dangerZone: {
    marginTop: 32,
    backgroundColor: '#FAF0ED', // warm peachy background
    borderWidth: 2,
    borderColor: '#E8BFB3', // warm terracotta border
    borderRadius: 12,
    padding: 16,
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dangerTitle: {
    fontFamily: typography.fonts.display,
    fontSize: 20,
    color: '#CE6A52',
  },
  dangerDescription: {
    fontFamily: typography.fonts.body,
    fontSize: 13,
    color: colors.text,
    opacity: 0.75,
    marginBottom: 16,
    lineHeight: 20,
  },
  dangerButton: {
    backgroundColor: '#CE6A52',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  dangerButtonText: {
    fontFamily: typography.fonts.ui,
    fontSize: 14,
    color: colors.white,
    fontWeight: '600',
  },
});
