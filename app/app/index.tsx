import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StoryCard } from '@/components/StoryCard';
import { Story } from '@/types';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import Feather from '@expo/vector-icons/Feather';

// Dummy data
const DUMMY_STORIES: Story[] = [
  {
    id: '1',
    title: 'Slow Morning in Bangkok',
    date: '2025-03-28',
    location: 'Bangkok, Thailand',
    content: 'I woke up to a soft curtain of fog...',
    images: [],
    isDraft: false,
  },
  {
    id: '2',
    title: 'Rainy Day in Chiang Mai',
    date: '2025-04-02',
    location: 'Chiang Mai, Thailand',
    content: 'The rain started early...',
    images: [],
    isDraft: true,
  },
];

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Your Travel Stories</Text>
          </View>
          
          <FlatList
            data={DUMMY_STORIES}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <StoryCard 
                story={item} 
                onPress={() => router.push(`/viewer/${item.id}`)} 
              />
            )}
            contentContainerStyle={styles.listContent}
          />

          <TouchableOpacity 
            style={styles.fab} 
            onPress={() => router.push('/editor')}
          >
            <Feather name="plus" size={32} color={colors.white} />
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    paddingVertical: 20,
    marginBottom: 10,
  },
  headerTitle: {
    fontFamily: typography.fonts.display,
    fontSize: 36,
    color: colors.text,
  },
  listContent: {
    paddingBottom: 100,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});
