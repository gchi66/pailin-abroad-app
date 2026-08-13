import { supabase } from '@/src/lib/supabase';

export type PlacementQuestion = {
  id: string;
  prompt: string;
  promptTh?: string;
  choices: string[];
  choicesTh?: string[];
  correctChoice: number;
};

export type PlacementScoringRule = {
  minCorrect: number;
  maxCorrect: number;
  level?: number;
  nextConversation?: number;
};

export type PlacementConversation = {
  id: string;
  conversation_order: number;
  audio_path: string;
  questions: PlacementQuestion[];
  scoring_rules: PlacementScoringRule[];
};

export async function getPlacementConversations(): Promise<PlacementConversation[]> {
  const { data, error } = await supabase
    .from('placement_conversations')
    .select('id, conversation_order, audio_path, questions, scoring_rules')
    .order('conversation_order');

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as PlacementConversation[];
}

export function getPlacementAudioUrl(audioPath: string): string {
  return supabase.storage.from('placement-test-audio').getPublicUrl(audioPath).data.publicUrl;
}
