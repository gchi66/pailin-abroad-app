# Practice Thai translation grey — implementation handoff

## Requested behavior

Within lesson practice question cards, Thai text that directly translates an
English question, example sentence, or answer option should use the same light
grey as translated Thai lines in the rich lesson sections.

This must apply consistently to every practice question type:

- multiple choice
- open-ended
- sentence transform
- fill blank
- correct/incorrect layouts handled by the practice renderers
- A/B question layouts
- example questions

Only companion translations should be grey. The following should keep their
existing styling:

- exercise titles
- instructions and explanatory paragraphs
- feedback and validation messages
- standalone Thai content that is not translating an English line
- user-entered answers
- inputs and placeholders
- English questions and answers
- audio buttons, highlights, links, underlines, and blank positioning

For example, given:

```text
1  What had you already done by the time you ate your first meal today?
   คุณได้ทำอะไรเสร็จไปบ้าง ก่อนถึงช่วงเวลาที่คุณกินข้าวมื้อแรกของวันนี้?
```

the English question remains black and the Thai line becomes grey.

## Canonical translation-grey style

The rich lesson renderer uses:

```ts
richInlineThaiMuted: {
  color: '#8C8D93',
}
```

This is the desired color and behavior. Do not substitute the generic
`AppText` muted color. `AppText variant="muted"` uses
`theme.colors.mutedText`, currently `#3D3D3D`, which is darker.

Rich sections apply `richInlineThaiMuted` at the Thai line/span level so that
English in the same content block remains black. Examples include translated
audio rows, Apply dialogue, and translated lines following audio in tables.
Ordinary Thai-only body content remains black because it is primary content,
not a companion translation.

## Current practice-rendering audit

### Sentence transform

- Separate rich Thai translations use
  `renderRichInlines(..., { lineIsThaiOverride: true })` and therefore get
  `#8C8D93`.
- Plain Thai translations use generic muted styling (`#3D3D3D`).
- Bilingual `orderedContent` is rendered in one black `AppText`, so its Thai
  lines remain black.

### Multiple choice

- Separate rich question translations already use `lineIsThaiOverride` and
  get `#8C8D93`.
- Plain question translations use `#3D3D3D`.
- Ordered bilingual question content is black.
- Plain option translations use `practiceOptionThaiText`, currently
  `#3D3D3D`.
- Ordered bilingual options are black.
- `localizedMultilineText` is a mixed English/Thai string rendered in one
  black `AppText`.

### Open-ended

- Separate rich Thai translations can get `#8C8D93`.
- Plain and A/B companion translations use `#3D3D3D`.
- Ordered bilingual content, for both examples and normal questions, is black.

### Fill blank

- Separate and A/B companion translations use `#3D3D3D`.
- Ordered bilingual stems are converted into measured row tokens and render
  black.
- Thai-only measured rows used to preserve inline blank placement also render
  black.
- Inputs must remain unchanged and must not inherit translation grey.

### Exercise-level text

Exercise prompts, prompt blocks, explanations, feedback, and error messages
must not be swept into the question-translation change merely because they
contain Thai.

## Recommended implementation

### 1. Generalize rich per-line Thai muting

`renderRichInlines` already supports the correct per-line behavior through
`lineIsThaiOverride` and the more narrowly named `muteThaiInAudioRow` path.
Add a semantic option such as `muteThaiTranslationLines` (or carefully reuse
and then rename the existing mechanism) that:

- operates only when rendering companion translation content;
- splits on line breaks;
- detects Thai on a line;
- applies `styles.richInlineThaiMuted` to that Thai translation line;
- leaves English lines black;
- preserves bold, italics, underline, links, highlights, and fonts.

Use it for the four current ordered-content render calls:

- multiple-choice ordered question
- multiple-choice ordered option
- open/sentence-transform ordered example
- open/sentence-transform ordered regular question

Use the same per-line rich renderer for `localizedMultilineText` instead of
setting the entire parent text to grey, because that value contains both
English and Thai.

### 2. Standardize separately rendered question translations

Question-context Thai styles should resolve to `#8C8D93`:

- `practiceQuestionThaiText`
- `practiceOptionThaiText`
- A/B Thai companion lines

Do not change `practicePromptBlockThaiText` or generic `AppText` muted styling,
because those are also used for instructions and non-translation UI.

### 3. Handle fill-blank measured rows explicitly

Fill-blank rendering cannot be fixed only at the parent `AppText` level. Its
text and blank controls are split into measured tokens.

Before building measured rows:

1. Split the source tokens into logical lines at `line_break` tokens.
2. If a line is a Thai companion translation, attach the translation color to
   its text tokens only.
3. Leave blank tokens and `TextInput` controls untouched.
4. Ensure both invisible measurement text and visible text use identical font
   metrics. Color does not affect measurements.

`getPracticeInlineTextStyle` can honor an explicit inline `color` so the
measured fill-blank text tokens can carry `#8C8D93`. Avoid applying that color
to an entire bilingual row or input container.

### 4. Preserve context, not merely script detection

Do not globally grey every Thai string. Script detection should happen only
after the renderer has established that it is inside a practice question,
example, or option translation context. Thai explanations and instructions
remain primary content.

## Two partial code edits already made

The interrupted implementation made exactly these two conceptual edits in
`app/lessons/[id].tsx`:

1. `getPracticeInlineTextStyle` now honors an explicit `inline.color`:

```ts
typeof inline?.color === 'string' && inline.color.trim()
  ? { color: inline.color.trim() }
  : null,
```

This prepares measured fill-blank text tokens to carry the translation color.
It does not change current output unless a practice inline already contains an
explicit color.

2. A constant was added beside `THAI_TEXT_RE`:

```ts
const THAI_TRANSLATION_TEXT_COLOR = '#8C8D93';
```

The constant is not used yet, so lint may currently report it as unused until
the implementation is completed. No other changes for this feature were made.

## Verification checklist

Test English and Thai display modes for each practice kind:

- multiple choice question and options, ordered and non-ordered
- open-ended example and regular question
- sentence-transform example and regular question
- fill blank with inline blank, trailing blank, multiple blanks, and wrapped
  text
- A/B layouts
- correct/incorrect layouts
- questions with underlining, links, highlights, audio, and images
- questions where English and Thai are stored together in `orderedContent`
- questions where Thai is stored separately in `text_jsonb_th` or plain text

Confirm that:

- English remains black.
- Thai companion translations are exactly `#8C8D93`.
- Instructions and explanations retain their current color.
- Inputs/placeholders retain their current colors.
- Blank widths and positions do not change.
- Underlines and other rich formatting remain visible.
- Text wrapping and measured fill-blank row layout do not change.

