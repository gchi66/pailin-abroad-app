# Pailin Abroad AI Speaking Coach Specification

## Status

This document describes the current product and technical specification for the V1 AI Speaking Coach. It is the source of truth for implementation until a newer specification replaces it.

The curriculum parser, importer, Supabase foundation, backend vertical slice, and admin test interface are implemented:

- The backend parser is `backend/app/tools/speaking_coach_parser.py` in the backend repository.
- The backend importer is `backend/app/tools/speaking_coach_importer.py`. Its default mode is a read-only dry run; database writes require `--apply`.
- The current `Level 1 - AI` Google Doc tab parses successfully into 17 lessons, 33 practice sets, and 81 questions with no parser errors or warnings.
- The importer dry run validates all current content and successfully matches all 17 authored lessons to the live `lessons` table, including the `1.CHP` checkpoint lesson.
- The current Level 1 speaking curriculum has been imported and verified in the live database: 33 active practice sets, 81 active questions, and 259 ordered focus items match the parsed JSON without field or relationship mismatches.
- The speaking-coach curriculum, session, attempt, and `user_speaking_coach_skips` progress tables described below exist in the live Supabase database.
- The private `speaking-coach-audio` Storage bucket exists.
- The public `speaking-coach-prompts` Storage bucket contains the 13 prerecorded prompt audio files for test Lessons 4.1 and 4.9.
- Imported pronunciation and open-speaking questions have deterministic `prompt_audio_key` values. Translation questions intentionally store `null` because Thai-to-English prompts do not use Pailin audio. Every referenced public prompt URL has been verified reachable.
- The backend exposes authenticated learner-facing lesson content at `GET /api/speaking/lessons/{lesson_external_id}`. It returns ordered practice sets, prompts, tips, examples, progress positions, and public prompt-audio URLs without querying or exposing private `FOCUS` or target-answer fields.
- The profile screen includes an admin-only `Open speaking coach preview` button immediately below the placement-test trigger. It opens the barebones speaking-coach test route for Lesson 4.1.
- The React Native test route discovers every active speaking lesson through an admin-only catalog, provides lightweight level and lesson selectors, renders all three practice types and evaluation states, plays Pailin audio when available, and records, uploads, and replays learner audio.
- The test route is connected to the Azure Speech plus text-only Gemini evaluator through the real session and evaluation endpoints. It supports private learner-audio upload, persisted attempts, retry feedback, back/forward question navigation, and replay of both learner and Pailin audio.
- Recording submission is idempotent. The application generates one stable UUID per recorded file, the database prevents duplicate or concurrent processing, and a repeated completed submission returns its stored normalized result without another upload or provider call.
- Skipping is persisted separately from evaluation attempts. A skipped question is resolved for navigation, resume, and session completion, but is not counted as a correct or evaluated answer.
- The earlier Gemini-only audio evaluator failed testing because it treated a noisy transcript as ground truth, including hearing `is` when the learner said `isn't`. It has been replaced rather than retained as a fallback.
- Learner-data cleanup is implemented: session-completion audio deletion, 24-hour unfinished-audio expiry, 90-day detailed attempt-data redaction, and 365-day identifiable speaking-history deletion.
- The Azure hybrid replacement is implemented. On iOS, the application records Azure-ready mono 16 kHz, 16-bit PCM WAV and the backend validates it before bypassing FFmpeg. Other supported formats, and WAV files that fail the exact-format check, use bounded FFmpeg normalization. Azure performs every recognition request and scripted Pronunciation Assessment; Gemini receives text only for open and translation exercises.
- Provider results are parsed into typed internal models, persisted as namespaced Azure/Gemini diagnostics, and composed into the existing provider-independent response contract. Pronunciation decisions and bilingual feedback are deterministic. Scripted pronunciation now uses a no-reference phoneme pass before reference-guided assessment. The short-P1 gate may reject focused divergence early; the general target aligner compares the unbiased continuous phoneme stream with the scripted target phonemes across Azure word boundaries before the backend trusts either transcript.
- Pronunciation feedback uses evidence-first, authored-priority ranking with up to two bullet-point issues. Among supported authored findings it prefers P1, then P2, then P3, preserving document order within a tier; independently supported fallback findings remain eligible for any remaining slot. The admin UI presents Azure's scripted result as a target-sentence assessment, underlining problem words in red, rather than presenting reference-aligned text as a literal learner transcript.
- Strong word-final consonant mismatches can override contradictory aggregate Azure word labels when the expected final consonant scores at or below `15`, a different leading candidate scores at least `90`, and the expected sound is not leading. Word-final rhotic compounds such as `/ʊɹ/` and `/ɔɹ/` have a parallel catalog-backed rule when a vowel-only candidate scores at least `90` and no credible rhotic candidate appears.
- Every question's authored pronunciation `FOCUS` is its primary acoustic rubric, with active or partial entries in the Thai-transfer catalog as fallback coverage. For either source, a strong local NBest substitution is evaluated independently of Azure's aggregate phoneme, syllable, word, and error-type labels: a different leading candidate must score at least `90` and exceed the expected candidate by at least 30 points, or the expected phoneme must be absent from a populated list of at least three alternatives. Authored priority ranks supported findings but does not create evidence; `diagnostic_only` catalog entries remain non-grading.
- Development timing diagnostics split authentication, curriculum/setup queries, private audio storage, audio normalization, Azure, Gemini, deterministic policy, persistence, and total request time. Initial iOS PCM testing removed the observed multi-second FFmpeg conversion from the critical path.
- Unit and route coverage includes normalization failures, Azure response variants, provider configuration and failures, low-confidence audio, Azure-only pronunciation, text-only Gemini routing, supported miscues, the scoped short-P1 force-alignment gate, and the rule that a scripted transcript mismatch alone cannot fail pronunciation. A live request against the configured `southeastasia` Speech resource returned recognition and pronunciation-assessment data successfully.
- Production benchmarking, threshold calibration, and integration into the normal lesson path remain to be completed.

## Product Goal

Build a guided speaking coach for Thai learners of English.

The feature is not a free-form chatbot. Curriculum, prompts, model answers, translations, and most instructional audio are predetermined. AI is used specifically to evaluate a learner's recorded response and return structured feedback.

The central technical question for V1 is:

> Can Azure's specialized speech scoring and a low-cost text model be combined to give useful, Thai-learner-aware feedback without producing trust-damaging false positives?

## Guiding Architecture

V1 uses two specialized providers behind one backend-owned evaluation contract:

```text
learner recording
        ↓
iOS: validate Azure-ready mono 16 kHz PCM WAV and pass through
other/incompatible input: bounded FFmpeg normalization to that format
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

- Azure is the only provider allowed to make claims about what the learner audibly pronounced. It receives normalized learner audio, the exact reference text for reference-guided pronunciation assessment, and no reference text for the independent phoneme pass used by scripted, open, and translation answers.
- Gemini receives text only. It evaluates meaning, relevance, grammar, vocabulary, and target-language usage for open and translation exercises. It must never infer phonemes or pronunciation quality from a transcript.
- The backend owns exercise routing, thresholds, confidence handling, issue prioritization, retry behavior, the final normalized status, and all learner-facing safety rules.
- Pailin's prerecorded audio remains the learner-facing reference voice. Azure's built-in sample voices, avatar, GPT-4o demonstration, and generated reference audio are not part of the application.

The former Gemini audio call has been removed. The core problem was not merely prompting: one generative audio model was being asked to transcribe, diagnose speech, judge content, and write feedback, and a single uncertain transcript could incorrectly fail the answer.

Uncertainty must favor the learner. A scripted transcript mismatch alone cannot fail a pronunciation answer. The scoped short-P1 gate requires either clearly unrelated no-reference recognition or localized P1 phoneme divergence. The general target aligner may reconstruct target-like speech across incorrect Azure word boundaries only from scored phoneme evidence; ambiguous alignment produces `unclear_audio`, and unrelated alignment cannot be overridden by a scripted pass.

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
11. Continue to the next speaking item after completion, or persist an intentional skip and continue without grading it.

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
QUESTION
prompt in English and/or Thai
target answer, when applicable
model or example answers, when applicable
FOCUS
prerecorded prompt audio, when applicable
```

