# Pailin Abroad AI Speaking Coach Specification

## Status

This document describes the current product and technical specification for the V1 AI Speaking Coach. It is the source of truth for implementation until a newer specification replaces it.

The curriculum parser, importer, Supabase foundation, backend vertical slice, and admin test interface are implemented:

- The backend parser is `backend/app/tools/speaking_coach_parser.py` in the backend repository.
- The backend importer is `backend/app/tools/speaking_coach_importer.py`. Its default mode is a read-only dry run; database writes require `--apply`.
- The current Google Doc parses successfully into 2 lessons, 4 practice sets, and 13 questions with no parser errors or warnings.
- The importer dry run validates all current content and successfully matches both authored lessons to the live `lessons` table.
- The current curriculum has been imported and verified in the live database: 4 active practice sets and 13 active questions match the parsed JSON without field or relationship mismatches.
- The four speaking-coach tables described below exist in the live Supabase database.
- The private `speaking-coach-audio` Storage bucket exists.
- The public `speaking-coach-prompts` Storage bucket contains the 13 prerecorded prompt audio files for test Lessons 4.1 and 4.9.
- Imported pronunciation and open-speaking questions have deterministic `prompt_audio_key` values. Translation questions intentionally store `null` because Thai-to-English prompts do not use Pailin audio. Every referenced public prompt URL has been verified reachable.
- The backend exposes authenticated learner-facing lesson content at `GET /api/speaking/lessons/{lesson_external_id}`. It returns ordered practice sets, prompts, tips, examples, progress positions, and public prompt-audio URLs without querying or exposing private `FOCUS` or target-answer fields.
- The profile screen includes an admin-only `Open speaking coach preview` button immediately below the placement-test trigger. It opens the barebones speaking-coach test route for Lesson 4.1.
- The React Native test route loads real Lesson 4.1 or 4.9 curriculum, renders all three practice types and evaluation states, plays the appropriate Pailin audio, and records, uploads, and replays learner audio.
- The test route is connected to the Azure Speech plus text-only Gemini evaluator through the real session and evaluation endpoints. It supports private learner-audio upload, persisted attempts, retry feedback, back/forward question navigation, and replay of both learner and Pailin audio.
- The earlier Gemini-only audio evaluator failed testing because it treated a noisy transcript as ground truth, including hearing `is` when the learner said `isn't`. It has been replaced rather than retained as a fallback.
- Learner-audio cleanup and evaluator-diagnostic retention are implemented: session-completion deletion, 24-hour unfinished-audio expiry, and 90-day raw diagnostic redaction.
- The Azure hybrid replacement is implemented. Uploaded audio keeps its real MIME type and is normalized with a bounded FFmpeg process to mono 16 kHz, 16-bit PCM WAV. Azure performs every recognition request and scripted Pronunciation Assessment; Gemini receives text only for open and translation exercises.
- Provider results are parsed into typed internal models, persisted as namespaced Azure/Gemini diagnostics, and composed into the existing provider-independent response contract. Pronunciation decisions and bilingual feedback are deterministic and do not use transcript mismatch as a failure condition.
- Pronunciation feedback uses focus-first ranking with up to two bullet-point issues. The admin UI presents Azure's scripted result as a target-sentence assessment, underlining problem words in red, rather than presenting reference-aligned text as a literal learner transcript.
- Unit and route coverage includes normalization failures, Azure response variants, provider configuration and failures, low-confidence audio, Azure-only pronunciation, text-only Gemini routing, supported miscues, and the rule that transcript mismatch alone cannot fail pronunciation. A live request against the configured `southeastasia` Speech resource returned recognition and pronunciation-assessment data successfully.
- Production benchmarking, threshold calibration, and integration into the normal lesson path remain to be completed.

## Product Goal

Build a guided speaking coach for Thai learners of English.

The feature is not a free-form chatbot. Curriculum, prompts, model answers, translations, and most instructional audio are predetermined. AI is used specifically to evaluate a learner's recorded response and return structured feedback.

The central technical question for V1 is:

> Can Azure's specialized speech scoring and a low-cost text model be combined to give useful, Thai-learner-aware feedback without producing trust-damaging false positives?

## Guiding Architecture

V1 uses two specialized providers behind one backend-owned evaluation contract:

```text
learner M4A recording
        ↓
backend validates and normalizes to mono 16 kHz PCM WAV
        ↓
Azure Speech
  - speech recognition for every exercise
  - scripted Pronunciation Assessment for repeat-after-me
        ↓
practice-type router
  - pronunciation: deterministic backend scoring; normally no Gemini call
  - open: Azure transcript and alternatives → text-only Gemini language review
  - translation: Azure transcript and alternatives → text-only Gemini meaning review
        ↓
backend validates, applies conservative decision rules, persists, and responds
```

Provider responsibilities are intentionally narrow:

- Azure is the only provider allowed to make claims about what the learner audibly pronounced. It receives normalized learner audio and, for scripted pronunciation, the exact reference text.
- Gemini receives text only. It evaluates meaning, relevance, grammar, vocabulary, and target-language usage for open and translation exercises. It must never infer phonemes or pronunciation quality from a transcript.
- The backend owns exercise routing, thresholds, confidence handling, issue prioritization, retry behavior, the final normalized status, and all learner-facing safety rules.
- Pailin's prerecorded audio remains the learner-facing reference voice. Azure's built-in sample voices, avatar, GPT-4o demonstration, and generated reference audio are not part of the application.

