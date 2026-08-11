# iOS lesson rich-text overflow investigation

## Status

Unresolved as of August 10, 2026.

A standalone diagnostic route now exists at `/text-wrap-repro`. It implements recommended experiments A and B together using a fixed-width native `Text`, `onLayout`, `onTextLayout`, and `PixelRatio.getFontScale()`.

The baseline system-font test wrapped correctly at `fontScale: 0.941`. Poppins with no explicit line height also wrapped correctly at `fontScale: 0.941`; native layout reported two lines with widths `341.259` and `110.359`. Adding `lineHeight: 23` continued to wrap correctly with the same line widths and expected taller line boxes. `AppText` with the same Poppins, size, and line-height styles also wrapped correctly.

The diagnostic route is currently testing production-like rich inline segmentation. This introduces an important style mismatch found in the renderer: the compact outer paragraph is `fontSize: 14, lineHeight: 23`, while `richInlineText` nested spans override that with `fontSize: 15, lineHeight: 25`. The test also includes the nested wrapper/segment structure and Poppins Italic used by the `beyond` span.

That complete text tree still wrapped correctly at `fontScale: 0.941`. The current test replaces the directly fixed 354-point text container with the production geometry: a 402-point band with 24-point padding on both sides, allowing Yoga to derive the expected 354-point text width.

The production geometry also wrapped correctly at `fontScale: 0.941`, with the target text measuring approximately `354 x 47.333`. The real Lesson 9.6 paragraph simultaneously reproduces the visual overflow with an inspected box of approximately `354 x 47`. The real paragraph is now instrumented with `onLayout` and `onTextLayout` logging under the `[lesson-text-wrap-repro]` prefix.

The real failing paragraph produced the following decisive mismatch at `fontScale: 0.941`:

```text
onTextLayout:
  lineCount: 1
  line text: entire sentence
  line width: 354
  line height: 23.525

onLayout:
  width: 354
  height: 47
```

Yoga therefore reserves approximately two lines of outer height, while native text layout reports the entire sentence as one line clamped to the exact available width and visibly paints its glyphs beyond that width. The known-good standalone control reports two real lines instead. The current isolated test disables the Reanimated `translateX` style on the Lesson 9.6 pager card on iOS, even though its resting value is zero.

Removing only the Reanimated transform style did not change the failure or measurements. The current test goes one level further and renders the Lesson 9.6 pager card with an ordinary React Native `View` instead of `Animated.View`, while preserving the gesture wrapper and card styles.

Replacing `Animated.View` with `View` also did not change the failure. The current test additionally disables the inner rich-pager pan gesture for Lesson 9.6 while leaving its `GestureDetector` ancestor mounted.

At one specific smaller iOS system text-size setting, some lesson text is laid out as though it fits on the current line but is visibly painted beyond the right edge of its correctly constrained `Text` box. The same content wraps correctly at the neighboring smaller and larger text-size settings.

The issue is reproducible in the iPhone 17 Pro simulator and has also occurred on a physical iPhone 17 Pro. It has appeared in both English and Thai lesson content, in multiple lessons, and in several visual structures.

All diagnostic source changes described below have been reverted. The lesson renderer currently contains none of the experimental workarounds.

## Environment

- Expo SDK: `~54.0.33`
- React Native: `0.81.5`
- React: `19.1.0`
- Platform: iOS
- Reproduced in an iPhone 17 Pro simulator
- Reported on a physical iPhone 17 Pro using the latest available app build and iOS version at the time of testing
- An iPhone 11 did not originally show the problem, but changing the simulator's system text size made the problem reproducible
- Primary renderer: `app/lessons/[id].tsx`
- Shared text component: `src/components/ui/AppText.tsx`

## Reliable reproduction

1. Open Lesson 9.6.
2. Navigate to the rich section containing the heading:

   > ‘Too’ shows a negative response to something

3. Find this paragraph:

   > It suggests that something is beyond a desirable or acceptable limit.

