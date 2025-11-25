import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import Feather from '@expo/vector-icons/Feather';

export default function ViewerScreen() {
  const { id } = useLocalSearchParams();
  
  // Mock data fetch based on id
  const story = {
    title: 'Slow Morning in Bangkok',
    date: '2025-03-28',
    location: 'Bangkok, Thailand',
    content: 'I woke up to a soft curtain of fog...',
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/editor')}>
            <Feather name="edit-2" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollContent}>
          <Text style={styles.title}>{story.title}</Text>
          <Text style={styles.meta}>{story.date} • {story.location}</Text>
          <Text style={styles.content}>{story.content}</Text>
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
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: typography.fonts.display,
    fontSize: 32,
    color: colors.text,
    marginBottom: 8,
  },
  meta: {
    fontFamily: typography.fonts.caption,
    fontSize: 14,
    color: colors.text,
    opacity: 0.6,
    marginBottom: 24,
  },
  content: {
    fontFamily: typography.fonts.body,
    fontSize: 18,
    color: colors.text,
    lineHeight: 28,
  },
});
