import { ScriptAwareTextInput } from '@/src/components/ui/ScriptAwareTextInput';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  createLessonComment,
  deleteLessonComment,
  fetchLessonComments,
  notifyNewLessonComment,
  setLessonCommentPinned,
} from '@/src/api/discussion';
import { getLessonById } from '@/src/api/lessons';
import { AppText } from '@/src/components/ui/AppText';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { resolveAvatarSource } from '@/src/lib/avatar';
import { theme } from '@/src/theme/theme';
import type { LessonComment, NestedLessonComment } from '@/src/types/discussion';
import type { LessonListItem } from '@/src/types/lesson';

type Props = {
  lessonId: string;
};

type ComposerTarget = {
  parent: LessonComment | null;
};

const getCopy = (language: 'en' | 'th') =>
  language === 'th'
    ? {
        discussion: 'การพูดคุย',
        discussionPrompt: 'หัวข้อสนทนา',
        addComment: 'เพิ่มความคิดเห็น',
        comments: 'ความคิดเห็น',
        loading: 'กำลังโหลดความคิดเห็น…',
        empty: 'มาเป็นคนแรกที่เริ่มการสนทนากันเลย',
        loadError: 'ไม่สามารถโหลดการพูดคุยได้ กรุณาลองอีกครั้ง',
        retry: 'ลองอีกครั้ง',
        reply: 'ตอบกลับ',
        replyTo: 'ตอบกลับถึง',
        newComment: 'ความคิดเห็นใหม่',
        placeholder: 'เขียนความคิดเห็นของคุณ…',
        post: 'โพสต์',
        posting: 'กำลังโพสต์…',
        cancel: 'ยกเลิก',
        signInTitle: 'เข้าสู่ระบบเพื่อแสดงความคิดเห็น',
        signInBody: 'คุณต้องมีบัญชีผู้ใช้ก่อนจึงจะแสดงความคิดเห็นได้',
        signIn: 'เข้าสู่ระบบ',
        actions: 'จัดการความคิดเห็น',
        pin: 'ปักหมุด',
        unpin: 'ยกเลิกการปักหมุด',
        delete: 'ลบ',
        deleteTitle: 'ลบความคิดเห็นนี้หรือไม่?',
        deleteBody: 'ความคิดเห็นตอบกลับทั้งหมดจะถูกลบด้วย',
        failedPost: 'ไม่สามารถโพสต์ความคิดเห็นได้ กรุณาลองอีกครั้ง',
        failedUpdate: 'ไม่สามารถอัปเดตความคิดเห็นได้ กรุณาลองอีกครั้ง',
        anonymous: 'ไม่ระบุชื่อ',
        close: 'ปิดการพูดคุย',
      }
    : {
        discussion: 'Discussion',
        discussionPrompt: 'Discussion prompt',
        addComment: 'Add a comment',
        comments: 'Comments',
        loading: 'Loading comments…',
        empty: 'Be the first to start the conversation.',
        loadError: 'The discussion could not be loaded. Please try again.',
        retry: 'Try again',
        reply: 'Reply',
        replyTo: 'Reply to',
        newComment: 'New comment',
        placeholder: 'Write your comment…',
        post: 'Post',
        posting: 'Posting…',
        cancel: 'Cancel',
        signInTitle: 'Sign in to comment',
        signInBody: 'You must have an account to leave a comment.',
        signIn: 'Sign in',
        actions: 'Comment actions',
        pin: 'Pin',
        unpin: 'Unpin',
        delete: 'Delete',
        deleteTitle: 'Delete this comment?',
        deleteBody: 'Any replies to it will also be deleted.',
        failedPost: 'The comment could not be posted. Please try again.',
        failedUpdate: 'The comment could not be updated. Please try again.',
        anonymous: 'Anonymous',
        close: 'Close discussion',
      };

const formatCommentDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

const nestComments = (comments: LessonComment[]): NestedLessonComment[] => {
  const byId = new Map<string, NestedLessonComment>();
  comments.forEach((comment) => byId.set(comment.id, { ...comment, replies: [] }));

  const roots: NestedLessonComment[] = [];
  comments.forEach((comment) => {
    const current = byId.get(comment.id);
    if (!current) return;
    const parent = comment.parent_comment_id ? byId.get(comment.parent_comment_id) : null;
    if (parent) {
      parent.replies.push(current);
    } else {
      roots.push(current);
    }
  });
  return roots;
};