The former Gemini audio call has been removed. The core problem was not merely prompting: one generative audio model was being asked to transcribe, diagnose speech, judge content, and write feedback, and a single uncertain transcript could incorrectly fail the answer.

Uncertainty must favor the learner. A transcript mismatch alone cannot fail a pronunciation answer. Low-confidence or contradictory evidence produces `unclear_audio`, a neutral retry, or a pass depending on the available acoustic evidence; it must not produce confident corrective criticism.

## Product Flow

1. Display a speaking prompt.
2. Display English and Thai text where appropriate.
3. Optionally play prerecorded English prompt audio.
4. Let the learner record an answer.
5. Upload the recording to the backend.
6. Normalize the uploaded audio and send it to Azure Speech.
7. For open and translation exercises only, send Azure's text result and private curriculum context to Gemini.
8. Validate both provider responses and derive the normalized result on the backend.
9. Render the corresponding application state.
10. Apply the configured retry policy.
11. Continue to the next speaking item after completion.

The AI does not control navigation, retry limits, or UI behavior. Application code derives those decisions from validated structured data.

## Exercise Configuration

Evaluation behavior depends on `PRACTICE_TYPE`. At minimum, V1 must support:

- Pronunciation or repeat-after-me
- Open-ended speaking
- Translation

Additional guided speaking formats may be added later. Do not use a single generic grading prompt for every practice type.

Each exercise may contain:

```text
PRACTICE_TYPE
FOCUS
prompt in English and/or Thai
target answer, when applicable
model or example answers, when applicable
prerecorded prompt audio, when applicable
```

### FOCUS rubric

Curriculum authors provide exercise-specific evaluation instructions in `FOCUS`. This is the primary private rubric used by the backend and, where applicable, the text evaluator.

Example:

```text
PRACTICE_TYPE: pronunciation

FOCUS:
Evaluate speech accuracy for present continuous tense
(Subject + am/is/are + verb-ing).

1. Structure Check:
Verify the correct auxiliary verb follows the subject and the main
verb includes the -ing suffix.

2. Thai Transfer Errors:
Watch for missing be verbs or missing -ing endings.

3. Word Order:
Ensure correct affirmative, negative, or interrogative syntax.

4. Pronunciation Focus:
Verify clear final /ɪŋ/ sounds and linked contractions.
```

A centralized error taxonomy is not required for V1. Detailed per-exercise `FOCUS` instructions are sufficient. A canonical library can be introduced later for analytics, personalization, cross-lesson tracking, or standardized internal naming.

### Authored document format and parser

The speaking curriculum is authored in a labeled Google Doc. The parser fetches the document by Google Doc ID and supports both modern tabbed Google Docs responses and legacy top-level document bodies.

Recognized structural labels include:

```text
LESSON
PRACTICE_TYPE
FOCUS
TIP_ENGLISH
TIP_THAI
QUESTION
```

Recognized question fields include:

```text
REPEAT_ENGLISH
REPEAT_THAI
OPEN_ENGLISH
OPEN_THAI
EXAMPLE_ENGLISH
EXAMPLE_THAI
TRANSLATE_ENGLISH
TRANSLATE_THAI
ANSWER_1, ANSWER_2, ...
```

`FOCUS` may span several paragraphs. Numbered rubric paragraphs are appended to the active `FOCUS` field until the next recognized label. Translation answers use dynamic `ANSWER_n` labels and must be numbered from 1.

The normalized hierarchy is:

```text
document
└── lessons
    └── practice sets
        └── questions
```

The parser normalizes `translate` to the canonical database value `translation`. It produces deterministic `source_key` values, source locations, content summaries, and structured validation issues. Parser errors must prevent import.

### Curriculum importer

The importer consumes the parser's normalized JSON and validates the entire hierarchy before performing any writes. It:

- Refuses parser output containing errors or an unsupported schema version
- Matches authored lessons to existing `lessons.lesson_external_id` values
- Generates stable SHA-256 content hashes for questions and practice sets
- Upserts practice sets and questions by deterministic `source_key`
- Preserves source locations, ordering, evaluator `FOCUS`, tips, prompts, target answers, and examples
- Reactivates an existing matching row when it reappears in the source document
- Leaves missing database rows unchanged by default
- Only deactivates missing rows when `--deactivate-missing` is explicitly combined with `--apply`

From the backend repository, validate the current file without writing:

```bash
./venv/bin/python -m app.tools.speaking_coach_importer data/speaking_coach.json
```

Apply the validated import:

```bash
./venv/bin/python -m app.tools.speaking_coach_importer data/speaking_coach.json --apply
```

If authored blocks or questions were intentionally removed from the document, deactivate the missing rows with:

```bash
./venv/bin/python -m app.tools.speaking_coach_importer data/speaking_coach.json --apply --deactivate-missing
```

The deactivation flag is scoped to practice sets from the same source document and the lessons included in the import. It marks rows inactive rather than deleting them.