### FOCUS rubric

Curriculum authors provide question-specific evaluation instructions in `FOCUS`. This is the primary private rubric used by the backend and, where applicable, the text evaluator. A question may contain as many focus items as are useful. Do not impose an authoring limit of one or two items merely because learner-facing feedback is capped. The response limit is a presentation rule, not a curriculum-authoring limit.

Each focus item must be assigned one of three pedagogical priorities:

- `[P1]` — an essential target or a particularly important, common, or meaning-affecting problem for Thai learners;
- `[P2]` — an important secondary problem that should be preferred after supported P1 findings; or
- `[P3]` — a lower-priority refinement that is still useful and reliably detectable.

Priority ranks supported findings; it does not create evidence. The evaluator must first apply the centralized acoustic, recognition, language, confidence, and uncertainty rules. Only findings with sufficient independent evidence are eligible to affect the learner. Among eligible findings, a lower priority number is preferred. The centralized rubric continues to decide whether an issue is significant enough to cause a retry, and the learner-facing response remains separately capped.

Write every item as a concrete, self-contained instruction. Name the exact word or phrase, the sound or language feature to check, and the likely incorrect realization when that contrast is useful. Plain language is acceptable and often preferable; IPA may be added when it makes the intended contrast clearer. For example, `In “are,” check that the /r/ is pronounced and that the word does not sound like “ah”` is valid evaluator guidance. Avoid vague instructions such as `check that everything is clear` when the likely problems can be named.

Include all realistic, pedagogically useful, and currently detectable issues for the expected response. Do not attempt to enumerate every theoretically possible phonetic deviation. Confidence thresholds, retry rules, provider behavior, and uncertainty handling remain centralized and must not be copied into individual focus items.

Treat every question independently. If the same word or construction appears in several questions, repeat every applicable focus item in each question. Never assume that an issue was covered by an earlier question. Do not, however, copy an item into a question where its target word or construction is absent. For open responses, write conditional items such as `If the learner says “It’s,” ...` when the relevant word is optional.

For `PRACTICE_TYPE: pronunciation`, author pronunciation and articulation items only. Do not use the focus to test grammar, word order, semantic relevance, or communicative naturalness. General scripted completeness may still be handled by the evaluator, but it is not a pronunciation focus. For `open` and `translation`, focus items may cover meaning, relevance, grammar, vocabulary, target structures, and conditional pronunciation checks that the current evaluator can support.

Use a single `FOCUS` label followed by one item per paragraph. The first item may appear on the same line as the label. Use bracketed priority markers without a colon so the current parser treats subsequent items as continuations of the active field:

```text
FOCUS: [P1] In “are,” check that the /r/ is pronounced and that the word does not sound like “ah.”
[P2] In “how,” check that the initial /h/ is clearly pronounced.
[P2] In “you,” check that the vowel is clearly articulated.
```

Do not use standalone `P1:`, `P2:`, or `P3:` labels in the current authored document. The parser interprets all-uppercase text followed by a colon as a structural field label. Parser schema v3 validates the bracketed form and emits both ordered structured priority data and the combined focus text used for backward compatibility.

Example:

```text
PRACTICE_TYPE: open
QUESTION: 1
OPEN_ENGLISH: How old are you?
OPEN_THAI: คุณอายุเท่าไหร่คะ?
EXAMPLE_ENGLISH: I’m 34.
EXAMPLE_THAI: ฉันอายุ 34 ปี
FOCUS: [P1] Check that the response gives an age using a natural structure such as “I’m 34” or “I am 34.”
[P1] If the learner uses “I’m,” check that the final /m/ is pronounced and that it does not sound like “I” followed directly by the age.
```

A legacy practice-level `FOCUS` remains accepted and is inherited by questions that do not define their own focus. New content must use question-level `FOCUS`. The importer stores the effective focus on each question and retains a combined practice-level value only for database compatibility and rollback.

Do not author learner-facing `FOCUS` checks for intonation, pitch contour, tonal transfer, rhythm, prosody, word or syllable stress, glottalization, or precise segment duration. Those signals are not reliable enough for current learner decisions. Do not ask the evaluator to distinguish accent quality, native-likeness, emotion, or subtle sound differences that Azure does not support reliably. A centralized error taxonomy is not required for authored focus fields; the existing runtime Thai-transfer catalog supplies secondary pronunciation checks. Authors must nevertheless repeat an applicable issue in every question where it should receive authored priority rather than relying on its appearance in a previous question.

### Authored document format and parser

The speaking curriculum is authored in a labeled Google Doc. The parser fetches the document by Google Doc ID and supports both modern tabbed Google Docs responses and legacy top-level document bodies.

Recognized structural labels include:

```text
LESSON
PRACTICE_TYPE
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
FOCUS
```

`FOCUS` belongs to the active question and may span several paragraphs. A `FOCUS` placed after `PRACTICE_TYPE` but before the first `QUESTION` is treated as a legacy practice-level default. Translation answers use dynamic `ANSWER_n` labels and must be numbered from 1. `open_chp`, `CHP_ENGLISH`, `CHP_THAI`, `FOR_EXAMPLE_ENG`, and `FOR_EXAMPLE_TH` are normalized into the ordinary `open` question contract.

Ranked focus items use `[P1]`, `[P2]`, and `[P3]` markers within that multiline `FOCUS` value. These markers are content, not structural labels. Parser schema v3 requires a valid marker on every new question-level item, emits an ordered `focus_items` collection, and continues to generate the combined focus text for backward compatibility. A legacy unranked practice-level focus is normalized to one P1 item when inherited by a question.

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
- Vowel-length or vowel-quality differences
- Final `-ing` articulation when relevant

Do not penalize a learner merely for having a Thai accent. The goal is clear, understandable English—not accent elimination or native-like speech.

Only Azure acoustic evidence may support a pronunciation issue. Only report issues that are sufficiently clear, meaningful, and useful to correct. Avoid speculative criticism, especially at phoneme level. The admin test path may expose a focus-related phoneme correction when the phoneme score is corroborated by at least two independent word, syllable, completeness, or candidate-ranking signals. Whether that granularity is appropriate for production remains a benchmark decision.

Do not attempt custom model training for V1. First collect a consented benchmark set from real Thai speakers, measure provider behavior, and tune thresholds and feedback policy. Custom Speech or another trained/accent-adapted model should be considered only after the benchmark identifies a repeatable recognition problem that calibration cannot solve.

## Evaluation by Practice Type

### Pronunciation and repeat-after-me

Use an unbiased Azure Speech phoneme assessment without `ReferenceText`, followed by scripted Pronunciation Assessment with the exact English target sentence as `ReferenceText`. A clearly diverged or unrelated eligible short-P1 attempt may stop after the unbiased call. Request detailed recognition plus overall, word, and phoneme scoring. The scripted and open-answer assessment requests use HundredMark scoring, phoneme granularity, and `EnableProsodyAssessment: "True"`; scripted attempts also enable miscue reporting. Parse and retain Azure's prosody score plus word-level break and intonation evidence as diagnostic evidence, but do not let aggregate prosody affect pass/fail until benchmarked. Admin policy diagnostics normalize break confidences above Azure's provisional `0.75` threshold and monotone evidence only for utterances with at least five assessed words; they mark future benchmark candidates without creating learner feedback. The unbiased scripted pass deliberately omits prosody.

#### Short-P1 force-alignment gate

Reference-guided assessment can force-align a materially different recording onto the supplied sentence and report expected phonemes as present. The general target aligner therefore gives every scripted pronunciation attempt a no-reference pass. For very short, high-priority items, the backend can also use that pass as an early gate and skip the scripted call when the evidence is already decisive. The early gate runs only when all of the following are true:

