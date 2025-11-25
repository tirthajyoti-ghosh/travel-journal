import { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import Feather from '@expo/vector-icons/Feather';

export default function EditorScreen() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollContent}>
          <TextInput
            style={styles.titleInput}
            placeholder="Story Title..."
            placeholderTextColor={colors.lines}
            value={title}
            onChangeText={setTitle}
            multiline
          />
          
          <View style={styles.metaContainer}>
            <Text style={styles.metaText}>Today • Current Location</Text>
          </View>

          <TextInput
            style={styles.contentInput}
            placeholder="Start writing..."
            placeholderTextColor={colors.lines}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
        </ScrollView>

        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.toolbarButton}>
            <Feather name="image" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
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
    backgroundColor: colors.background,
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
  saveText: {
    color: colors.white,
    fontFamily: typography.fonts.ui,
    fontSize: 14,
  },
  scrollContent: {
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
  },
  metaText: {
    fontFamily: typography.fonts.caption,
    fontSize: 14,
    color: colors.text,
    opacity: 0.6,
  },
  contentInput: {
    fontFamily: typography.fonts.body,
    fontSize: 18,
    color: colors.text,
    lineHeight: 28,
    minHeight: 300,
  },
  toolbar: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: colors.lines,
  },
  toolbarButton: {
    padding: 8,
  },
});