## Thai-Aware Evaluation

Thai transfer knowledge is useful for prioritizing likely errors and writing helpful explanations, but it is not proof that a particular learner made an error. The system must never flag a sound merely because Thai learners commonly find it difficult.

The authored `FOCUS`, backend rules, and Gemini language instructions may identify common Thai-to-English transfer issues, including:

- Dropped or weakened final consonants
- `/r/` and `/l/` confusion
- `/v/` and `/w/` confusion
- Substitution of `/θ/` and `/ð/`
- Consonant-cluster simplification
- Vowels inserted inside consonant clusters
- Missing or unclear plural `/s/` or `/z/`
- Missing or unclear past-tense endings
- Word-stress problems
- Vowel-length or vowel-quality differences
- Final `-ing` articulation when relevant

Do not penalize a learner merely for having a Thai accent. The goal is clear, understandable English—not accent elimination or native-like speech.

Only Azure acoustic evidence may support a pronunciation issue. Only report issues that are sufficiently clear, meaningful, and useful to correct. Avoid speculative criticism, especially at phoneme level. The admin test path may expose a focus-related phoneme correction when the phoneme score is corroborated by at least two independent word, syllable, completeness, or candidate-ranking signals. Whether that granularity is appropriate for production remains a benchmark decision.

Do not attempt custom model training for V1. First collect a consented benchmark set from real Thai speakers, measure provider behavior, and tune thresholds and feedback policy. Custom Speech or another trained/accent-adapted model should be considered only after the benchmark identifies a repeatable recognition problem that calibration cannot solve.

## Evaluation by Practice Type

### Pronunciation and repeat-after-me

Use Azure Speech scripted Pronunciation Assessment with the exact English target sentence as `ReferenceText`. Request detailed recognition plus overall, word, and phoneme scoring. The initial request should use HundredMark scoring, word/phoneme granularity, and miscue reporting; prosody is optional and must not affect pass/fail until benchmarked.

The backend considers:

- Azure recognition status and confidence
- Overall accuracy and completeness
- Word-level `ErrorType`, especially actual omissions and insertions
- Word and phoneme accuracy around curriculum-relevant words
- The exercise `FOCUS`
- Previously displayed retry issues, when applicable

The currently implemented pre-benchmark rules are provisional and intentionally easy to tune:

- A supplied recognition confidence below `0.35`, a non-success recognition status, or no usable transcript produces `unclear_audio`.
- A focus-related word is eligible when its word accuracy is at or below `70`.
- A focus-related phoneme is eligible at or below `45` only when at least two independent Azure signals corroborate it: syllable accuracy at or below `50`, word accuracy at or below `70`, completeness below `85`, or Azure's leading phoneme candidate not matching the expected phoneme.
- An off-focus word is severe enough to display when its word accuracy is at or below `45` and Azure also reports `Mispronunciation` or a phoneme at or below `15`.
- An overall accuracy score at or below `45` is a fallback retry signal only when no clearer word-level issue exists.
- Completeness below `70` is a fallback retry signal when no more specific supported issue exists. Completeness may also corroborate a focus-related phoneme issue.
- Azure `Omission` and `Insertion` retain those exact documented meanings.
- Transcript text disagreement with the reference is diagnostic only and cannot independently produce a retry.
- The first displayed issue is the strongest supported `FOCUS` issue when one exists. One severe off-focus issue is also included when available, with two displayed issues maximum.

These values are initial engineering thresholds, not production acceptance thresholds. They must be calibrated against the labeled Thai-speaker benchmark.

The transcript is diagnostic evidence, not an exact-answer oracle. A text mismatch by itself cannot fail an answer, and Azure's `Omission`/`Insertion` labels must retain their documented meaning rather than being rewritten as unsupported phonetic claims.

Gemini is not called in the normal pronunciation path. Feedback comes from deterministic English/Thai templates populated with high-confidence Azure results. This keeps the fastest and most frequent exercise inexpensive and prevents a generative model from inventing pronunciation diagnoses.

Example:

```text
Target: She isn't going to work.
Learner: She going to work.
```

This is a content and structure error even if the remaining words are pronounced clearly.

### Open-ended speaking

Open-ended answers must not use exact-string matching. Multiple relevant responses may be valid.

Azure first performs detailed English speech recognition. The backend passes only the transcript, useful alternatives, recognition confidence, prompt, examples, private `FOCUS`, and prior retry context to Gemini. Raw audio is not sent to Gemini.

Gemini considers:

- Relevance
- Meaning
- Grammar
- Target grammar usage
- Vocabulary
- Whether a correction is material enough to justify a retry

The exercise `FOCUS` determines which dimensions receive the highest priority. Gemini returns validated structured language findings and bilingual feedback, but the backend derives the final status and caps displayed issues. Azure recognition failure may produce `unclear_audio`; Gemini may not turn transcript uncertainty into pronunciation criticism.

### Translation

Translation exercises accept natural semantic equivalents rather than exact strings.

Example:

```text
Thai prompt: ฉันปวดท้อง

Acceptable:
- I have a stomachache.
- My stomach hurts.
```