- the exercise is `pronunciation`;
- the reference contains three lexical words or fewer;
- at least one P1 pronunciation focus identifies exactly one target word and an expected `/IPA/` segment that can be parsed safely from the authored instruction.

The gate converts those safe P1 conventions into internal structured targets containing the target word, reference position, expected segment, initial/medial/final placement, focus order, and source instruction. It does not maintain word-specific lists of forbidden realizations. A short P1 item that cannot be parsed unambiguously skips this early gate and continues through the general target aligner rather than being guessed.

For an eligible attempt:

1. Normalize the learner audio once.
2. Request Azure unscripted Pronunciation Assessment with no `ReferenceText`, phoneme granularity, and NBest phonemes. Prosody is disabled for this gate because it is not used in the decision and would add an unnecessary paid add-on.
3. Expand common contractions only inside the gate's alignment representation, such as `you’re → you + are`, while retaining the original Azure word and phoneme indexes. This does not rewrite curriculum text, learner-visible text, accepted answers, or the `ReferenceText` sent to scripted assessment. It lets the gate detect that a learner produced only `you` while still aligning an explicitly spoken `you are` without inventing a missing contraction part.
4. Align the short recognized word sequence with the target and compare Azure's unbiased leading phoneme sequence with each expected P1 segment at its authored position.
5. Only request the ordinary detailed scripted assessment when the unbiased result is plausible or ambiguous. Clear focused divergence and unrelated speech stop after the first call.

Gate decisions are:

- **Plausible:** every parseable P1 segment is present at its expected position. Continue to scripted assessment; both stages must allow the answer before returning `pass`.
- **Diverged:** a focused contraction part, word, or expected P1 segment is clearly missing or substituted. Skip scripted assessment and return focused `Not quite` feedback, displaying up to two affected words.
- **Unrelated:** the expanded unbiased transcript has provisional text similarity below `0.45` and does not resemble the target. Skip scripted assessment and use the separate whole-sentence mismatch message instead of pretending a particular P1 sound caused the failure.
- **Ambiguous:** recognition confidence, word alignment, or unbiased phoneme evidence cannot decide safely. Run scripted assessment. A supported scripted correction remains actionable, but a scripted pass cannot override the uncertainty; return `unclear_audio` and ask for a new recording.

The three-word limit and `0.45` unrelated-similarity threshold are initial benchmark constants. Four-word and longer prompts, short prompts without P1 focus, and P1 instructions without safely parseable target metadata skip the early gate but still use the general target aligner below. Diagnostics record eligibility, decision, reason, unbiased transcript and confidence, text similarity, per-target phoneme evidence, request count, combined billed duration, and separate unbiased/scripted raw responses. The gate is deterministic and never calls Gemini.

#### General target-aware phoneme alignment

Every scripted pronunciation attempt that reaches reference-guided assessment also runs the versioned target aligner in `backend/app/speaking_coach_target_alignment.py`. Tunable costs and thresholds live in `backend/app/speaking_coach_alignment_policy.json`; the algorithm and validation remain in code.

The aligner flattens Azure's unbiased leading phoneme candidates across recognized word boundaries and compares them with the ordered target phonemes returned by the scripted assessment. Exact matches cost nothing. Locally supported catalog substitutions, a target phoneme scoring at least `75` and within `25` points of Azure's leading candidate, and `/s/ + vowel + consonant/` cluster epenthesis receive smaller costs. Ordinary substitutions, insertions, and deletions receive full costs. It produces a normalized score, target coverage, unsupported-change count, ordered operation trace, and one of `target_like`, `ambiguous`, or `unrelated`. Cluster epenthesis may support sentence reconstruction at any measured duration, but it becomes learner-facing coaching only when the inserted vowel lasts at least 80 ms; shorter segments remain diagnostic evidence.

Target-like cross-word findings may create deterministic word-level coaching, such as identifying that Azure's `use / a / map` phoneme stream resembles an attempt at `you are smart` with an inserted vowel in `/sm/` and an uncertain final consonant. The aligner does not invent missing words. Ambiguous alignment cannot be converted into a pass by the scripted result, and unrelated alignment prevents a scripted pass. Admin diagnostics include the policy version and complete score breakdown. The two captured `Use a map` and `You some app` failures are retained as regression fixtures.

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
- A focus-related phoneme is eligible at or below `45` when at least two Azure support signals corroborate it: syllable accuracy at or below `50`, word accuracy at or below `70`, completeness below `85`, or Azure's leading phoneme candidate not matching the expected phoneme. It is also eligible through the authorized strong local-substitution route described below, which is evaluated as one compound observation rather than double-counting related NBest facts as independent signals.
- For every phoneme explicitly covered by that question's authored pronunciation `FOCUS`, and for every matching active or partial catalog pattern, the checker inspects local NBest evidence without first requiring a low aggregate phoneme, syllable, or word score. A different leading phoneme must score at least `90` and either beat the expected candidate by at least 30 points or replace an expected phoneme absent from a list containing at least three alternatives. The authored item wins the appropriate P1/P2/P3 rank; otherwise the catalog match is a fallback. This rule applies in scripted and unscripted acoustic paths when the local expected phoneme is available. Unscoped mismatches and `diagnostic_only` catalog patterns do not become learner-facing findings through this route.
- A strong word-final consonant mismatch is independently eligible when the expected final consonant scores at or below `15`, Azure's leading candidate is a different sound scoring at least `90`, and the expected sound is not the leading candidate. This narrow exception applies both to focus and fallback words because Azure can assign a high aggregate word score and `ErrorType: None` while its own final-phoneme evidence clearly shows deletion or substitution.
- A final rhotic represented as a compound phoneme, such as `/ʊɹ/`, `/ɔɹ/`, `/ɑɹ/`, `/ɚ/`, or `/ɝ/`, is eligible through the `r_l_confusion` catalog rule when the aligned word-final segment has a vowel-only leading candidate scoring at least `90` and no credible `/r/` or `/ɹ/` candidate. This is a general final-r rule, not a word-specific `your` validator.
- An off-focus word is severe enough to display when its word accuracy is at or below `45` and Azure also reports `Mispronunciation` or a phoneme at or below `15`.
- An overall accuracy score at or below `45` is a fallback retry signal only when no clearer word-level issue exists.
- Completeness below `70` is a fallback retry signal when no more specific supported issue exists. Completeness may also corroborate a focus-related phoneme issue.
- Azure `Omission` and `Insertion` retain those exact documented meanings.
- Scripted transcript text disagreement with the reference is diagnostic only and cannot independently produce a retry. The separate short-P1 gate may reject a clearly unrelated no-reference transcript or a locally corroborated P1 phoneme divergence under the rules above.
- Display selection is capped at two. After the normal evidence thresholds have determined eligibility, select every supported authored candidate before considering fallback candidates: P1 first, then P2, then P3, preserving source-document order within a priority tier. Independently supported fallback findings may fill only slots left after that authored ordering. Issue category, severity, or accent-versus-language classification must not move a fallback ahead of a supported authored finding. Priority never makes weak evidence eligible.

These values are initial engineering thresholds, not production acceptance thresholds. They must be calibrated against the labeled Thai-speaker benchmark.

The scripted transcript is diagnostic evidence, not an exact-answer oracle. A scripted text mismatch by itself cannot fail an answer, and Azure's `Omission`/`Insertion` labels must retain their documented meaning rather than being rewritten as unsupported phonetic claims. The scoped gate is different: it uses a separate no-reference request, whole-utterance resemblance only to separate unrelated speech, and localized phoneme evidence to support P1 corrections.

Gemini is not called in the normal pronunciation path. Feedback comes from deterministic English/Thai templates populated with high-confidence Azure results. This keeps the fastest and most frequent exercise inexpensive and prevents a generative model from inventing pronunciation diagnoses.

Example:

```text
Target: She isn't going to work.
Learner: She going to work.
```

This is a content and structure error even if the remaining words are pronounced clearly.

### Open-ended speaking

Open-ended answers must not use exact-string matching. Multiple relevant responses may be valid.