4. Set the simulator to the known problematic smaller iOS text-size step.
5. Reload or revisit the lesson if necessary.

At the failing size, the sentence remains on one line past the available width and is clipped around `desirable...`. At the neighboring text sizes it wraps correctly, for example:

```text
It suggests that something is beyond a desirable or
acceptable limit.
```

The problem has briefly disappeared after remounts or experimental edits and then returned, but it is reproducible at the problematic system text-size step.

## Other affected content

The overflow is not limited to one sentence or one component shape. Screenshots have shown it in:

- Plain paragraphs with no icon, accent bar, or indentation
- Audio example rows with a play button
- Accent/callout paragraphs with a colored vertical bar
- Indented examples
- Underlined rich-text spans
- Italic rich-text spans
- English content
- Thai content

This makes the content itself, a particular language, underlining, italics, an audio icon, or the accent bar unlikely to be the sole cause.

## Strongest inspector evidence

React Native's element inspector showed:

- Rich-section band width: `402`
- Horizontal padding: `24` on each side
- Selected `Text` width: `354`
- Expected available width: `402 - 24 - 24 = 354`

Therefore, the `Text` layout box is correctly constrained to the available content width. The glyphs visibly paint outside that selected box.

One inspection reported approximately:

```text
fontSize: 14
lineHeight: 23
Text layout: 354 x 47
```

The approximately 47-point height is consistent with space being reserved for two lines, while the visible text appeared to continue horizontally and clip. This suggests a disagreement between native measurement/line layout and visible glyph placement rather than a simple oversized flex child.

## Relevant production code

The normal paragraph renderer is structurally similar to:

```tsx
const paragraphText = (
  <AppText
    key={`${nodeKey}-text`}
    language={contentLang}
    variant="body"
    style={[
      styles.richParagraph,
      contentLang === 'th' ? styles.richThaiTextCompact : null,
      options?.compactBody ? styles.richBodyTextCompact : null,
      options?.isPhraseCard ? styles.phraseBodyText : null,
      isSubheader ? styles.richSubheader : null,
      isSubheader && options?.isPhraseCard ? styles.phraseSubheader : null,
    ]}>
    {renderRichInlines(node.inlines, nodeKey, options)}
  </AppText>
);
```

Relevant text styles include:

```tsx
richParagraph: {
  fontSize: 15,
  lineHeight: 25,
},
richBodyTextCompact: {
  fontSize: 14,
  lineHeight: 23,
},
```

`AppText` ultimately renders a native React Native `Text` and allows font scaling by default:

```tsx
return (
  <Text
    {...rest}
    style={[
      styles.base,
      { fontFamily: resolvedFontFamily },
      variantStyles[variant],
      sanitizedStyle,
    ]}>
    {renderChildren(children, 'app-text')}
  </Text>
);
```

`AppText` also splits string children by script and renders nested native `Text` spans so English and Thai can use their appropriate font families.

## Experiments performed

### 1. Flatten the rich inline tree

The exact failing sentence was temporarily rendered as a flat string instead of using `renderRichInlines`.

Conceptually:

```tsx
<AppText language="en" variant="body">
  It suggests that something is beyond a desirable or acceptable limit.
</AppText>
```

Result: **failed**. The italic styling disappeared, confirming that the experimental path was active, but the text still overflowed.

Conclusion: rich inline annotations and the particular nested span tree are not sufficient to explain the bug.

### 2. Explicitly constrain the outer text width

The failing text was given combinations of explicit constraints such as:

```tsx
{
  width: '100%',
  maxWidth: '100%',
  alignSelf: 'stretch',
  flexShrink: 1,
  minWidth: 0,
}
```

Result: **failed**.

Conclusion: the common flex-child intrinsic-width failure is unlikely, especially because the inspector already showed the correct 354-point text box.

### 3. Stretch the lesson content shell

The lesson content shell was temporarily changed from an explicit full width to stretching within its parent:

```tsx
// Before
{ width: '100%' }

// Test
{ alignSelf: 'stretch' }
```

Result: **failed**.