const countNestedComments = (comments: NestedLessonComment[]): number =>
  comments.reduce((total, comment) => total + 1 + countNestedComments(comment.replies), 0);

const getDisplayName = (comment: LessonComment, anonymous: string) =>
  comment.users?.username?.trim() || comment.users?.email?.trim() || anonymous;

function Avatar({ comment, anonymous, size = 38 }: { comment: LessonComment; anonymous: string; size?: number }) {
  const displayName = getDisplayName(comment, anonymous);
  const source = resolveAvatarSource(comment.users?.avatar_image);

  return source ? (
    <Image source={source} contentFit="cover" style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]} />
  ) : (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <AppText style={styles.avatarLetter}>{displayName.charAt(0).toUpperCase()}</AppText>
    </View>
  );
}

type CommentCardProps = {
  comment: NestedLessonComment;
  depth: number;
  isAdmin: boolean;
  anonymous: string;
  replyLabel: string;
  actionsLabel: string;
  onReply: (comment: LessonComment) => void;
  onActions: (comment: LessonComment) => void;
};

function CommentCard({
  comment,
  depth,
  isAdmin,
  anonymous,
  replyLabel,
  actionsLabel,
  onReply,
  onActions,
}: CommentCardProps) {
  const displayName = getDisplayName(comment, anonymous);

  return (
    <View style={[styles.commentBranch, depth > 0 ? styles.commentBranchNested : null]}>
      {depth > 0 ? <View style={styles.replyGuide} /> : null}
      <View style={styles.commentCard}>
        <View style={styles.commentHeader}>
          <Avatar comment={comment} anonymous={anonymous} />
          <View style={styles.commentAuthorWrap}>
            <AppText numberOfLines={1} style={styles.commentAuthor}>
              {displayName.toUpperCase()}
            </AppText>
          </View>
          <AppText numberOfLines={1} style={styles.commentDate}>
            {formatCommentDate(comment.created_at)}
          </AppText>
          {isAdmin ? (
            <Pressable
              accessibilityLabel={actionsLabel}
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => onActions(comment)}
              style={styles.moreButton}>
              <MaterialIcons name="more-horiz" size={19} color={theme.colors.text} />
            </Pressable>
          ) : null}
        </View>

        {comment.body ? (
          <AppText language="en" style={styles.commentBody}>
            {comment.body}
          </AppText>
        ) : null}
        {comment.body_th ? (
          <AppText language="th" style={[styles.commentBody, styles.commentBodyThai]}>
            {comment.body_th}
          </AppText>
        ) : null}

        {isAdmin ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => onReply(comment)}
            style={styles.replyButton}>
            <MaterialIcons name="subdirectory-arrow-left" size={15} color={theme.colors.mutedText} />
            <AppText style={styles.replyText}>{replyLabel}</AppText>
          </Pressable>
        ) : null}
      </View>

      {comment.replies.map((reply) => (
        <CommentCard
          key={reply.id}
          actionsLabel={actionsLabel}
          anonymous={anonymous}
          comment={reply}
          depth={depth + 1}
          isAdmin={isAdmin}
          onActions={onActions}
          onReply={onReply}
          replyLabel={replyLabel}
        />
      ))}
    </View>
  );
}

