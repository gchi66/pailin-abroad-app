import { env } from '@/src/config/env';
import { supabase } from '@/src/lib/supabase';
import type { LessonComment } from '@/src/types/discussion';

const COMMENT_SELECT =
  'id,lesson_id,user_id,body,body_th,created_at,parent_comment_id,pinned,users(username,email,avatar_image,is_admin)';

const throwDiscussionError = (message: string) => {
  throw new Error(message || 'The discussion could not be updated.');
};

export async function fetchLessonComments(lessonId: string): Promise<LessonComment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select(COMMENT_SELECT)
    .eq('lesson_id', lessonId)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    throwDiscussionError(error.message);
  }

  return (data ?? []) as unknown as LessonComment[];
}

export async function createLessonComment(params: {
  lessonId: string;
  userId: string;
  body: string;
  parentCommentId?: string | null;
}): Promise<LessonComment> {
  const { data, error } = await supabase
    .from('comments')
    .insert({
      lesson_id: params.lessonId,
      user_id: params.userId,
      body: params.body,
      parent_comment_id: params.parentCommentId ?? null,
    })
    .select(COMMENT_SELECT)
    .single();

  if (error || !data) {
    throwDiscussionError(error?.message ?? 'The comment could not be posted.');
  }

  return data as unknown as LessonComment;
}

export async function setLessonCommentPinned(commentId: string, pinned: boolean) {
  const { error } = await supabase.from('comments').update({ pinned }).eq('id', commentId);
  if (error) {
    throwDiscussionError(error.message);
  }
}

export async function deleteLessonComment(commentId: string) {
  const { error } = await supabase.from('comments').delete().eq('id', commentId);
  if (error) {
    throwDiscussionError(error.message);
  }
}

export async function notifyNewLessonComment(commentId: string) {
  const baseUrl = env.apiBaseUrl.trim().replace(/\/+$/, '');
  if (!baseUrl) {
    return;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return;
  }

  const response = await fetch(`${baseUrl}/api/notify-comment`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ comment_id: commentId }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Comment notification failed (${response.status}).`);
  }
}
