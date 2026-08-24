# Pailin Abroad AI Speaking Coach Specification

## Status

This document describes the current product and technical specification for the V1 AI Speaking Coach. It is the source of truth for implementation until a newer specification replaces it.

The curriculum parser and initial Supabase schema are now implemented:

- The backend parser is `backend/app/tools/speaking_coach_parser.py` in the backend repository.
- The current Google Doc parses successfully into 2 lessons, 4 practice sets, and 13 questions with no parser errors or warnings.
- The four speaking-coach tables described below exist in the live Supabase database.
- The private `speaking-coach-audio` Storage bucket exists.
- Curriculum import, evaluation endpoints, model benchmarking, cleanup automation, and application UI remain to be implemented.

## Product Goal

Build a guided speaking coach for Thai learners of English.

The feature is not a free-form chatbot. Curriculum, prompts, model answers, translations, and most instructional audio are predetermined. AI is used specifically to evaluate a learner's recorded response and return structured feedback.

The central technical question for V1 is:

> Can one audio-native model reliably evaluate short, guided English responses from Thai learners using exercise-specific instructions, while detecting meaningful pronunciation issues without producing too many false positives?

## Guiding Architecture

V1 uses one audio-native evaluation call:

```text
learner audio
    +
exercise instructions and FOCUS rubric
    +
prompt and target answer, when applicable
    +
Thai-aware evaluation guidance
        ↓
backend
        ↓
audio-capable evaluator
        ↓
validated structured result
```

Do not use a separate speech-to-text-to-text-evaluation pipeline for V1. A transcription system can normalize poorly pronounced words into the intended English and conceal pronunciation problems. The original recording must remain the evaluation source of truth.

The evaluator must return a transcript as part of its result, but it must assess pronunciation from the audio rather than from that transcript alone.

A separate transcription service may be reconsidered only if benchmarking demonstrates a meaningful improvement in accuracy, latency, or cost.

## Product Flow

1. Display a speaking prompt.
2. Display English and Thai text where appropriate.
3. Optionally play prerecorded English prompt audio.
4. Let the learner record an answer.
5. Upload the recording to the backend.
6. Make one audio-native evaluation call.
7. Validate and normalize the evaluator response on the backend.
8. Render the corresponding application state.
9. Allow at most one instructional retry.
10. Continue to the next speaking item after completion.

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

Curriculum authors provide exercise-specific evaluation instructions in `FOCUS`. This is the primary rubric sent to the evaluator.

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

## Thai-Aware Evaluation

The evaluator must know that the learner is a Thai speaker. Global evaluator instructions should identify common Thai-to-English transfer issues, including:

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

Only report pronunciation issues that are sufficiently clear, meaningful, and useful to correct. Avoid speculative criticism.

## Evaluation by Practice Type

### Pronunciation and repeat-after-me

The evaluator knows the exact target sentence and separately considers:

- Whether the learner reproduced the intended content and structure
- Whether the speech was understandable
- Whether important sounds from the exercise rubric were sufficiently clear

Example:

```text
Target: She isn't going to work.
Learner: She going to work.
```

This is a content and structure error even if the remaining words are pronounced clearly.

### Open-ended speaking

Open-ended answers must not use exact-string matching. Multiple relevant responses may be valid.

The evaluator considers:

- Relevance
- Meaning
- Grammar
- Target grammar usage
- Vocabulary
- Intelligibility
- Pronunciation

The exercise `FOCUS` determines which dimensions receive the highest priority.

### Translation

Translation exercises accept natural semantic equivalents rather than exact strings.

Example:

```text
Thai prompt: ฉันปวดท้อง

Acceptable:
- I have a stomachache.
- My stomach hurts.
```

The evaluator judges semantic equivalence and natural English.

## Attempt and Retry Rules

The maximum number of instructional attempts is two.

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

Keep two distinct issue collections:

- `detected_issues`: every issue the evaluator confidently found
- `displayed_issues`: the small prioritized subset shown to the learner

This distinction supports a simple learner experience while preserving useful analytics.

## Unclear Audio

The evaluator must be allowed to return `unclear_audio` when it cannot confidently assess the recording because it is too quiet, clipped, noisy, incomplete, or otherwise unusable.

In this state:

