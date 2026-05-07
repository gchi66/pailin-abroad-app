type StageName = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

type LessonLibrarySelection = {
  stage: StageName;
  level: number | null;
};

let currentSelection: LessonLibrarySelection = {
  stage: 'Beginner',
  level: null,
};
let progressRefreshToken = 0;

export function getLessonLibrarySelection() {
  return currentSelection;
}

export function setLessonLibrarySelection(selection: LessonLibrarySelection) {
  currentSelection = selection;
}

export function getLessonLibraryProgressRefreshToken() {
  return progressRefreshToken;
}

export function bumpLessonLibraryProgressRefreshToken() {
  progressRefreshToken += 1;
  return progressRefreshToken;
}