Azure performs unscripted Pronunciation Assessment with phoneme granularity and no reference text in the same request used to recognize an open answer. The backend passes only the transcript, useful alternatives, recognition confidence, prompt, examples, private combined `FOCUS`, ordered `focus_items`, and prior retry context to Gemini. Raw audio and Azure phoneme evidence are not sent to Gemini; deterministic backend rules own pronunciation claims.

Gemini considers:

- Relevance
- Meaning
- Grammar
- Target grammar usage
- Vocabulary
- Whether a correction is material enough to justify a retry

The exercise `focus_items` determine which dimensions receive the highest priority. Gemini may apply P1, P2, P3, and same-tier document ordering only after a language finding is supported by the text evidence. It returns validated structured language findings and bilingual feedback, but the backend derives the final status and caps displayed issues. Azure recognition failure may produce `unclear_audio`; Gemini may not turn transcript uncertainty into pronunciation criticism.

The unscripted acoustic policy uses the versioned, machine-readable Thai-English transfer catalog in `backend/app/speaking_coach_thai_patterns.json`, with research rationale in `backend/SPEAKING_COACH_THAI_PRONUNCIATION_REFERENCE.md`. Catalog v3 consolidates the expanded Thai-English issue sheet into 24 non-duplicative patterns, preserving stable IDs for the original families and adding distinct checks for grammatical endings, final clusters, specific vowel contrasts, connected speech, final SH-to-stop substitution, and corroborated post-vocalic R deletion. It operates independently of authored `FOCUS` and can surface active or partial pronunciation risks as fallback findings; diagnostic-only entries are retained solely in diagnostics. Curriculum authors must still repeat a common risk in every question where it should receive authored priority. A phoneme score at or below `45` may produce a pronunciation issue when Azure's leading spoken-phoneme candidate is a cataloged transfer substitution for the expected phoneme, while the strong authorized local-NBest route above has no aggregate-score prerequisite. For `/s/ + consonant/` clusters, a consonant score through `60` may qualify when the second-ranked vowel scores at least `80` and at least two timing/word/syllable signals corroborate insertion. A narrow high-confidence path also accepts a central vowel scoring at least `90` within 10 points of the leading consonant when the aligned segment lasts at least 200 ms. A phoneme at or below `30` may also produce a generic word-level correction when the leading candidate differs and the word is marked as a mispronunciation or has accuracy at or below `65`. A supported catalog-specific finding replaces a generic finding for the same word. The authored pronunciation `FOCUS` raises priority when it names the affected word or sound; grammar-only references to contractions do not create pronunciation focus.

The first contextual cluster rule detects an `/s/ + vowel + /t/` spoken-phoneme sequence when the prompt, examples, target answer, or `FOCUS` contains an expected word beginning with `st`, such as `study` or `studying`. It then teaches the learner to keep `/s/` and `/t/` together without inserting a vowel. This combines a reusable Thai-transfer pattern with exercise context without treating the pattern itself as proof.

Contextual `st-` evidence is duration-sensitive: an aligned inserted vowel below 80 ms is retained only in admin diagnostics, while longer insertions receive progressively stronger evidence instead of a fixed score. When Azure turns a supported within-cluster sound into a spurious recognized word immediately before the intended `st-` word, the backend preserves the raw transcript for diagnostics but removes that artifact from the text used for deterministic focus validation and Gemini language evaluation. Pronunciation evidence must not manufacture a missing-grammar finding.

Objective authored language requirements also receive deterministic validation. When `FOCUS` requires present continuous and Azure confidence is at least `0.55`, the recognized answer must contain `am/is/are` or a contraction followed by a verb ending in `-ing`; Gemini cannot override an absent required structure with a pass. Open and translation answers display at most two findings. Supported authored findings use P1, P2, P3, and same-tier document order; independently supported catalog or general-language findings fill only remaining slots. Semantically equivalent deterministic and Gemini findings are deduplicated before this limit is applied.

Each catalog match has separate internal `evidence_score` and `priority_score` values from 0–100. Evidence strength comes only from the current Azure response and contextual alignment; catalog prevalence never increases it. Priority adds authored `FOCUS` and the catalog's pedagogical weight only after evidence is sufficient. Scores, pattern IDs, phoneme candidates, syllables, offsets, and durations remain in admin diagnostics and are not exposed as a learner grade. Learner-facing feedback remains word-level.

Low recognition confidence still blocks Gemini, but a strongly supported acoustic finding may produce a pronunciation-only retry. Otherwise it produces `unclear_audio`. Azure transcript guesses for open and translation answers remain available only in admin diagnostics because a best-effort recognition hypothesis is evidence for the checker, not a trustworthy learner-facing transcript. Open-answer corrections are labeled **A clearer version** rather than **Corrected answer**; pronunciation and translation retain their existing correction-label presentation.

### Translation

Translation exercises accept natural semantic equivalents rather than exact strings.

Example:

```text
Thai prompt: ฉันปวดท้อง

Acceptable:
- I have a stomachache.
- My stomach hurts.
```

Azure first performs unscripted Pronunciation Assessment and recognition without a reference sentence, using the same Thai-transfer acoustic policy as open speaking. When accepted target answers are available and the audio is usable, the backend chooses the expanded accepted variant with the most spoken words, makes a second reference-guided request to obtain its canonical phoneme sequence, and runs the general target-aware aligner against the original unbiased phoneme stream. This reference is an acoustic hypothesis, not an exact-string requirement: an ambiguous or unrelated alignment leaves the original transcript for Gemini, so other natural translations remain eligible. A target-like alignment replaces Azure's provisional text only inside language evaluation and may add deterministic pronunciation coaching. Raw and reconstructed forms remain visible in admin diagnostics; neither transcript is shown to the learner.

Gemini receives the selected evaluation transcript and alternatives, the Thai prompt, all accepted target answers, private `FOCUS`, examples, and prior retry context. It judges semantic equivalence and natural English rather than exact wording. For example, if Azure recognizes `Use a map` but the cross-word phoneme stream strongly aligns to `You are smart` through supported Thai-transfer patterns, Gemini evaluates the reconstructed target-like hypothesis rather than treating `Use a map` as the learner's intended meaning.

Gemini may identify meaning, grammar, vocabulary, or target-usage problems. It may not assess pronunciation. The backend combines validated language findings with independently supported Azure acoustic findings and applies authored P1, P2, P3, and same-tier document order before any non-authored fallback, regardless of issue category. It then applies the shared retry policy and owns the final status. Recognition uncertainty favors `unclear_audio`, and the learner-facing response omits Azure's transcript guess.

### Provider-use matrix

| Exercise type | Azure input and output | Gemini input and output | Backend decision |
| --- | --- | --- | --- |
| Pronunciation | Unbiased WAV assessment plus exact-target scripted assessment; provisional transcript, leading candidates, target phonemes, scores, and miscues | Normally not called | Target-aware cross-word alignment, conservative acoustic thresholds, and authored focus |
| Open | WAV without reference text; transcript, alternatives, confidence, overall/word/syllable/phoneme scores and spoken-phoneme candidates | Text context; relevance, grammar, vocabulary, target usage, bilingual feedback | Combines conservative Thai-transfer acoustic rules with validated language materiality |
| Translation | Unbiased WAV assessment plus one expanded accepted-answer reference assessment when usable; provisional transcript, target phonemes, scores, and candidates | Reconstructed target-like text or the original transcript when alignment is ambiguous/unrelated; semantic equivalence, grammar, naturalness, bilingual feedback | Target-aware arbitration before combining acoustic coaching with validated translation materiality |

Gemini remains useful because Azure Speech provides speech recognition and acoustic scoring, not curriculum-aware semantic grading and tailored bilingual language feedback. The Microsoft language-learning demo combines several products, including GPT-4o; the application does not need to reproduce that bundle or pay for GPT-4o when low-cost text-only Gemini is sufficient.

## Attempt and Retry Rules

