import { LessonRichNode } from '@/src/types/lesson';

export type TopicLibraryTopic = {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  tags: string[];
  is_featured: boolean;
};

export type TopicDetail = TopicLibraryTopic & {
  content_jsonb: LessonRichNode[];
  created_at?: string | null;
  updated_at?: string | null;
};