Azure first transcribes the English response. Gemini receives the transcript and alternatives, the Thai prompt, accepted target answers, private `FOCUS`, examples, and prior retry context. It judges semantic equivalence and natural English rather than exact wording.

Gemini may identify meaning, grammar, vocabulary, or target-usage problems. It may not assess pronunciation. The backend validates the response and owns the final pass/retry decision.

### Provider-use matrix

| Exercise type | Azure input and output | Gemini input and output | Backend decision |
| --- | --- | --- | --- |
| Pronunciation | WAV + exact target; transcript, confidence, overall/word/phoneme scores, miscues | Normally not called | Conservative acoustic thresholds and authored focus |
| Open | WAV; transcript, alternatives, confidence | Text context; relevance, grammar, vocabulary, target usage, bilingual feedback | Validates materiality and chooses status |
| Translation | WAV; transcript, alternatives, confidence | Text context; semantic equivalence, grammar, naturalness, bilingual feedback | Validates materiality and chooses status |

Gemini remains useful because Azure Speech provides speech recognition and acoustic scoring, not curriculum-aware semantic grading and tailored bilingual language feedback. The Microsoft language-learning demo combines several products, including GPT-4o; the application does not need to reproduce that bundle or pay for GPT-4o when low-cost text-only Gemini is sufficient.

## Attempt and Retry Rules

During evaluator testing, follow-up retries are unlimited so the same question can be exercised repeatedly. The schema continues to use instructional attempt `1` for the initial answer and `2` for every follow-up recording. Completed questions may also be reopened from the admin test path.

Before production, restore the intended learner policy below or replace it with an explicitly tested policy. The original product target is a maximum of two instructional attempts:

### Attempt 1

- If correct, return `pass`, show brief positive feedback, and continue.
- If there is a meaningful correctable error, return `retry`, show concise feedback, and allow one retry.

### Attempt 2

- Primarily re-check the issues identified during Attempt 1.
- If corrected, return `pass`, show positive feedback, and continue.
- If still incorrect, return `continue_with_correction`, show the correction, and continue anyway.
- Do not trap the learner in an exercise.

Attempt 2 may detect new issues internally, but it should surface a new issue only if it is high severity, such as:

- The meaning changed materially
- The response became unintelligible
- A major target-language failure appeared

The principal Attempt 2 question is: did the learner fix the issue they were asked to fix?

## Feedback Rules

The evaluator may detect several issues, but the learner normally sees only one or two. Three displayed issues are allowed only when clearly justified.

Prioritize feedback in this order:

1. Exercise-specific `FOCUS` errors
2. Meaning or intelligibility problems
3. Target grammar or structure failures
4. Significant pronunciation problems
5. Minor accent refinement

Feedback must be concise, actionable, encouraging, and available in English and Thai.

Feedback depth must be calibrated through user testing. More detail is not automatically more useful, and invoking Gemini for pronunciation merely to make prose more polished adds latency and cost without improving acoustic accuracy. V1 should prefer:

- one high-confidence, exercise-relevant correction;
- at most two displayed issues in normal cases;
- focus-first bullet-point feedback, followed by one severe off-focus issue when supported;
- a target-sentence assessment with problem words visually emphasized for pronunciation exercises;
- deterministic bilingual templates for pronunciation;
- text-only Gemini feedback for open and translation exercises;
- no criticism when provider evidence is ambiguous.

Keep two distinct issue collections:

- `detected_issues`: every issue the evaluator confidently found
- `displayed_issues`: the small prioritized subset shown to the learner

This distinction supports a simple learner experience while preserving useful analytics.

## Unclear Audio

The backend must be allowed to return `unclear_audio` when Azure cannot confidently assess the recording because it is too quiet, clipped, noisy, incomplete, or otherwise unusable.

In this state:

- Do not invent content or pronunciation criticism.
- Ask the learner to record again.
- Do not consume the learner's normal instructional retry.
- Track repeated recording failures separately from answer correctness.

## Normalized Evaluation Contract

Exact field names may evolve before implementation, but the initial normalized contract should resemble:

```json
{
  "status": "pass | retry | continue_with_correction | unclear_audio",
  "transcript": "My best friend is at sleep.",
  "content": {
    "meaning_correct": true,
    "relevant": true,
    "target_usage_correct": false,
    "grammar_correct": false
  },
  "pronunciation": {
    "intelligible": true,
    "assessment_tokens": [],
    "issues": [
      {
        "type": "pronunciation_issue",
        "description": "Description of a confidently detected issue."
      }
    ]
  },
  "detected_issues": [
    {
      "category": "grammar",
      "description": "Present continuous requires verb + -ing."
    }
  ],
  "displayed_issues": [
    {
      "category": "grammar",
      "description": "Use the -ing form after 'is'."
    }
  ],
  "corrected_answer": "My best friend is sleeping.",
  "feedback_en": "Almost! Use the -ing form after 'is'.",
  "feedback_th": "...",
  "retry_focus": [
    "present continuous -ing ending"
  ]
}
```

The implementation must use explicit schemas and enums rather than accepting arbitrary JSON. Provider evidence also needs an internal confidence/certainty representation so the backend can distinguish a supported correction from an ambiguous hypothesis. Confidence may be numeric where supplied by Azure and categorical where derived by application rules; it must not be fabricated when a provider omits it.