During evaluator testing, blocking failures may still be exercised repeatedly. Coaching-only accent findings now request at most one retry: the schema uses instructional attempt `1` for the initial answer and `2` for the follow-up, after which the question completes. Completed questions may still be reopened from the admin test path.

Before production, restore the intended learner policy below or replace it with an explicitly tested policy. The original product target is a maximum of two instructional attempts:

### Attempt 1

- If correct, return `pass`, show brief positive feedback, and continue.
- If there is a meaningful correctable error, return `retry`, show concise feedback, and allow one retry.

### Attempt 2

- Primarily re-check the issues identified during Attempt 1.
- If a coaching issue resolves or its composite evidence score improves by at least five points and no new supported issue appears, return `pass`, show positive feedback, and continue.
- If a new supported issue appears, return `continue_with_correction`, show the new or strongest current correction, and continue anyway. Record new issues separately from resolved and improved retry targets so improvement cannot hide a newly introduced problem.
- If a coaching issue remains without measurable improvement, return `continue_with_correction`, show the correction, and continue anyway.
- Do not trap the learner in an exercise.

Attempt 2 still primarily asks whether the learner fixed the requested issue, but every newly surfaced correction must already satisfy the ordinary evidence thresholds. New supported issues do not trigger a third attempt; they use `continue_with_correction` so the learner receives accurate feedback without becoming trapped in the exercise.

## Feedback Rules

The evaluator may detect several issues internally, but the learner sees at most two.

After evidence thresholds determine which findings are supported, prioritize feedback in this order:

1. Authored P1 findings
2. Authored P2 findings
3. Authored P3 findings
4. Source-document order within the same authored priority
5. Independently supported fallback findings for any remaining display slots

Meaning, relevance, grammar, vocabulary, pronunciation, intelligibility, and accent-related labels describe an issue; they are not competing priority tiers and must never override the authored ordering. Evidence requirements remain authoritative: priority ranks supported findings but cannot make an unsupported finding eligible.

Feedback must be concise, actionable, encouraging, and available in English and Thai.

Feedback depth must be calibrated through user testing. More detail is not automatically more useful, and invoking Gemini for pronunciation merely to make prose more polished adds latency and cost without improving acoustic accuracy. V1 should prefer:

- one high-confidence, exercise-relevant correction;
- at most two displayed issues in normal cases;
- priority-ordered authored bullet-point feedback, with a severe off-focus issue only when a display slot remains;
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
- After the first and second consecutive unclear recordings, ask the learner to record again on the same question.
- After the third and fourth consecutive unclear recordings, show: **“We’re still unable to hear your audio. Try moving somewhere quieter and make sure your microphone isn’t covered.”** Enable **Try Again** and **Skip**.
- The fifth consecutive unclear recording is a hard ceiling. Show: **“We’re unable to check another recording for this question. You can skip it or exit practice.”** Enable **Skip** and **Exit Practice**, and do not offer another recording submission.
- Do not consume the learner's normal instructional retry.
- Track repeated recording failures separately from answer correctness. The counter is scoped to the session and question, is derived from persisted completed attempts so it survives reloads, and resets after any usable evaluation (`pass`, `retry`, or `continue_with_correction`). Failed provider calls neither increment nor reset it.
- Replaying the same idempotent submission returns the stored result without incrementing the counter. Once five consecutive unclear results exist, the backend rejects any new submission for that question with `unclear_audio_limit_reached` before storing audio or calling a provider.
- **Try Again** starts a fresh recording for the same question; it does not restart the session.

## Normalized Evaluation Contract

The implemented provider-independent contract is versioned as `speaking-evaluation-v1`. The backend validates it with strict Pydantic models that reject unknown fields, then returns the same field names to the application and persists the version in `evaluator_schema_version`.

```json
{
  "status": "retry",
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
        "category": "pronunciation",
        "description_en": "Make the final sound in ‘friend’ clear.",
        "description_th": "ออกเสียงท้ายคำว่า ‘friend’ ให้ชัดเจน"
      }
    ],
    "assessment_tokens": [
      {
        "text": "My ",
        "status": "clear",
        "issue_index": null
      },
      {
        "text": "best ",
        "status": "clear",
        "issue_index": null
      },
      {
        "text": "friend ",
        "status": "needs_work",
        "issue_index": 1
      },
      {
        "text": "is ",
        "status": "clear",
        "issue_index": null
      },
      {
        "text": "at ",
        "status": "clear",
        "issue_index": null
      },
      {
        "text": "sleep.",
        "status": "clear",
        "issue_index": null
      }
    ]
  },
  "detected_issues": [
    {
      "category": "grammar",
      "description_en": "Use ‘sleeping’ after ‘is’.",
      "description_th": "ใช้ ‘sleeping’ หลัง ‘is’"
    },
    {
      "category": "pronunciation",
      "description_en": "Make the final sound in ‘friend’ clear.",
      "description_th": "ออกเสียงท้ายคำว่า ‘friend’ ให้ชัดเจน"
    }
  ],
  "displayed_issues": [
    {
      "category": "grammar",
      "description_en": "Use ‘sleeping’ after ‘is’.",
      "description_th": "ใช้ ‘sleeping’ หลัง ‘is’"
    },
    {
      "category": "pronunciation",
      "description_en": "Make the final sound in ‘friend’ clear.",
      "description_th": "ออกเสียงท้ายคำว่า ‘friend’ ให้ชัดเจน"
    }
  ],
  "corrected_answer": "My best friend is sleeping.",
  "feedback_en": "Almost! Use ‘sleeping’ after ‘is’.",
  "feedback_th": "เกือบถูกแล้ว ใช้ ‘sleeping’ หลัง ‘is’",
  "retry_focus": [
    "present continuous -ing ending"
  ]
}
```

Field rules:

- `status` is one of `pass`, `retry`, `continue_with_correction`, or `unclear_audio`.
- `transcript`, `corrected_answer`, every `content` boolean, and `pronunciation.intelligible` are nullable.
- Every issue contains exactly `category`, `description_en`, and `description_th`. `category` is one of `focus`, `meaning`, `relevance`, `grammar`, `vocabulary`, `pronunciation`, `intelligibility`, or `audio_quality`.
- `detected_issues`, `displayed_issues`, `pronunciation.issues`, `pronunciation.assessment_tokens`, and `retry_focus` are arrays, not nullable fields. The validation schema permits up to three displayed issues for defensive compatibility, while the learner-facing selection policy returns at most two.
- `assessment_tokens[].status` is one of `clear`, `needs_work`, or `missing`; `issue_index` is nullable and otherwise links to the zero-based displayed-issue position.
- `retry` requires at least one `retry_focus` item.
- `unclear_audio` forcibly clears detected/displayed issues, retry focus, and corrected answer.

Provider evidence has a separate internal confidence/certainty representation so the backend can distinguish a supported correction from an ambiguous hypothesis. Confidence may be numeric where supplied by Azure and categorical where derived by application rules; it is not fabricated when a provider omits it. Provider-specific evidence and diagnostics are not part of `speaking-evaluation-v1`.

