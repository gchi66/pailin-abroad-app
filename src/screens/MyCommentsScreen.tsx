import React, { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { CommentLesson, fetchCommentLessons, fetchRepliesToComments, fetchUserComments } from '@/src/api/discussion';
import { AccountPageHeader } from '@/src/components/ui/AccountPageHeader';
import { AppText } from '@/src/components/ui/AppText';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
import { FLOATING_TAB_BAR_PAGE_BOTTOM_PADDING } from '@/src/components/navigation/layout';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { resolveAvatarSource } from '@/src/lib/avatar';
import { theme } from '@/src/theme/theme';
import type { LessonComment } from '@/src/types/discussion';

type UiLanguage = 'en' | 'th';

const formatDate = (value: string, language: UiLanguage) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(language === 'th' ? 'th-TH-u-ca-gregory' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

function CommentCard({ comment, language, onPress, nested = false }: { comment: LessonComment; language: UiLanguage; onPress: () => void; nested?: boolean }) {
  const name = comment.users?.username?.trim() || comment.users?.email?.trim() || (language === 'th' ? 'ผู้เรียน' : 'Learner');
  const source = resolveAvatarSource(comment.users?.avatar_image);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.commentCard, nested && styles.replyCard]}>
      {source ? <Image source={source} style={styles.avatar} resizeMode="cover" /> : <View style={styles.avatarFallback}><AppText variant="caption">{name.charAt(0).toUpperCase()}</AppText></View>}
      <View style={styles.commentContent}>
        <View style={styles.commentMeta}>
          <AppText language={language} variant="caption" numberOfLines={1} style={styles.author}>{name}</AppText>
          <AppText language={language} variant="caption" style={styles.date}>{formatDate(comment.created_at, language)}</AppText>
        </View>
        <AppText language={language} variant="body" style={styles.commentBody}>{language === 'th' && comment.body_th ? comment.body_th : comment.body}</AppText>
      </View>
    </Pressable>
  );
}