export function LessonDiscussionScreen({ lessonId }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { uiLanguage } = useUiLanguage();
  const { hasAccount, profile, user } = useAppSession();
  const copy = useMemo(() => getCopy(uiLanguage), [uiLanguage]);
  const [lesson, setLesson] = useState<LessonListItem | null>(null);
  const [comments, setComments] = useState<LessonComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [composerTarget, setComposerTarget] = useState<ComposerTarget | null>(null);
  const [draft, setDraft] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const loadDiscussion = useCallback(
    async (refreshing = false) => {
      if (!lessonId) {
        setLoadError(copy.loadError);
        setIsLoading(false);
        return;
      }

      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setLoadError('');
      try {
        const [nextLesson, nextComments] = await Promise.all([
          getLessonById(lessonId),
          fetchLessonComments(lessonId),
        ]);
        setLesson(nextLesson);
        setComments(nextComments);
      } catch (error) {
        console.warn('[discussion] load failed', error);
        setLoadError(copy.loadError);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [copy.loadError, lessonId]
  );

  useEffect(() => {
    void loadDiscussion();
  }, [loadDiscussion]);

  const promptComment = useMemo(
    () => comments.find((comment) => comment.pinned && !comment.parent_comment_id) ?? null,
    [comments]
  );
  const discussionRoots = useMemo(
    () => nestComments(comments.filter((comment) => comment.id !== promptComment?.id)),
    [comments, promptComment?.id]
  );
  const commentCount = useMemo(() => countNestedComments(discussionRoots), [discussionRoots]);
  const isAdmin = Boolean(profile?.is_admin);
  const lessonNumber = lesson?.level && lesson?.lesson_order ? `${lesson.level}.${lesson.lesson_order}` : '';

  const requestComposer = (parent: LessonComment | null) => {
    if (!hasAccount || !user) {
      Alert.alert(copy.signInTitle, copy.signInBody, [
        { text: copy.cancel, style: 'cancel' },
        { text: copy.signIn, onPress: () => router.push('/account/auth') },
      ]);
      return;
    }
    setDraft('');
    setComposerTarget({ parent });
  };

  const closeComposer = () => {
    if (isPosting) return;
    setComposerTarget(null);
    setDraft('');
  };

  const submitComment = async () => {
    const body = draft.trim();
    if (!body || !user || !composerTarget) return;

    setIsPosting(true);
    try {
      const created = await createLessonComment({
        lessonId,
        userId: user.id,
        body,
        parentCommentId: composerTarget.parent?.id ?? null,
      });
      setComments((current) => [...current, created]);
      const isTopLevel = !composerTarget.parent;
      setComposerTarget(null);
      setDraft('');

      if (isTopLevel && !isAdmin) {
        void notifyNewLessonComment(created.id).catch((error) =>
          console.warn('[discussion] notification failed', error)
        );
      }
    } catch (error) {
      console.warn('[discussion] post failed', error);
      Alert.alert(copy.discussion, error instanceof Error ? error.message : copy.failedPost);
    } finally {
      setIsPosting(false);
    }
  };

  const removeCommentLocally = (commentId: string) => {
    setComments((current) => {
      const idsToRemove = new Set([commentId]);
      let changed = true;
      while (changed) {
        changed = false;
        current.forEach((comment) => {
          if (comment.parent_comment_id && idsToRemove.has(comment.parent_comment_id) && !idsToRemove.has(comment.id)) {
            idsToRemove.add(comment.id);
            changed = true;
          }
        });
      }
      return current.filter((comment) => !idsToRemove.has(comment.id));
    });
  };

  const confirmDelete = (comment: LessonComment) => {
    Alert.alert(copy.deleteTitle, copy.deleteBody, [
      { text: copy.cancel, style: 'cancel' },
      {
        text: copy.delete,
        style: 'destructive',
        onPress: () => {
          void deleteLessonComment(comment.id)
            .then(() => removeCommentLocally(comment.id))
            .catch((error) => {
              console.warn('[discussion] delete failed', error);
              Alert.alert(copy.discussion, copy.failedUpdate);
            });
        },
      },
    ]);
  };

  const showCommentActions = (comment: LessonComment) => {
    Alert.alert(copy.actions, undefined, [
      {
        text: comment.pinned ? copy.unpin : copy.pin,
        onPress: () => {
          const pinned = !comment.pinned;
          void setLessonCommentPinned(comment.id, pinned)
            .then(() =>
              setComments((current) =>
                current.map((entry) => (entry.id === comment.id ? { ...entry, pinned } : entry))
              )
            )
            .catch((error) => {
              console.warn('[discussion] pin failed', error);
              Alert.alert(copy.discussion, copy.failedUpdate);
            });
        },
      },
      { text: copy.delete, style: 'destructive', onPress: () => confirmDelete(comment) },
      { text: copy.cancel, style: 'cancel' },
    ]);
  };

  const composerTitle = composerTarget?.parent
    ? `${copy.replyTo} ${getDisplayName(composerTarget.parent, copy.anonymous)}`
    : copy.newComment;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 28 }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => void loadDiscussion(true)} tintColor={theme.colors.accent} />
        }>
        <View style={styles.pageShell}>
          <View style={styles.topRow}>
            <View style={styles.titleGroup}>
              {lessonNumber ? <AppText style={styles.lessonLabel}>{`LESSON ${lessonNumber}`}</AppText> : null}
              <View style={styles.titleRow}>
                <MaterialIcons name="forum" size={23} color={theme.colors.text} />
                <AppText language={uiLanguage} style={styles.title}>
                  {copy.discussion}
                </AppText>
              </View>
            </View>
            <Pressable
              accessibilityLabel={copy.close}
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => router.back()}
              style={styles.closeButton}>
              <MaterialIcons name="close" size={27} color={theme.colors.text} />
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={theme.colors.accent} />
              <AppText language={uiLanguage} style={styles.stateText}>{copy.loading}</AppText>
            </View>
          ) : loadError ? (
            <View style={styles.stateCard}>
              <AppText language={uiLanguage} style={styles.stateText}>{loadError}</AppText>
              <Pressable accessibilityRole="button" onPress={() => void loadDiscussion()} style={styles.retryButton}>
                <AppText language={uiLanguage} style={styles.retryText}>{copy.retry}</AppText>
              </Pressable>
            </View>
          ) : (
            <>
              {promptComment ? (
                <View style={styles.promptCard}>
                  <View style={styles.promptHeader}>
                    <Avatar comment={promptComment} anonymous={copy.anonymous} size={36} />
                    <AppText style={styles.promptAuthor}>
                      {getDisplayName(promptComment, copy.anonymous).toUpperCase()}
                    </AppText>
                    <AppText language={uiLanguage} style={styles.promptBadge}>{copy.discussionPrompt.toUpperCase()}</AppText>
                    <Image source={require('@/assets/images/discussion-pin.png')} contentFit="contain" style={styles.pinIcon} />
                  </View>
                  {promptComment.body ? <AppText language="en" style={styles.promptBody}>{promptComment.body}</AppText> : null}
                  {promptComment.body_th ? <AppText language="th" style={styles.promptThai}>{promptComment.body_th}</AppText> : null}
                </View>
              ) : null}

              <Pressable
                accessibilityRole="button"
                onPress={() => requestComposer(null)}
                style={({ pressed }) => [styles.addButton, pressed ? styles.pressed : null]}>
                <AppText language={uiLanguage} style={styles.addButtonText}>{`+ ${copy.addComment.toUpperCase()}`}</AppText>
              </Pressable>

              <AppText language={uiLanguage} style={styles.commentsTitle}>
                {`${copy.comments} (${commentCount})`}
              </AppText>

              {commentCount === 0 ? (
                <View style={styles.emptyCard}>
                  <AppText language={uiLanguage} style={styles.emptyText}>{copy.empty}</AppText>
                </View>
              ) : (
                <View style={styles.commentsList}>
                  {discussionRoots.map((comment) => (
                    <CommentCard
                      key={comment.id}
                      actionsLabel={copy.actions}
                      anonymous={copy.anonymous}
                      comment={comment}
                      depth={0}
                      isAdmin={isAdmin}
                      onActions={showCommentActions}
                      onReply={(target) => requestComposer(target)}
                      replyLabel={copy.reply}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <Modal animationType="slide" onRequestClose={closeComposer} transparent visible={Boolean(composerTarget)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalRoot}>
          <Pressable accessibilityRole="button" onPress={closeComposer} style={styles.modalBackdrop} />
          <View style={[styles.composerSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.composerHeader}>
              <AppText language={uiLanguage} style={styles.composerTitle}>{composerTitle}</AppText>
              <Pressable accessibilityLabel={copy.cancel} accessibilityRole="button" hitSlop={8} onPress={closeComposer}>
                <MaterialIcons name="close" size={24} color={theme.colors.text} />
              </Pressable>
            </View>
            <ScriptAwareTextInput
              autoFocus
              editable={!isPosting}
              maxLength={4000}
              multiline
              onChangeText={setDraft}
              placeholder={copy.placeholder}
              placeholderTextColor="#777777"
              style={[styles.composerInput, uiLanguage === 'th' ? styles.thaiInput : styles.englishInput]}
              textAlignVertical="top"
              value={draft}
            />
            <Pressable
              accessibilityRole="button"
              disabled={isPosting || !draft.trim()}
              onPress={() => void submitComment()}
              style={[styles.postButton, isPosting || !draft.trim() ? styles.postButtonDisabled : null]}>
              {isPosting ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
              <AppText language={uiLanguage} style={styles.postButtonText}>{isPosting ? copy.posting : copy.post}</AppText>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { flexGrow: 1, paddingHorizontal: 14 },
  pageShell: { width: '100%', maxWidth: 620, alignSelf: 'center' },
  topRow: { minHeight: 92, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingTop: 19, paddingHorizontal: 2 },
  titleGroup: { gap: 7 },
  lessonLabel: { fontSize: 10, lineHeight: 14, fontWeight: '700', letterSpacing: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 24, lineHeight: 31, fontWeight: '700' },
  closeButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', marginTop: -8 },
  stateCard: { minHeight: 130, alignItems: 'center', justifyContent: 'center', gap: 14, borderWidth: 1, borderColor: '#D6D6D6', borderRadius: 12, backgroundColor: '#FFFFFF', padding: 20 },
  stateText: { textAlign: 'center', color: theme.colors.mutedText, fontSize: 14 },
  retryButton: { borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 8, backgroundColor: '#AFE6FA', paddingVertical: 9, paddingHorizontal: 18 },
  retryText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  promptCard: { borderWidth: 1.5, borderColor: theme.colors.accent, borderRadius: 13, backgroundColor: '#EAF8FD', padding: 16, gap: 10 },
  promptHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  promptAuthor: { flex: 1, fontSize: 11, lineHeight: 16, fontWeight: '700', letterSpacing: 0.6 },
  promptBadge: { color: '#165CE5', fontSize: 8, lineHeight: 12, fontWeight: '700', letterSpacing: 0.2 },
  pinIcon: { width: 19, height: 19 },
  promptBody: { fontSize: 14, lineHeight: 21 },
  promptThai: { color: '#777777', fontSize: 12, lineHeight: 19 },
  avatar: { borderWidth: 0.7, borderColor: '#222222', backgroundColor: '#D9F1FA' },
  avatarFallback: { borderWidth: 0.7, borderColor: '#222222', backgroundColor: '#D9F1FA', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 14, fontWeight: '700' },
  addButton: { minHeight: 42, marginTop: 15, marginHorizontal: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1.3, borderColor: theme.colors.border, borderRadius: 7, backgroundColor: '#ADE4F7', boxShadow: `3px 3px 0px ${theme.colors.shadow}` },
  addButtonText: { fontSize: 11, lineHeight: 16, fontWeight: '700' },
  pressed: { opacity: 0.72 },
  commentsTitle: { marginTop: 34, marginBottom: 12, fontSize: 18, lineHeight: 25, fontWeight: '700' },
  commentsList: { gap: 14 },
  emptyCard: { padding: 18, borderWidth: 1, borderColor: '#D3D3D3', borderRadius: 11, backgroundColor: '#FFFFFF' },
  emptyText: { color: theme.colors.mutedText, textAlign: 'center', fontSize: 13 },
  commentBranch: { gap: 12 },
  commentBranchNested: { marginLeft: 24, position: 'relative' },
  replyGuide: { position: 'absolute', left: -13, top: -13, width: 12, height: 42, borderLeftWidth: 1, borderBottomWidth: 1, borderColor: '#D7D7D7' },
  commentCard: { borderWidth: 1.1, borderColor: theme.colors.border, borderRadius: 12, backgroundColor: '#FFFFFF', padding: 12, gap: 7, boxShadow: `3px 3px 0px ${theme.colors.shadow}` },
  commentHeader: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentAuthorWrap: { flex: 1, minWidth: 48 },
  commentAuthor: { fontSize: 11, lineHeight: 16, fontWeight: '700', letterSpacing: 0.6 },
  commentDate: { maxWidth: 118, color: '#777777', fontSize: 9, lineHeight: 13 },
  moreButton: { width: 22, height: 30, alignItems: 'center', justifyContent: 'center' },
  commentBody: { fontSize: 13, lineHeight: 20 },
  commentBodyThai: { color: '#5F5F5F' },
  replyButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 },
  replyText: { color: theme.colors.mutedText, fontSize: 10, lineHeight: 15 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.42)' },
  composerSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1.5, borderBottomWidth: 0, borderColor: theme.colors.border, backgroundColor: '#FFFFFF', padding: 18, gap: 14 },
  composerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  composerTitle: { flex: 1, fontSize: 18, lineHeight: 25, fontWeight: '700' },
  composerInput: { minHeight: 128, maxHeight: 250, borderWidth: 1.3, borderColor: theme.colors.border, borderRadius: 11, backgroundColor: '#FAFAFA', color: theme.colors.text, padding: 13, fontSize: 15, lineHeight: 22 },
  englishInput: { fontFamily: theme.typography.fontFaces.en.regular },
  thaiInput: { fontFamily: theme.typography.fontFaces.th.regular },
  postButton: { minHeight: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.3, borderColor: theme.colors.border, borderRadius: 9, backgroundColor: '#2860E8' },
  postButtonDisabled: { opacity: 0.48 },
  postButtonText: { color: '#FFFFFF', fontSize: 12, lineHeight: 17, fontWeight: '700', textTransform: 'uppercase' },
});