For pronunciation exercises, `assessment_tokens` contains the target sentence split into ordered text tokens. Each token has status `clear`, `needs_work`, or `missing`, plus a nullable `issue_index` linking it to the corresponding displayed issue. This is target-aligned assessment data, not a literal transcript.

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
client_submission_id
instructional_attempt_number
previous_attempt_id, for Attempt 2
```

Backend flow:

1. Authenticate and authorize the learner.
2. Load the speaking exercise.
3. Load `PRACTICE_TYPE`, `FOCUS`, prompt, and target data.
4. Load the prior attempt when evaluating Attempt 2.
5. Validate the upload type and bytes. Pass through an already compatible mono 16 kHz, 16-bit PCM WAV; otherwise normalize supported input to that format with bounded FFmpeg.
6. Call Azure Speech with a server-side API key.
7. For pronunciation, parse Azure Pronunciation Assessment and apply conservative deterministic rules.
8. For open or translation, construct a text-only Gemini request from validated Azure text and private curriculum context.
9. Parse and validate every provider response.
10. Normalize enums, confidence, optional fields, and the final application-owned status.
11. Store the attempt result and provider metadata without secrets or raw audio.
12. Return clean application data.

Never return unvalidated model output directly to the frontend. Malformed output must produce a safe fallback rather than undefined UI behavior.

### Submission idempotency and concurrency

The application generates a UUID `client_submission_id` when a recording enters review and reuses it for every HTTP retry of that same local recording. Recording again creates a new UUID. The backend derives instructional attempt numbers and previous-attempt relationships from stored history; client-supplied attempt metadata is not authoritative.

`user_speaking_coach_attempts` enforces unique `(session_id, client_submission_id)` values. It also permits only one row in `uploaded` or `evaluating` state for a given `(session_id, question_id)`. The endpoint reserves the attempt row before uploading audio or calling a provider.

Repeated submissions behave as follows:

- a new submission ID reserves a new attempt and begins evaluation;
- a completed matching submission returns the original attempt ID, normalized evaluation, and current session payload with `replayed: true`, without another Storage upload or provider call;
- a matching `uploaded` or `evaluating` submission returns `submission_in_progress` and does not start another evaluation;
- a matching failed submission returns `submission_failed`; recording again creates a new submission ID and may be evaluated normally;
- reusing one submission ID for a different question returns `submission_id_conflict`;
- a different submission ID received while that question is already processing returns `question_evaluation_in_progress`.

An hourly cleanup marks `uploaded` or `evaluating` attempts older than ten minutes as failed with `processing_interrupted`, releasing the database concurrency lock after a worker crash. The timeout is controlled by `SPEAKING_COACH_PROCESSING_STALE_MINUTES` and must remain comfortably above the request timeout.

Implemented skip endpoint:

```text
POST /api/speaking/sessions/{session_id}/questions/{question_id}/skip
```

The endpoint authenticates the learner, verifies the active session and its curriculum hash, confirms that the question belongs to the session, and persists one idempotent skip record per session and question. A completed question cannot subsequently be skipped, and a skipped question cannot subsequently be evaluated within the same session. The response returns the updated session payload, including separate `completed_question_ids` and `skipped_question_ids` collections.

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
- Persisted question skipping
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

The test route uses an admin-only `GET /api/speaking/lessons` catalog to discover lessons with active speaking content, then groups them into lightweight level and lesson selectors. It loads the selected lesson through the authenticated learner-facing curriculum endpoint and supports:

- All three current practice types
- Authored English and Thai prompts
- Practice-set tips and revealable example answers
- Public Pailin audio for pronunciation and open-speaking questions
- No Pailin audio for translation questions
- Microphone permission handling
- Local recording, stop, replay, and re-record controls
- A fresh native recorder and output URL for every initial or retry recording; a stopped WAV recorder is never reused after its file has been opened for review playback
- A review-before-submission state
- Real evaluating, correct, retry, final-correction, and unclear-audio states
- The shared pulsing Pailin loading state while the lesson or evaluator response is loading
- Type-appropriate playback labels on feedback screens
- Bullet-point bilingual issue feedback and an annotated target sentence for pronunciation retries
- Development-console evaluator diagnostics for authenticated admins. The response includes sanitized provider metadata, the raw Azure JSON result, frontend round-trip timing, backend stage timings, and evaluator substage timings, but excludes audio, credentials, signed URLs, and private evaluator context. Non-admin responses omit this field.

The current `Submit recording` action now:

- Creates or resumes an authenticated lesson-scoped speaking session
- Uploads learner audio to private temporary storage
- Canonicalizes common WAV MIME aliases, safely recognizes mislabeled WAV uploads by their `RIFF`/`WAVE` signature, and never trusts a MIME label alone
- Passes validated Azure-ready iOS WAV through without conversion and normalizes other provider-bound formats to mono 16 kHz PCM WAV
- Sends pronunciation audio through a no-reference phoneme pass first; clear short-P1 divergence may stop early, while other attempts continue to scripted assessment
- Uses target-aware cross-word phoneme alignment, scripted Azure Pronunciation Assessment, and deterministic backend feedback for pronunciation exercises
- Uses unscripted Azure Pronunciation Assessment and the shared Thai-transfer acoustic policy for open and translation exercises
- Sends only Azure transcripts, alternatives, confidence, and private curriculum context to `gemini-3.5-flash-lite` for open and translation exercises
- Validates typed provider responses and a provider-independent structured evaluation response
- Persists attempts, feedback, provider metadata, and progress
- Allows repeated admin testing while coaching-only learner attempts complete after one follow-up; unclear-audio retries remain separate

The route remains admin-only while the Azure hybrid evaluator is benchmarked. The backend requires server-side `AZURE_API_KEY`, `AZURE_SPEECH_REGION`, and `GEMINI_API_KEY` values. No provider key is required in the mobile application.

## Frontend Design Reference

This section documents the current Speaking Coach frontend screens, behavior, and implementation decisions.

### Shared development controls

- During standalone Speaking Coach development, keep the existing lesson selector controls (`1.1`, `1.2`, and so on) at the top of every screen being designed.
- These controls are temporary development/navigation tools and are not part of the supplied screen designs.
- The Speaking Coach flow will eventually be embedded in the actual lesson page, at which point these temporary controls can be removed.

### Asset location

- Speaking Coach artwork lives in `assets/images/speaking-coach/`.
- Use `pailin-time-to-speak.webp` for the welcome-page Pailin illustration.
- Additional artwork and icons will be added to this folder. Do not create final substitutes for missing assets without checking the folder first.

### Welcome page: “Time to speak!”

#### Purpose

Introduce the speaking session, show the two practice stages included in the selected lesson, remind the learner to speak somewhere quiet, and provide one clear entry point into the session.

#### Page structure

From top to bottom, the screenshot shows:

1. The temporary lesson selector controls, above the supplied design while the feature is developed in isolation.
2. A close button (`×`) aligned to the upper-right of the content area.
3. The `pailin-time-to-speak.webp` illustration, centered.
4. Centered heading: `Time to speak!`
5. Centered supporting copy: `Put what you learned into practice by speaking out loud.`
6. A two-step vertical practice list. Each step is a bordered, rounded card with a numbered blue circle overlapping its left edge. The cards are visually separate, with no connector line between them.
7. A pale-green reminder banner with a lightbulb icon and the text: `Make sure you’re in a quiet place and speak clearly!`
8. A full-width blue primary button with a microphone icon and the label `START SPEAKING!` The dark lower edge/shadow gives the button a pressed, dimensional treatment.

The reminder and primary action sit toward the bottom of the viewport. Preserve comfortable safe-area spacing on mobile and allow the main content to scroll on shorter screens rather than compressing or clipping it.

#### Practice cards

Step 1 is consistent across the shown lesson variants:

- Title: `PRONUNCIATION PRACTICE`
- Description: `Listen to the sentences and repeat. Focus on getting your pronunciation right!`
- Visual: `pronunciation-practice.png`

Step 2 is selected from the practice types available in the chosen lesson:

- For `open`: title `CONVERSATION PRACTICE`; description `Answer the questions using what you’ve learned! Use the lesson focus in your answers.`; `conversation-practice.png`.
- For `translate`: title `THAI TO ENGLISH`; description `Translate the sentences from Thai to English, then speak them out loud!`; `thai-to-english.png`.

If a lesson includes Conversation Practice (`open`), show Conversation as step 2 even when the lesson also includes Thai to English. If the lesson has no Conversation Practice, show Thai to English as step 2. Recalculate this card whenever the temporary lesson selector changes the selected lesson.

The left screenshot is the `pronunciation + open` variant. The right screenshot is the `pronunciation + translate` variant.

#### Initial interactions

- Close button: exits the Speaking Coach welcome flow and returns to the containing lesson experience.
- `START SPEAKING!`: starts a fresh session at question 1 of step 1, Pronunciation Practice, for the currently selected lesson.
- The cards communicate the session sequence; the screenshot does not establish them as separate navigation buttons, so treat them as non-interactive until later designs specify otherwise.
- The temporary lesson selector changes which lesson content and step-2 variant the standalone frontend previews.

#### Visual direction from the screenshot

- Mobile-first, single-column layout.
- Very light cool-gray page background with white cards.
- Dark charcoal text and thin dark card outlines.
- Light-blue numbered circles; the practice cards have no connector line between them.
- Bright blue primary action, pale-green reminder, rounded corners, and generous vertical spacing.
- Bold, uppercase labels for practice titles and the primary action; friendly rounded typography elsewhere.
- Exact spacing, type sizes, colors, radii, and icon dimensions remain provisional until implementation and comparison against the source design.

### Pronunciation Practice flow

Pronunciation Practice uses the existing two-attempt recording and evaluation flow with a dedicated visual presentation.

#### Shared elements

- Question-progress dots and the `PRONUNCIATION PRACTICE` label appear at the top of the practice content.
- The temporary level and lesson selectors remain above the supplied design during standalone development.
- Every question displays Pailin, the English target sentence, its Thai translation when available, and model audio.
- Bookmark icons and the `Bookmark to practice later!` action are intentionally omitted for now.

#### States

1. **Ready:** show `pailin-do-the-task.webp`, `Listen, then repeat!`, the target sentence, Pailin playback, a `YOUR TURN!` recording panel, and `Try 1 of 2`.
2. **Recording:** replace the microphone with the red stop control and show a live recording timer.
3. **Review:** allow playback of the learner's recording, submission for evaluation, or recording again. Recording again does not consume a submitted attempt.
4. **Correct:** show `pailin-good-job.webp`, the green `Correct!` state, Pailin and learner playback, positive feedback, and `CONTINUE`.
5. **First submitted attempt needs work:** show `pailin-try-again.webp`, `Not quite!`, Pailin and learner playback, focused correction feedback, and a `TRY AGAIN!` panel marked `Try 2 of 2`. When the evaluator returns multiple `displayed_issues`, show every returned issue beneath its summary rather than truncating the list to the first issue.
6. **Second submitted attempt needs work:** keep the final `Not quite!` correction state, remove further recording controls, and show `CONTINUE`.

`SKIP →` remains available while the learner can record or retry. It persists the question as skipped before advancing; it does not create an evaluation attempt or count the question as correct. `CONTINUE` advances after a correct result or after final feedback on the second submitted attempt.

### Thai-to-English flow

Thai-to-English reuses the same progress dots, Pailin character states, speech-bubble geometry, two-attempt recording lifecycle, and evaluator-driven result states as Pronunciation Practice.

#### Shared elements

- The practice label is `THAI TO ENGLISH` and Pailin's initial instruction is `Say it in English!`.
- The prompt card displays the authored Thai sentence and a `Thai → English` direction pill.
- For temporary checker testing, the admin preview requests a single `test_answer_en` and displays it directly beneath the Thai prompt. The API only supplies this field to authenticated admins who explicitly request it; normal learner lesson responses continue to omit answers.
- Bookmark controls are omitted.
- Learner feedback shows a playback control for the recorded answer, the evaluator summary, and every returned `displayed_issue`. It does not display Azure's recognized transcript.

#### States

1. **Ready:** show the Thai prompt and a `TRANSLATE THE SENTENCE` recording panel marked `Try 1 of 2`.
2. **Recording and review:** reuse the stop, timer, playback, submit, and record-again behavior from Pronunciation Practice.
3. **Correct:** show the shared green `Correct!` Pailin state, learner-recording playback, positive feedback, the reference answer, and `CONTINUE`.
4. **First submitted attempt needs work:** show the shared red `Not quite!` Pailin state, learner-recording playback, all returned corrections, and a `TRY AGAIN!` panel marked `Try 2 of 2`.
5. **Second submitted attempt needs work:** show final correction feedback and `CONTINUE` without another recording attempt.

The design includes a `HEAR PAILIN` control for the reference answer. Translation questions currently have no reference-answer audio URL in the application contract, so the control remains visibly disabled until prerecorded answer audio is supplied by the backend. Do not synthesize or substitute a different voice.

## Supabase Schema

The live schema uses the existing `lessons` and `users` tables. A speaking session covers all active speaking practice sets and questions belonging to one lesson.

```text
lessons.id (uuid)
└── speaking_coach_practice_sets.id (bigint)
    └── speaking_coach_questions.id (bigint)

