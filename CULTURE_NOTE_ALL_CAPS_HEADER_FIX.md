# Culture note body text incorrectly rendered as a subheader

## Symptoms

In the Thai version of lesson 6.3, the paragraph beginning
`มีแอปหาคู่อื่นๆอีกมากมาย...` rendered in the large, bold lead-subheader style.
It is ordinary body copy.

The same issue appeared in lesson 6.4 in the Thai Fahrenheit-conversion
paragraph beginning `วิธีที่เราสามารถแปลงตัวเลข...`. The temperature notation
`°F` supplied the paragraph's only Latin letter, which is uppercase, so that
body paragraph was also mistaken for the inferred lead subheader.

## Cause

The mobile lesson renderer infers the first culture-note subheader by looking
for a paragraph whose Latin letters are all uppercase. Thai characters do not
participate in that check, so the uppercase initialism `LGBTQ+` made the entire
Thai paragraph look like an ALL-CAPS English heading.

This kind of false positive is handled by
`CULTURE_NOTE_LEAD_HEADING_EXCEPTIONS` in `app/lessons/[id].tsx`. Lesson 6.3
already had an exception, but its reference text contained `L.G.B.T.Q+`, while
the live lesson content contains `LGBTQ+`. The exception-key normalizer removed
whitespace but preserved periods, so the two versions produced different keys
and the exception never matched.

## Fix

`normalizeCultureNoteLeadHeadingExceptionText` now removes periods as well as
whitespace before building an exception key. Dotted and undotted forms of an
initialism therefore compare equally, and the existing 6.3 exception correctly
keeps this paragraph in body styling.

The full Thai Fahrenheit-conversion paragraph was added as a lesson 6.4
exception. This keeps `°F` from promoting that body paragraph while preserving
the intended headings around it.

Lesson 7.12 has the same safeguard for the West Hollywood paragraph containing
`L.G.B.T.Q.+`. Its single exception covers both the current dotted spelling and
the planned undotted `LGBTQ+` source spelling because periods and whitespace are
ignored when exception keys are compared.

Lesson 9.2 also safeguards the Thai introductory paragraph beginning
`คำว่า LGBTQ+ จึงเป็นคำรวม...`, which contains the uppercase initialism twice
but is body copy rather than a subheader.

Lesson 12.5 safeguards the Thai Situationship explanation beginning
`นี่เป็นความสัมพันธ์ที่เหนือกว่าระดับ FWB...`. The uppercase initialism `FWB`
is embedded in ordinary body copy and must not promote the paragraph to the
lead-subheader style.

The change is intentionally narrow: lesson number, language, and the rest of
the normalized paragraph must still match the explicit exception.

## If this happens again

1. Confirm that the affected node is body copy and that uppercase Latin text
   inside Thai content triggered `isCultureNoteLeadHeading`.
2. Add the full paragraph to `CULTURE_NOTE_LEAD_HEADING_EXCEPTIONS`, using its
   lesson number and language. Do not weaken the global ALL-CAPS heuristic for
   every culture note.
3. Check for harmless source-format differences such as whitespace or dotted
   initialisms. If a new normalization is needed, keep it narrow and explain it
   beside `normalizeCultureNoteLeadHeadingExceptionText`.
4. Verify both Thai and English culture notes, especially the real lead heading
   and the paragraph immediately after it.
