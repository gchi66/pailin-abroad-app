import { setAudioModeAsync, setIsAudioActiveAsync } from 'expo-audio';

export async function activatePlaybackAudioSession(shouldPlayInBackground = false) {
  await setAudioModeAsync({
    allowsRecording: false,
    playsInSilentMode: true,
    shouldPlayInBackground,
    interruptionMode: 'doNotMix',
  });
  await setIsAudioActiveAsync(true);
}