users.id (uuid)
└── user_speaking_coach_sessions.id (uuid)
    ├── user_speaking_coach_attempts.id (uuid)
    └── user_speaking_coach_skips.id (uuid)
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
tip_en
tip_th
sort_order
content_hash
is_active
```

`practice_type` is constrained to `pronunciation`, `open`, or `translation`. The practice-level `focus` value is retained as a legacy fallback and combined compatibility projection; evaluation uses the question-level focus when present.

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
focus
focus_items
prompt_audio_key
content_hash
is_active
```

The normalized `prompt`, `target_answers`, `examples`, question-level `focus`, and ordered `focus_items` shape supports every current practice type. `focus_items` is a validated JSONB array whose entries contain `priority` and `instruction`; the importer also retains the combined `focus` projection for compatibility. The evaluator-only question query loads both fields, while learner-facing queries select neither. Focus data and target answers are private evaluator references and must not be exposed through direct client queries.

### `user_speaking_coach_sessions`

Stores one learner run through the speaking-coach portion of an entire lesson. Session status is `active`, `completed`, or `abandoned`.

`content_hash` records the lesson speaking-content version at session creation. If the authored speaking content changes while a session is active, abandon that session and create a new one rather than silently changing its assigned curriculum.

`current_question_id` is only a resume convenience. It is not the fundamental progress record. On resume, the backend derives the first unresolved active question from terminal attempts and persisted skips.

Only one active session is allowed per user and lesson. A later repeat of a completed lesson creates a new session.

The admin Speaking Coach test screen exposes a persistent **New session** control. It force-creates a fresh session, abandons the prior active session through the backend session API, clears local attempt/evaluation state, and returns to the fresh session's current question (normally question one). Restarting or reloading the app alone resumes the existing active session and is not a testing reset.

### `user_speaking_coach_attempts`

Stores every submitted recording and its evaluation lifecycle. `evaluation_sequence` increments for every recording, including unclear audio and failed provider calls. `instructional_attempt_number` remains limited to 1 or 2: `1` is the initial answer and `2` is the coaching follow-up. Coaching-only findings complete after attempt 2 with either `pass` or `continue_with_correction`; blocking failures may remain available for repeated admin evaluation. `unclear_audio` does not change the instructional attempt number.

`client_submission_id` identifies one local recording submission and is unique within its session. It is stable across network retries but changes when the learner records again. A partial unique index on `(session_id, question_id)` for `uploaded` and `evaluating` rows prevents concurrent provider calls for the same question.

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

A session becomes complete when every active question assigned to it has either a completion attempt or a persisted skip. Terminal attempts are the authoritative evaluation-completion history; persisted skips are the authoritative intentional-skip history. Session status is a session-level summary of both.

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

### `user_speaking_coach_skips`

Stores an intentional learner skip without fabricating an evaluation result. Each row contains `user_id`, `session_id`, `question_id`, and `skipped_at`, with a unique constraint on `(session_id, question_id)`.

A skip resolves the question for forward navigation, resume, and session completion. It does not create an attempt, consume an instructional attempt, appear in `completed_question_ids`, or contribute to evaluation-success analytics. Session responses expose it through `skipped_question_ids`. If the learner wants to answer that question later, they must start a fresh session; the same session cannot evaluate a skipped question.

### Access control