For pronunciation exercises, `assessment_tokens` contains the target sentence split into ordered text tokens. Each token has status `clear`, `needs_work`, or `missing`, plus an optional `issue_index` linking it to the corresponding displayed issue. This is target-aligned assessment data, not a literal transcript.

## Backend Requirements

The mobile application must not construct the evaluator's system prompt.

Implemented learner-facing curriculum endpoint:

```text
GET /api/speaking/lessons/{lesson_external_id}
```

This endpoint requires a learner access token and returns the lesson's active practice sets and questions in authored order. Each question includes its position within the practice set, overall position within the lesson, English and Thai prompts, examples, and a stable public prompt-audio URL. Practice-set tips are returned at the practice-set level. Database selects explicitly omit evaluator-only `FOCUS` and `target_answers` fields.

Implemented endpoint to be preserved:

```text
POST /api/speaking/evaluate
```

Input:

```text
audio file
session_id
question_id
instructional_attempt_number
previous_attempt_id, for Attempt 2
```

Backend flow:

1. Authenticate and authorize the learner.
2. Load the speaking exercise.
3. Load `PRACTICE_TYPE`, `FOCUS`, prompt, and target data.
4. Load the prior attempt when evaluating Attempt 2.
5. Validate the MIME type and normalize supported input to mono, 16 kHz, 16-bit PCM WAV.
6. Call Azure Speech with a server-side API key.
7. For pronunciation, parse Azure Pronunciation Assessment and apply conservative deterministic rules.
8. For open or translation, construct a text-only Gemini request from validated Azure text and private curriculum context.
9. Parse and validate every provider response.
10. Normalize enums, confidence, optional fields, and the final application-owned status.
11. Store the attempt result and provider metadata without secrets or raw audio.
12. Return clean application data.

Never return unvalidated model output directly to the frontend. Malformed output must produce a safe fallback rather than undefined UI behavior.

Keep provider-specific implementation behind abstractions such as:

```text
normalizeSpeakingAudio(...)
assessWithAzureSpeech(...)
evaluateLanguageWithGemini(...)
evaluateSpeakingAttempt(...)
```

The top-level `evaluateSpeakingAttempt(...)` remains provider-independent and routes by practice type. Do not hard-wire frontend behavior to either provider.

### Server configuration

The chosen environment-variable names are:

```text
AZURE_API_KEY=<Speech resource key>
AZURE_SPEECH_REGION=southeastasia
GEMINI_API_KEY=<Google AI API key>
SPEAKING_COACH_MODEL=gemini-3.5-flash-lite
```

`AZURE_API_KEY` is the canonical project name even though Azure documentation often calls it a Speech key. The region is not secret but must match the Speech resource. The keys belong only in the backend environment and Fly secrets; never commit them, include them in Expo configuration, log them, or paste them into diagnostic output.

The backend should use Azure's regional short-audio Speech REST endpoint initially. It does not need Azure's GPT-4o language-learning demo or an Azure OpenAI deployment. The current Free (`F0`) Speech resource can be used for development within its quota; provider errors and quota exhaustion must fail safely.

## Responsibility Boundaries

### React Native application

- Recording permissions and recording UI
- Local recording lifecycle
- Prompt playback
- Upload and loading states
- Retry and feedback UI
- Session navigation
- Replay during the active speaking session

### Backend

- Authentication and authorization
- Exercise lookup
- Evaluator prompt construction
- Audio-model integration
- Schema validation and normalization
- Attempt-number enforcement
- Retry context
- Temporary-audio handling
- Attempt persistence
- Safe error behavior

### Supabase

- Speaking practice-set and question metadata
- Lesson-scoped speaking sessions
- Attempt and evaluator analytics data
- Private temporary audio storage
- Storage lifecycle and access control

## Current React Native Test Interface

The admin-only profile entry point opens:

```text
/speaking-coach?lesson=4.1
```

The test route may switch between test Lessons 4.1 and 4.9. It uses the authenticated learner-facing curriculum endpoint and supports:

- All three current practice types
- Authored English and Thai prompts
- Practice-set tips and revealable example answers
- Public Pailin audio for pronunciation and open-speaking questions
- No Pailin audio for translation questions
- Microphone permission handling
- Local recording, stop, replay, and re-record controls
- A review-before-submission state
- Real evaluating, correct, retry, final-correction, and unclear-audio states
- Type-appropriate playback labels on feedback screens
- Bullet-point bilingual issue feedback and an annotated target sentence for pronunciation retries
- Development-console evaluator diagnostics for authenticated admins. The response includes sanitized provider metadata and the raw Azure JSON result, but excludes audio, credentials, signed URLs, and private evaluator context. Non-admin responses omit this field.

The current `Submit recording` action now:

