import { useCallback } from 'react';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';

import correctFeedbackSound from '@/assets/audio/correct-sound-effect.mp3';
import incorrectFeedbackSound from '@/assets/audio/wrong-sound-effect.mp3';

export function useAnswerFeedbackSound() {
  const correctPlayer = useAudioPlayer(correctFeedbackSound, {
    downloadFirst: true,
    keepAudioSessionActive: true,
  });
  const incorrectPlayer = useAudioPlayer(incorrectFeedbackSound, {
    downloadFirst: true,
    keepAudioSessionActive: true,
  });

  return useCallback(async (isCorrect: boolean) => {
    const player = isCorrect ? correctPlayer : incorrectPlayer;
    try {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const loadStartedAt = Date.now();
      while (!player.isLoaded && Date.now() - loadStartedAt < 1500) {
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      if (!player.isLoaded) {
        console.warn('[Answer Feedback] Sound did not finish loading', { isCorrect });
        return;
      }
      player.volume = 1;
      await player.seekTo(0);
      player.play();
    } catch (error) {
      console.warn('[Answer Feedback] Could not play sound', error);
    }
  }, [correctPlayer, incorrectPlayer]);
}