Row-level security is enabled on all speaking-coach tables, including the skip table. There are intentionally no anonymous or authenticated client policies. All access goes through the backend service-role client so hidden answers, rubrics, evaluator context, provider output, and progress mutations cannot be queried or written directly from the application.

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
{user_id}/{session_id}/{attempt_id}.{validated_extension}
```

The current iOS path uses `.wav`; supported compressed Android/web recordings retain their validated extension. Storage metadata uses the backend's canonical MIME type rather than an unrecognized client alias.

The bucket is private and has a 10 MB per-object limit. Upload, replay, and deletion must use the backend service role or short-lived signed URLs generated by the backend. No direct `storage.objects` client policies are required for V1.

The React Native iOS recorder uses Linear PCM and produces a mono, 16 kHz, 16-bit `.wav` recording that already matches Azure's required input. It must receive the complete recording options on every `prepareToRecordAsync(...)` call so Expo creates a fresh native recorder and unique output file for retries. Android and web retain supported compressed recording presets until an equivalent direct PCM path is implemented.

Do not relabel compressed bytes as `audio/aac`. Canonicalize known aliases such as `audio/vnd.wave` and `audio/wave` to `audio/wav`. If React Native sends a valid WAV as `application/octet-stream`, accept it only after checking its `RIFF` and `WAVE` byte signature. Before bypassing conversion, validate the WAV channel count, sample rate, sample width, compression type, duration, and size. Any supported recording that is not already compatible must be normalized to:

```text
mono
16 kHz
16-bit PCM
WAV container
```

Fallback normalization uses a bounded conversion process with fixed arguments, a timeout, temporary-file cleanup, input/output size limits, and safe handling of malformed media. The normalized working file is ephemeral and is not added to permanent storage.

Automatic cleanup must be scoped only to the private `speaking-coach-audio` bucket. It must never delete objects from the permanent `speaking-coach-prompts` bucket.

Implemented retention behavior:

- completing a session immediately deletes all of that session's learner audio;
- active, abandoned, failed, and otherwise unfinished recordings expire after 24 hours;
- an hourly, idempotent cleanup pass removes expired objects in bounded batches and sets `audio_deleted_at` only after Storage accepts the deletion;
- account deletion removes all learner audio before the user's database rows are deleted;
- transcripts, text-rich evaluation results, feedback, corrections, issue details, raw provider output, evaluator context, and detailed failure strings are redacted after 90 days; stored audio paths are also cleared at that point only when Storage deletion has already been confirmed, so redaction cannot orphan an undeleted recording;
- compact operational fields—including evaluation outcome, provider and model identifiers, prompt/schema versions, usage, latency, failure code, question/session relationships, and timestamps—are retained for up to 365 days to measure evaluator quality, reliability, latency, cost, retry behavior, and curriculum-level performance;
- after 365 days, the scheduled cleanup deletes the identifiable session, attempt, and skip records rather than retaining them indefinitely;
- the scheduled endpoint is protected by `SPEAKING_COACH_CLEANUP_SECRET`, and the matching scheduler token is stored in Supabase Vault.

Do not permanently accumulate learner voice recordings. Recordings collected for future model development require a separate, explicit, revocable consent flow and a separately documented retention policy; ordinary Speaking Coach recordings must not silently enter a training dataset.

Before production release, the privacy disclosure must explain microphone access, AI-provider processing, the 24-hour audio limit, the 90-day detailed-data limit, the 365-day compact-history limit, and account-deletion behavior. It must also tell learners how to request access to or deletion of their speaking data. A secure support-mediated JSON export and deletion process is sufficient for V1; a self-service export endpoint is not required before launch.

Suggested learner-facing summary:

> Speaking recordings are deleted when the speaking session is completed, or within approximately 24 hours if the session is unfinished. Transcripts, feedback, and detailed AI evaluation data are retained for up to 90 days for quality assurance and troubleshooting. Limited usage and performance records may be retained for up to 365 days for product analytics. When you delete your account, associated Speaking Coach recordings and identifiable evaluation records are deleted. You may contact support to request access to or deletion of your speaking data.

## Retained Attempt Data

The attempt schema persists:

```text
id
user_id
session_id
question_id
client_submission_id
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

Detailed attempt data follows the 90-day redaction policy above. Compact operational fields may remain linked to the learner for no more than 365 days, after which the session, attempt, and skip records are deleted. Account deletion removes learner audio first and then explicitly deletes the associated attempts, skips, and sessions before removing the account. Any longer-lived analytics must be genuinely aggregated or de-identified and must not contain transcripts, feedback text, stable user identifiers, or row-level data that can reasonably be linked back to a learner.

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
- one Azure request for open attempts, unclear translation attempts, and short-P1 pronunciation attempts rejected by the early gate; two sequential Azure requests for usable translation attempts and other scripted pronunciation attempts;
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
2. Added direct Azure-ready PCM WAV recording on iOS, strict compatible-WAV pass-through, bounded fallback normalization, canonical WAV MIME aliases/signature detection, and corrected compressed-audio MIME handling.
3. Implemented an Azure Speech REST provider supporting detailed recognition and scripted Pronunciation Assessment.
4. Parsed Azure recognition, confidence, overall scores, word scores, phonemes, and miscues into an internal typed result.
5. Routed pronunciation exercises through Azure-only conservative backend rules and bilingual templates.
6. Refactored Gemini into a text-only evaluator for open and translation exercises; learner audio is never attached.
7. Passed Gemini Azure transcript alternatives/confidence and private exercise context, then validated its structured language result.
8. Routed both open and translation exercises through unscripted Azure acoustic assessment and the shared catalog-backed Thai-transfer pronunciation policy while keeping their Gemini language rubrics distinct.
9. Composed provider evidence into the existing normalized application contract and persisted namespaced hybrid diagnostics.
10. Expanded unit and route tests across the hybrid paths, provider failures, low confidence, malformed audio, and the rule that scripted transcript mismatch alone cannot fail pronunciation.
11. Smoke-tested the configured Azure Free Speech resource successfully; the required Fly secrets are configured.
12. Added focus-first two-issue display selection, catalog-backed final-r deletion for compound rhotic phonemes, and strong final-consonant mismatch handling that is not defeated by contradictory aggregate Azure word scores.
13. Added the scoped sequential short-P1 force-alignment gate: no-reference phoneme evidence first for parseable P1 targets in prompts of three words or fewer, early focused/unrelated rejection, ambiguity protection, disabled gate prosody, and separate request/evidence diagnostics.
14. Added frontend/backend stage timing diagnostics, pulsing Pailin loading states, and a fresh-recorder retry lifecycle for PCM WAV recordings.
15. Added a versioned target-aware phoneme aligner for scripted pronunciation, tunable JSON scoring policy, cross-word cluster reconstruction, final-candidate coaching, complete admin score diagnostics, and regression fixtures for the captured `Use a map` and `You some app` failures.
16. Extended target-aware alignment to translation before Gemini language grading. Target-like phoneme evidence can now replace a misleading provisional transcript such as `Use a map` with the selected accepted-answer hypothesis while retaining pronunciation coaching and raw admin diagnostics.

After implementation:

1. Create a labeled recording set containing correct Thai-accented speech and controlled errors.
2. Benchmark false positives, false negatives, latency, and cost for each exercise type.
3. Tune Azure thresholds and feedback granularity without training on the held-out evaluation set.
4. Verify retry, resume, navigation, progression, and full-lesson completion behavior on physical devices and the simulator where audio hardware permits.
5. Validate the five-recording unclear-audio ceiling and learner guidance on physical devices.
6. Integrate the speaking flow naturally into the lesson experience only after the quality bar is met.

The initial database and UI foundation are provisioned. The Azure integration reuses the existing endpoint and normalized attempt schema without requiring a schema change. Avoid substantial production UI work until the hybrid evaluator demonstrates acceptable accuracy and false-positive performance.

## Open Decisions

The following remain intentionally unresolved:

- Benchmark acceptance thresholds
- Exact Azure score thresholds and confidence bands
- Whether future benchmark evidence justifies promoting any prosody signal beyond diagnostic-only use
- Whether phoneme-level feedback is reliable enough for learners or should remain diagnostic only
- The final production retry limit and whether completed questions may be intentionally repeated outside admin testing

These decisions should be made through prototyping, benchmarking, privacy review, and operational requirements rather than assumed in the client implementation.
