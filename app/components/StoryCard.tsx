import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Story } from '@/types';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

interface StoryCardProps {
  story: Story;
  onPress: () => void;
}

export function StoryCard({ story, onPress }: StoryCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.polaroid}>
        {story.coverImage ? (
          <Image source={{ uri: story.coverImage }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.placeholder]} />
        )}
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title} numberOfLines={1}>{story.title}</Text>
        <Text style={styles.date}>{story.date} • {story.location}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.polaroidFrame,
    padding: 12,
    marginBottom: 16,
    borderRadius: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  polaroid: {
    width: 60,
    height: 60,
    backgroundColor: colors.white,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    transform: [{ rotate: '-2deg' }],
    marginRight: 16,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#eee',
  },
  placeholder: {
    backgroundColor: colors.lines,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: typography.fonts.display,
    fontSize: 22,
    color: colors.text,
    marginBottom: 4,
  },
  date: {
    fontFamily: typography.fonts.caption,
    fontSize: 12,
    color: colors.text,
    opacity: 0.6,
  },
});
