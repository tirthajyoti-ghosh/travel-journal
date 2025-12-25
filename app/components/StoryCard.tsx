import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { PencilLine, CheckCircle } from 'phosphor-react-native';
import { Story } from '@/types';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

interface StoryCardProps {
  story: Story;
  onPress: () => void;
  onLongPress?: (event: any) => void;
}

function extractBodyPreview(htmlContent: string): string {
  // Remove HTML tags
  const textContent = htmlContent.replace(/<[^>]*>/g, ' ');
  // Remove extra whitespace and newlines
  const cleanedText = textContent.replace(/\s+/g, ' ').trim();
  // Return first line (up to ~80 chars)
  return cleanedText.substring(0, 80);
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
  if (diffMins < 2880) return 'Yesterday';
  return `${Math.floor(diffMins / 1440)} days ago`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

export function StoryCard({ story, onPress, onLongPress }: StoryCardProps) {
  const isDraft = story.isDraft || !story.isPublished;
  const bodyPreview = extractBodyPreview(story.content || '');
  
  return (
    <TouchableOpacity
      style={[
        styles.card,
        isDraft ? styles.cardDraft : styles.cardPublished
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      {/* Status Badge */}
      <View style={styles.statusRow}>
        {isDraft ? (
          <View style={styles.draftBadge}>
            <PencilLine size={12} color={colors.accent} />
            <Text style={styles.draftText}>DRAFT</Text>
          </View>
        ) : (
          <View style={styles.publishedBadge}>
            <CheckCircle size={12} color="#10B981" weight="fill" />
            <Text style={styles.publishedText}>Published</Text>
          </View>
        )}
      </View>

      {/* Title */}
      {story.title ? (
        <Text style={styles.title} numberOfLines={1}>
          {story.title}
        </Text>
      ) : null}

      {/* Body Preview */}
      {bodyPreview ? (
        <Text style={styles.bodyPreview} numberOfLines={1}>
          {bodyPreview}
        </Text>
      ) : null}

      {/* Metadata */}
      <Text style={styles.meta}>
        {isDraft 
          ? `Last edited: ${formatRelativeTime(story.updatedAt || story.createdAt || new Date().toISOString())}`
          : story.location 
            ? `${formatDate(story.publishedAt || story.date)} • ${story.location}`
            : formatDate(story.publishedAt || story.date)
        }
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardDraft: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.accent,
  },
  cardPublished: {
    backgroundColor: '#F7F3E8',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#E2D9CA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statusRow: {
    marginBottom: 12,
  },
  draftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.accent + '20',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  draftText: {
    fontFamily: typography.fonts.ui,
    fontSize: 11,
    fontWeight: '600',
    color: colors.accent,
    letterSpacing: 0.5,
  },
  publishedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  publishedText: {
    fontFamily: typography.fonts.ui,
    fontSize: 12,
    color: '#10B981',
  },
  title: {
    fontFamily: typography.fonts.display,
    fontSize: 24,
    color: colors.text,
    marginBottom: 8,
    lineHeight: 28,
  },
  bodyPreview: {
    fontFamily: typography.fonts.body,
    fontSize: 14,
    color: colors.text,
    opacity: 0.7,
    marginBottom: 8,
    lineHeight: 20,
  },
  meta: {
    fontFamily: typography.fonts.caption,
    fontSize: 13,
    color: colors.text,
    opacity: 0.6,
  },
});