- Creates or resumes an authenticated lesson-scoped speaking session
- Uploads learner audio to private temporary storage
- Preserves the recording's real MIME type and normalizes provider-bound audio to mono 16 kHz PCM WAV
- Sends the normalized audio to Azure Speech for every exercise
- Uses scripted Azure Pronunciation Assessment and deterministic backend feedback for pronunciation exercises
- Sends only Azure transcripts, alternatives, confidence, and private curriculum context to `gemini-3.5-flash-lite` for open and translation exercises
- Validates typed provider responses and a provider-independent structured evaluation response
- Persists attempts, feedback, provider metadata, and progress
- Allows unlimited follow-up retries during evaluator testing while preserving unclear-audio retries

The route remains admin-only while the Azure hybrid evaluator is benchmarked. The backend requires server-side `AZURE_API_KEY`, `AZURE_SPEECH_REGION`, and `GEMINI_API_KEY` values. No provider key is required in the mobile application.

## Supabase Schema

The live schema uses the existing `lessons` and `users` tables. A speaking session covers all active speaking practice sets and questions belonging to one lesson.

```text
lessons.id (uuid)
└── speaking_coach_practice_sets.id (bigint)
    └── speaking_coach_questions.id (bigint)

users.id (uuid)
└── user_speaking_coach_sessions.id (uuid)
    └── user_speaking_coach_attempts.id (uuid)
```

### `speaking_coach_practice_sets`

Stores one authored `PRACTICE_TYPE` block. Important fields include:

```text
lesson_id
source_key
source_document_id
source tab and paragraph metadata
practice_type
source_practice_type
focus
tip_en
tip_th
sort_order
content_hash
is_active
```

`practice_type` is constrained to `pronunciation`, `open`, or `translation`. `FOCUS` is private evaluator configuration and must not be returned directly to the mobile application.

### `speaking_coach_questions`

Stores one normalized speaking question. Important fields include:

```text
practice_set_id
source_key
source_number
sort_order
prompt_en
prompt_th
target_answers
examples
prompt_audio_key
content_hash
is_active
```

The normalized `prompt`, `target_answers`, and `examples` shape supports every current practice type. Target answers are private evaluator references and must not be exposed through direct client queries.

### `user_speaking_coach_sessions`

Stores one learner run through the speaking-coach portion of an entire lesson. Session status is `active`, `completed`, or `abandoned`.

`content_hash` records the lesson speaking-content version at session creation. If the authored speaking content changes while a session is active, abandon that session and create a new one rather than silently changing its assigned curriculum.

`current_question_id` is only a resume convenience. It is not the fundamental progress record. On resume, the backend must verify that the pointer references an active, incomplete question; otherwise it derives the first incomplete question from attempts.

Only one active session is allowed per user and lesson. A later repeat of a completed lesson creates a new session.

### `user_speaking_coach_attempts`

Stores every submitted recording and its evaluation lifecycle. `evaluation_sequence` increments for every recording, including unclear audio and failed provider calls. `instructional_attempt_number` remains limited to 1 or 2 for schema compatibility: `1` is the initial answer and `2` represents every follow-up retry. Follow-up retries are unlimited during evaluator testing. `unclear_audio` does not change the instructional attempt number.

Processing state and evaluation outcome are separate:

```text
processing_status:
  uploaded
  evaluating
  completed
  failed

evaluation_result:
  pass
  retry
  continue_with_correction
  unclear_audio
```

An attempt completes its question only when:

```text
processing_status = completed
and evaluation_result is pass or continue_with_correction
```

The generated `completes_question` column encodes this rule. `retry`, `unclear_audio`, and failed processing do not complete a question. Only one terminal completion result is allowed per question within a session.

A session becomes complete when every active question assigned to it has a completion attempt. Attempts are the authoritative progress history; session status is a session-level summary.

Provider data and application data remain distinct:

- `provider_response_raw`: provider-specific response metadata with audio and secrets excluded
- `provider_output_text`: exact model-generated text, including malformed JSON
- `normalized_evaluation`: validated provider-independent evaluation contract
- `evaluation_result`, transcript, feedback, and correction columns: queryable projections of the normalized result

When a normalized evaluation exists, its `status` must match `evaluation_result`.

Hybrid attempts may use both providers. Persist enough provenance to reconstruct the path taken without forcing the frontend to understand it:

- Pronunciation attempts identify Azure Speech and the Azure assessment configuration.
- Open and translation attempts identify both Azure Speech and the Gemini text model.
- `provider_response_raw` may contain separately namespaced, redacted Azure and Gemini objects.
- `usage` may contain separately namespaced duration/request and token information.
- Raw audio, API keys, authorization headers, and secret-bearing URLs must never be written to provider metadata.

### Access control

Row-level security is enabled on all four speaking-coach tables. There are intentionally no anonymous or authenticated client policies. All access goes through the backend service-role client so hidden answers, rubrics, evaluator context, and provider output cannot be queried directly from the application.

## Audio Storage and Privacy

Prerecorded instructional prompt audio and learner recordings use separate buckets because they have different access and retention requirements.

### Prerecorded prompt audio

Permanent prerecorded prompt audio uses the public `speaking-coach-prompts` bucket. These files contain only the spoken example or prompt, without private evaluator instructions or lesson context, so they do not require signed URLs.

The current test content contains one sequentially numbered MP3 per question across all practice sets in each lesson:

```text
4.1_speaking_1.mp3 through 4.1_speaking_6.mp3
4.9_speaking_1.mp3 through 4.9_speaking_7.mp3
```