- Do not invent content or pronunciation criticism.
- Ask the learner to record again.
- Do not consume the learner's normal instructional retry.
- Track repeated recording failures separately from answer correctness.

## Initial Evaluation Contract

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

The final implementation must use explicit schemas and enums rather than accepting arbitrary JSON.

## Backend Requirements

The mobile application must not construct the evaluator's system prompt.

Recommended endpoint:

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
5. Construct the evaluator instructions server-side.
6. Call the configured audio-native evaluator.
7. Parse and validate the response.
8. Normalize enums and optional fields.
9. Store the attempt result.
10. Return clean application data.

Never return unvalidated model output directly to the frontend. Malformed output must produce a safe fallback rather than undefined UI behavior.

Keep model-specific implementation behind an abstraction such as:

```text
evaluateSpeakingAttempt(...)
```

Do not hard-wire curriculum or application behavior to one provider. Provider selection should be driven by benchmark results.

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

Stores every submitted recording and its evaluation lifecycle. `evaluation_sequence` increments for every recording, including unclear audio and failed provider calls. `instructional_attempt_number` is limited to 1 or 2 and does not increment for `unclear_audio`.

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

### Access control

Row-level security is enabled on all four speaking-coach tables. There are intentionally no anonymous or authenticated client policies. All access goes through the backend service-role client so hidden answers, rubrics, evaluator context, and provider output cannot be queried directly from the application.

## Audio Storage and Privacy

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

Temporary recordings use the private `speaking-coach-audio` bucket. Recommended object paths are:

```text
{user_id}/{session_id}/{attempt_id}.m4a
```

The bucket is private and has a 10 MB per-object limit. Upload, replay, and deletion must use the backend service role or short-lived signed URLs generated by the backend. No direct `storage.objects` client policies are required for V1.

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

Provider and normalized evaluator data may be retained for debugging and analytics, provided it contains no raw audio or secrets and follows the product's privacy policy.

## Validation and Benchmarking

Pronunciation-evaluation quality is the primary technical risk. Do not rely on the evaluator in production until it passes a controlled benchmark.

Initial benchmark process:

1. Select representative speaking exercises.
2. Record correct responses.
3. Record intentionally incorrect responses.
4. Inject known pronunciation and content errors.
5. Run every recording through the evaluator.
6. Compare detected issues against the known expected issues.
7. Refine prompts and schema.
8. Repeat across candidate models or providers.

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

False positives deserve particular attention. Incorrect confident criticism will damage learner trust faster than occasionally missing a minor error.

Controlled recordings are engineering validation only. Before production, test with real Thai speakers across:

- Proficiency levels
- Regional Thai accents
- Different voices
- Recording environments
- Phone models and microphones

## Provider Selection Criteria

The model and provider are not yet selected. Evaluate candidates using:

- Pronunciation-detection quality
- False-positive rate
- Grammar and meaning accuracy
- Thai-aware performance
- Latency
- Cost
- Structured-output reliability

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
- Complex pronunciation scoring
- A custom-trained pronunciation model
- A full adaptive curriculum
- A centralized canonical error library

Most instructional speech should remain prerecorded.

## Recommended Implementation Order

1. Import the parsed speaking curriculum into the provisioned Supabase content tables.
2. Finalize the evaluator request and response schemas.
3. Implement one backend endpoint with one audio-native model.
4. Load one existing speaking exercise, such as Lesson 4.1.
5. Send raw audio, `FOCUS`, and target data to the evaluator.
6. Validate, normalize, and persist the response.
7. Build a small internal test script or screen.
8. Create controlled recordings with known errors.
9. Benchmark evaluator behavior.
10. Refine the system instructions and schema.
11. Implement the isolated React Native speaking flow.
12. Integrate it into the lesson experience.
13. Implement automatic temporary-audio cleanup.

The initial database foundation is now provisioned. Avoid additional schema complexity or substantial production UI work until the audio evaluator demonstrates acceptable accuracy and false-positive performance.

## Open Decisions

The following remain intentionally unresolved:

- Audio-model provider and model
- Final request and response field names
- Raw provider-output and transcript retention periods
- Benchmark acceptance thresholds
- Whether `unclear_audio` retries are unlimited or capped separately

These decisions should be made through prototyping, benchmarking, privacy review, and operational requirements rather than assumed in the client implementation.