Conclusion: the page shell's width declaration was not the cause.

### 4. Use a truly flat native `Text`

The exact sentence was rendered as a literal child of React Native's native `Text`, bypassing both `AppText` and the rich inline renderer.

```tsx
<Text style={{ fontFamily: 'Poppins', fontSize: 14, lineHeight: 23 }}>
  It suggests that something is beyond a desirable or acceptable limit.
</Text>
```

Result: **failed**.

Conclusion: `AppText`'s script splitting and nested spans are not required for the failure.

### 5. Use the iOS system font

The same flat native `Text` experiment was repeated without Poppins:

```tsx
<Text style={{ fontSize: 14, lineHeight: 23 }}>
  It suggests that something is beyond a desirable or acceptable limit.
</Text>
```

Result: **failed**.

Conclusion: Poppins is not required for the failure.

### 6. Disable Dynamic Type scaling

The exact sentence was rendered with font scaling disabled:

```tsx
<AppText allowFontScaling={false}>
  It suggests that something is beyond a desirable or acceptable limit.
</AppText>
```

Result: **worked**.

The same property was then temporarily applied more broadly in the rich renderer and prevented the observed overflow.

Conclusion: the failure is coupled to iOS font scaling. This is useful diagnostic evidence, but it is not an acceptable production fix because it prevents users from choosing their preferred accessibility text size.

All `allowFontScaling={false}` changes were removed.

### 7. Use `lineBreakStrategyIOS="standard"`

The exact Lesson 9.6 sentence was temporarily given:

```tsx
<AppText lineBreakStrategyIOS="standard">
  It suggests that something is beyond a desirable or acceptable limit.
</AppText>
```

Result: **failed**.

Conclusion: switching from React Native's default iOS line-break strategy to the standard strategy did not resolve the failure.

### 8. Remove the explicit line height

The exact sentence was given a final style override intended to remove its explicit `lineHeight`:

```tsx
{
  lineHeight: undefined,
}
```

Result: **failed**; there was no visible change.

Caveat: because `AppText` and its `body` variant also contribute styles, a stronger future version of this experiment would use a direct native `Text` with no `lineHeight` property anywhere in its style chain. The attempted override produced no evidence that explicit line height is the cause.

### 9. Reduce the wrapping boundary by one physical pixel

The exact sentence was given a one-physical-pixel right inset:

```tsx
{
  paddingRight: StyleSheet.hairlineWidth,
}
```

Result: **failed**.

Conclusion: a one-physical-pixel content inset did not move the text away from the failing line-break decision.

## Approaches considered but not used as fixes

### `numberOfLines`

`numberOfLines` limits or truncates content. The lesson paragraphs must remain fully readable, so truncation is not appropriate.

### `adjustsFontSizeToFit`

`adjustsFontSizeToFit` is primarily useful when text must fit a constrained number of lines and is allowed to shrink. It could cause different paragraphs to render at inconsistent sizes and would work against the requirement to respect the user's Dynamic Type preference. It has not been used as a production workaround.

### Globally disabling font scaling or imposing a minimum scale

This prevents the observed failure but is an accessibility regression and was rejected.

## GitHub issue #1438

