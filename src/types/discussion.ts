export type DiscussionUser = {
  username: string | null;
  email: string | null;
  avatar_image: string | null;
  is_admin: boolean | null;
};

export type LessonComment = {
  id: string;
  lesson_id: string;
  user_id: string;
  body: string;
  body_th: string | null;
  created_at: string;
  parent_comment_id: string | null;
  pinned: boolean;
  users: DiscussionUser | null;
};

export type NestedLessonComment = LessonComment & {
  replies: NestedLessonComment[];
};
