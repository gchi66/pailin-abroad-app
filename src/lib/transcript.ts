type TranscriptCueCandidate = {
  speaker: string;
  speakerTh: string;
  englishLine: string;
  thaiLine: string;
};

const STANDALONE_TRANSCRIPT_CUE_RE = /^\*[^*\n]+\*$/;

export const isStandaloneTranscriptCue = (line: TranscriptCueCandidate): boolean => {
  if (line.speaker || line.speakerTh) {
    return false;
  }

  const authoredLines = [line.englishLine, line.thaiLine].filter(Boolean);
  return authoredLines.length > 0 && authoredLines.every((text) => STANDALONE_TRANSCRIPT_CUE_RE.test(text));
};