export function MyCommentsScreen() {
  const router = useRouter();
  const { user } = useAppSession();
  const { uiLanguage } = useUiLanguage();
  const [comments, setComments] = useState<LessonComment[]>([]);
  const [replies, setReplies] = useState<LessonComment[]>([]);
  const [lessons, setLessons] = useState<CommentLesson[]>([]);
  const [newestFirst, setNewestFirst] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    if (!user?.id) {
      setComments([]);
      setReplies([]);
      setLessons([]);
      setIsLoading(false);
      return () => { active = false; };
    }
    setIsLoading(true);
    setError(false);
    void (async () => {
      try {
        const nextComments = await fetchUserComments(user.id);
        const [replyResult, lessonResult] = await Promise.allSettled([
          fetchRepliesToComments(nextComments.map((comment) => comment.id)),
          fetchCommentLessons([...new Set(nextComments.map((comment) => comment.lesson_id))]),
        ]);
        if (active) {
          setComments(nextComments);
          setReplies(replyResult.status === 'fulfilled' ? replyResult.value : []);
          setLessons(lessonResult.status === 'fulfilled' ? lessonResult.value : []);
        }
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user?.id]));

  const sortedComments = useMemo(() => [...comments].sort((a, b) => newestFirst
    ? Date.parse(b.created_at) - Date.parse(a.created_at)
    : Date.parse(a.created_at) - Date.parse(b.created_at)), [comments, newestFirst]);
  const lessonById = useMemo(() => new Map(lessons.map((lesson) => [lesson.id, lesson])), [lessons]);
  const repliesByParent = useMemo(() => {
    const map = new Map<string, LessonComment[]>();
    replies.forEach((reply) => {
      if (!reply.parent_comment_id) return;
      map.set(reply.parent_comment_id, [...(map.get(reply.parent_comment_id) ?? []), reply]);
    });
    return map;
  }, [replies]);

  const copy = uiLanguage === 'th'
    ? { title: 'ความคิดเห็นของฉัน', back: 'กลับ', subtitle: 'ดูความคิดเห็นและการตอบกลับของคุณ', loading: 'กำลังโหลดความคิดเห็น...', empty: 'คุณยังไม่ได้แสดงความคิดเห็น', error: 'โหลดความคิดเห็นไม่ได้', lesson: 'บทเรียน', newest: 'ใหม่สุดก่อน', oldest: 'เก่าสุดก่อน', sort: 'เรียงตาม' }
    : { title: 'My Comments', back: 'Back', subtitle: 'View your comments and replies.', loading: 'Loading comments...', empty: 'You have not posted any comments yet.', error: 'Could not load comments.', lesson: 'Lesson', newest: 'Newest first', oldest: 'Oldest first', sort: 'Sort' };
  const openLesson = (lessonId: string) => router.push({ pathname: '/lesson-discussion/[id]', params: { id: lessonId } });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ResponsivePageShell>
        <AccountPageHeader language={uiLanguage} title={copy.title} backLabel={copy.back} onBackPress={() => router.push('/(tabs)/account')} subtitle={copy.subtitle} illustration={require('@/assets/images/characters/pailin_thumbs_up_head.webp')} />
        <Pressable accessibilityRole="button" accessibilityLabel={`${copy.sort}: ${newestFirst ? copy.newest : copy.oldest}`} onPress={() => setNewestFirst((value) => !value)} style={styles.sortButton}>
          <AppText language={uiLanguage} variant="caption" style={styles.sortText}>{copy.sort}: {newestFirst ? copy.newest : copy.oldest}</AppText>
          <MaterialIcons name="keyboard-arrow-down" size={18} color={theme.colors.text} />
        </Pressable>
        {isLoading || error || comments.length === 0 ? (
          <AppText language={uiLanguage} variant="muted" style={styles.state}>{isLoading ? copy.loading : error ? copy.error : copy.empty}</AppText>
        ) : (
          <View style={styles.list}>
            {sortedComments.map((comment) => {
              const lesson = lessonById.get(comment.lesson_id);
              const number = lesson?.level && lesson?.lesson_order ? `${lesson.level}.${lesson.lesson_order}` : '';
              const focus = uiLanguage === 'th' ? lesson?.focus_th || lesson?.title_th : lesson?.focus || lesson?.title;
              const commentReplies = repliesByParent.get(comment.id) ?? [];
              return (
                <View key={comment.id} style={styles.thread}>
                  <Pressable accessibilityRole="button" onPress={() => openLesson(comment.lesson_id)} style={styles.lessonRow}>
                    <AppText language={uiLanguage} variant="caption" style={styles.lessonNumber}>{copy.lesson} {number}</AppText>
                    {focus ? <AppText language={uiLanguage} variant="caption" numberOfLines={1} style={styles.lessonFocus}>{focus}</AppText> : null}
                    <MaterialIcons name="chevron-right" size={24} color={theme.colors.text} />
                  </Pressable>
                  <CommentCard comment={comment} language={uiLanguage} onPress={() => openLesson(comment.lesson_id)} />
                  {commentReplies.length > 0 ? <View style={styles.replies}>
                    {commentReplies.map((reply) => <CommentCard key={reply.id} comment={reply} language={uiLanguage} onPress={() => openLesson(comment.lesson_id)} nested />)}
                  </View> : null}
                </View>
              );
            })}
          </View>
        )}
      </ResponsivePageShell>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, paddingBottom: FLOATING_TAB_BAR_PAGE_BOTTOM_PADDING },
  sortButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#888888', borderRadius: 999, paddingHorizontal: 13, minHeight: 32 },
  sortText: { fontSize: 12 },
  state: { marginTop: theme.spacing.lg },
  list: { gap: 18, marginTop: 14 },
  thread: { gap: 6 },
  lessonRow: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 10 },
  lessonNumber: { fontWeight: theme.typography.weights.bold },
  lessonFocus: { flex: 1 },
  commentCard: { flexDirection: 'row', gap: 10, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 13, padding: 12, boxShadow: `4px 4px 0px ${theme.colors.shadow}` },
  replyCard: { backgroundColor: '#F1FBFF', borderColor: '#91CAFF', boxShadow: 'none' },
  avatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: '#777777', backgroundColor: '#BCECFF' },
  avatarFallback: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: '#777777', backgroundColor: '#BCECFF', alignItems: 'center', justifyContent: 'center' },
  commentContent: { flex: 1, minWidth: 0 },
  commentMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  author: { flex: 1, fontSize: 12, fontWeight: theme.typography.weights.semibold, textTransform: 'uppercase' },
  date: { fontSize: 10, color: '#666666' },
  commentBody: { fontSize: 14, lineHeight: 22 },
  replies: { marginLeft: 26, borderLeftWidth: 1, borderLeftColor: '#D8D8D8', paddingLeft: 13, paddingTop: 4, gap: 8 },
});