The number follows the question's overall order within the lesson and does not restart when `PRACTICE_TYPE` changes. Store the corresponding object key in `speaking_coach_questions.prompt_audio_key` for pronunciation and open-speaking questions. Translation questions store `null` and do not play Pailin audio; any matching uploaded file is unused. The application may play referenced files using stable public Storage URLs.

Audio meaning depends on practice type:

- For `pronunciation`, Pailin speaks the target line correctly. The learner may compare Pailin's version with their own recording.
- For `open`, Pailin reads the question. It is labeled as replaying the question rather than as a model-answer comparison.
- For `translation`, there is no Pailin audio. The learner translates the displayed Thai prompt into spoken English.

### Learner recordings

Raw learner recordings are temporary.

Desired lifecycle:

```text
recording created
    ↓
temporary storage
    ↓
AI evaluation
    ↓
available for replay during the active speaking session
    ↓
session completed
    ↓
recording deleted
```

Abandoned recordings should be deleted automatically after approximately 24 hours.

Temporary learner recordings use the private `speaking-coach-audio` bucket. Recommended object paths are:

```text
{user_id}/{session_id}/{attempt_id}.m4a
```

The bucket is private and has a 10 MB per-object limit. Upload, replay, and deletion must use the backend service role or short-lived signed URLs generated by the backend. No direct `storage.objects` client policies are required for V1.

The React Native recorder currently produces M4A/MP4-family audio. Do not relabel those bytes as `audio/aac`. Preserve the actual upload MIME type, then normalize every provider-bound recording on the backend to the Azure-supported format:

```text
mono
16 kHz
16-bit PCM
WAV container
```

Normalization should use a bounded conversion process with fixed arguments, a timeout, temporary-file cleanup, input/output size limits, and safe handling of malformed media. The normalized working file is ephemeral and is not added to permanent storage.

Automatic cleanup must be scoped only to the private `speaking-coach-audio` bucket. It must never delete objects from the permanent `speaking-coach-prompts` bucket.

Implemented retention behavior:

- completing a session immediately deletes all of that session's learner audio;
- active, abandoned, failed, and otherwise unfinished recordings expire after 24 hours;
- an hourly, idempotent cleanup pass removes expired objects in bounded batches and sets `audio_deleted_at` only after Storage accepts the deletion;
- account deletion removes all learner audio before the user's database rows are deleted;
- raw provider output, evaluator context, and detailed failure strings are redacted after 90 days, while normalized evaluations and compact usage data remain available for product analytics;
- the scheduled endpoint is protected by `SPEAKING_COACH_CLEANUP_SECRET`, and the matching scheduler token is stored in Supabase Vault.

Do not permanently accumulate learner voice recordings. Privacy disclosures must explain microphone access, AI-provider processing, transcript storage, temporary retention, and deletion behavior before production release.

## Permanent Attempt Data

The attempt schema persists:

```text
id
user_id
session_id
question_id
evaluation_sequence
instructional_attempt_number
previous_attempt_id
processing_status
evaluation_result
completes_question
transcript
content_result
pronunciation_result
feedback_en
feedback_th
detected_issues
displayed_issues
corrected_answer
retry_focus
provider
model_used
prompt_version
evaluator_schema_version
evaluation_context
provider_response_raw
provider_output_text
normalized_evaluation
usage
latency_ms
failure_code
failure_detail
audio_object_path
audio_expires_at
audio_deleted_at
completed_at
created_at
updated_at
```

Normalized evaluator data and compact usage metadata may be retained for analytics, provided they contain no raw audio or secrets and follow the product's privacy policy. Raw provider/debug fields follow the 90-day redaction policy above.

## Validation and Benchmarking

Pronunciation-evaluation quality is the primary technical risk. The existing Gemini-only prototype has already failed the qualitative bar because it confidently criticized words that the learner actually spoke. Do not rely on the Azure replacement in production merely because its demo appears accurate; it must pass a controlled benchmark in this application's recordings and curriculum.

Initial benchmark process:

1. Select representative speaking exercises.
2. Record correct responses.
3. Record intentionally incorrect responses.
4. Inject known pronunciation and content errors.
5. Run every recording through Azure and the complete backend decision policy.
6. For open and translation recordings, also run the text-only Gemini stage.
7. Compare transcript alternatives, raw scores, derived decisions, and displayed issues against human labels.
8. Tune thresholds and issue-selection rules on a development set.
9. Re-run against a held-out set to avoid tuning to the examples.
10. Repeat across relevant provider configurations when needed.

Representative errors should include:

- `three` pronounced closer to `tree`
- Dropped final consonants
- Missing plural `/s/`
- Simplified consonant clusters
- Incorrect or missing `-ing`
- Missing auxiliaries
- Multiple combined errors

Track at minimum:

- True positives
- False positives
- False negatives
- Unclear-audio rate
- Structured-output failures
- Latency
- Cost
- Azure-only versus Azure-plus-Gemini request share
- Agreement with human raters at answer and issue level

False positives deserve particular attention. Incorrect confident criticism will damage learner trust faster than occasionally missing a minor error. Benchmark acceptance should therefore include a strict false-positive ceiling, not just average Azure scores or transcription accuracy.