[facebook/react-native#1438](https://github.com/facebook/react-native/issues/1438), “Text doesn't wrap,” is a real and frequently cited React Native issue. Its common workarounds include:

```tsx
<View style={{ flexDirection: 'row' }}>
  <Text style={{ flex: 1, flexWrap: 'wrap' }}>
    Long text
  </Text>
</View>
```

```tsx
<Text style={{ flexShrink: 1 }}>Long text</Text>
```

Another historical workaround is:

```tsx
<Text style={{ width: 0, flexGrow: 1 }}>Long text</Text>
```

That issue appears to concern a flex child whose layout width is allowed to exceed its available space, commonly inside a row. It does not cleanly match this investigation because:

- The failure also occurs in a plain paragraph without row siblings.
- Explicit shrink and width constraints did not fix it.
- The inspector shows that the failing `Text` box already has exactly the correct width.
- The glyphs visibly paint beyond that correctly constrained box.
- The behavior is isolated to one iOS system text-size step.

The #1438 workarounds should therefore not be applied globally without new evidence.

## Incorrect upstream lead that was rejected

An earlier theory incorrectly connected this problem to an upstream React Native fix involving font scales below `1.0` and suggested upgrading or backporting it.

The identified upstream change was Android-specific. It concerned Android display metrics and `PixelUtil.toPixelFromSP`, was introduced in a later React Native version, and does not explain an iOS failure on React Native 0.81.5. That upgrade/backport recommendation was retracted.

There is currently no verified React Native issue or changelog entry proving that upgrading React Native fixes this exact iOS behavior.

## Current assessment

The evidence currently points most strongly to an iOS/RN native text measurement or drawing disagreement at one Dynamic Type scale category:

1. Yoga/React Native gives the native text view the correct width.
2. The native text measurement appears to reserve a wrapped height.
3. The visible glyph run does not break at the same boundary and paints outside the box.
4. The mismatch occurs at one font-scale step and disappears at adjacent steps.
5. Disabling font scaling removes the failure.

This assessment is still a theory, not a verified upstream diagnosis.

## Recommended next experiments

### A. Minimal screen outside the lesson hierarchy

Create a temporary route containing only a fixed-width native text example:

```tsx
import { Text, View } from 'react-native';

export default function TextWrapRepro() {
  return (
    <View style={{ paddingTop: 100, paddingHorizontal: 24 }}>
      <View style={{ width: 354, backgroundColor: '#F5F9FD' }}>
        <Text style={{ fontSize: 14 }}>
          It suggests that something is beyond a desirable or acceptable limit.
        </Text>
      </View>
    </View>
  );
}
```

Test it at the failing and neighboring system text sizes. Then add variables back one at a time:

1. `lineHeight: 23`
2. Poppins
3. `AppText`
4. Nested rich spans
5. The lesson page/carousel hierarchy

This is the cleanest way to determine whether the bug exists in bare React Native/iOS text or requires something in the lesson screen.

### B. Capture `onTextLayout`

Log the native line measurements at all three adjacent text-size settings:

```tsx
<Text
  onTextLayout={(event) => {
    console.log(
      event.nativeEvent.lines.map((line) => ({
        text: line.text,
        width: line.width,
        height: line.height,
        x: line.x,
        y: line.y,
      })),
    );
  }}>
  It suggests that something is beyond a desirable or acceptable limit.
</Text>
```

This can reveal whether native layout reports one line or two, which text it assigns to each line, and whether a reported line width exceeds the 354-point constraint.

### C. Test a larger boundary adjustment

The one-physical-pixel inset did not change the result. For diagnosis only, test a visibly larger reduction such as 4, 8, and 16 points. If even 16 points does not alter the overflowing glyph run, the problem is unlikely to be a simple boundary-rounding threshold.

```tsx
<Text style={{ paddingRight: 16 }}>
  It suggests that something is beyond a desirable or acceptable limit.
</Text>
```

### D. Verify font-scale and remount behavior

Log `PixelRatio.getFontScale()` and force the minimal repro component to remount when the scale changes:

```tsx
const fontScale = PixelRatio.getFontScale();

return <Text key={fontScale}>...</Text>;
```

This would test whether a stale measurement cache contributes to the failure. A reload that still reproduces the problem would weigh against cache invalidation as the complete explanation.

### E. Produce an upstream-quality reproduction

If the minimal screen reproduces the issue with a direct native `Text` and system font, capture:

- Exact iOS version
- Exact simulator/device model
- Exact React Native version
- `PixelRatio.getFontScale()` for failing and neighboring settings
- `onTextLayout` output
- A minimal repository or Snack, if the native iOS setting can be represented
- Screen recording showing the transition between good, bad, and good text-size steps

That would be sufficient to search again for an exact upstream match or file a focused React Native issue without the lesson renderer's complexity.