Controlled recordings are engineering validation only. Before production, test with real Thai speakers across:

- Proficiency levels
- Regional Thai accents
- Different voices
- Recording environments
- Phone models and microphones

## Provider Selection and Cost Strategy

The initial providers are selected for prototyping:

- Azure Speech Pronunciation Assessment and detailed speech recognition
- `gemini-3.5-flash-lite` for text-only open/translation evaluation

Evaluate and retain them using:

- Pronunciation-detection quality
- False-positive rate
- Grammar and meaning accuracy
- Thai-aware performance
- Latency
- Cost
- Structured-output reliability
- Free-tier and paid-quota behavior

The cheapest reliable routing is the default:

- no Gemini request for normal pronunciation attempts;
- one Azure request per submitted recording;
- one small text-only Gemini request only for open and translation attempts;
- concise structured output and feedback;
- no GPT-4o, Azure avatar, neural text-to-speech, or generated reference voice in V1.

If feedback experiments show that more detailed text improves learning enough to justify its latency and cost, that can be enabled selectively. It should not be bundled into every pronunciation attempt before evidence supports it.

The exercise format and normalized evaluation contract must remain provider-independent.

## V1 Non-Goals

Do not build the following as part of V1:

- Free-form chatbot conversations
- Real-time voice conversation
- AI-generated curriculum
- AI-controlled navigation or retry logic
- ElevenLabs-generated feedback
- Persistent learner voice archives
- Native-accent percentage scores
- Exposing complex or native-likeness pronunciation scores as the learner's goal
- A custom-trained pronunciation model
- A full adaptive curriculum
- A centralized canonical error library

Most instructional speech should remain prerecorded.

## Recommended Implementation Order

Completed foundation:

1. Parse and validate the authored Google Doc.
2. Provision the speaking-coach tables and private audio bucket.
3. Import and verify the normalized curriculum.
4. Add an admin-only placeholder entry point on the profile screen.

Completed Gemini prototype and operational foundation:

1. Finalize the evaluator request and normalized response schemas.
2. Implement session creation or resume behavior for one test lesson; the learner-facing curriculum endpoint is already complete.
3. Implement multipart recording submission, private temporary audio upload, and attempt creation.
4. Load private `FOCUS`, target answers, practice type, and prior-attempt context on the backend.
5. Send the original audio plus private exercise context to one audio-native model.
6. Validate, normalize, and persist the evaluator response and attempt outcome.
7. Replace the test screen's local mock selector and timer with real recording submission, loading, and normalized feedback data.
8. Preserve the existing admin-only profile route while the evaluator is being benchmarked.
9. Implement private-audio cleanup and 90-day evaluator-diagnostic redaction.

Completed Azure hybrid replacement:

1. Added `AZURE_API_KEY` and `AZURE_SPEECH_REGION` backend configuration without exposing either to the client.
2. Added bounded M4A/MP4-to-mono-16-kHz-PCM-WAV normalization and corrected the MIME-type mislabeling.
3. Implemented an Azure Speech REST provider supporting detailed recognition and scripted Pronunciation Assessment.
4. Parsed Azure recognition, confidence, overall scores, word scores, phonemes, and miscues into an internal typed result.
5. Routed pronunciation exercises through Azure-only conservative backend rules and bilingual templates.
6. Refactored Gemini into a text-only evaluator for open and translation exercises; learner audio is never attached.
7. Passed Gemini Azure transcript alternatives/confidence and private exercise context, then validated its structured language result.
8. Composed provider evidence into the existing normalized application contract and persisted namespaced hybrid diagnostics.
9. Expanded unit and route tests across the hybrid paths, provider failures, low confidence, malformed audio, and the rule that transcript mismatch alone cannot fail pronunciation.
10. Smoke-tested the configured Azure Free Speech resource successfully; the required Fly secrets are configured.

After implementation:

1. Create a labeled recording set containing correct Thai-accented speech and controlled errors.
2. Benchmark false positives, false negatives, latency, and cost for each exercise type.
3. Tune Azure thresholds and feedback granularity without training on the held-out evaluation set.
4. Verify retry, resume, navigation, progression, and full-lesson completion behavior on physical devices and the simulator where audio hardware permits.
5. Decide the production retry limit and restore it outside the admin testing path.
6. Integrate the speaking flow naturally into the lesson experience only after the quality bar is met.

The initial database and UI foundation are provisioned. The Azure integration reuses the existing endpoint and normalized attempt schema without requiring a schema change. Avoid substantial production UI work until the hybrid evaluator demonstrates acceptable accuracy and false-positive performance.

## Open Decisions

The following remain intentionally unresolved:

- Benchmark acceptance thresholds
- Whether `unclear_audio` retries are unlimited or capped separately
- Exact Azure score thresholds and confidence bands
- Whether prosody feedback is useful enough to expose
- Whether phoneme-level feedback is reliable enough for learners or should remain diagnostic only
- The final production retry limit and whether completed questions may be intentionally repeated outside admin testing

These decisions should be made through prototyping, benchmarking, privacy review, and operational requirements rather than assumed in the client implementation.
