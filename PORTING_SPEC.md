# Pailin Abroad Mobile Porting Spec

## Workspace Repos
- `pailin-abroad` (web app): reference only, **read-only**.
- `pailin-abroad-app` (Expo RN app): implementation target, **write here only**.

## Non-Negotiable Rules
- Never modify `pailin-abroad`.
- Use React Native primitives, not React DOM.
- No CSS reuse from web; convert to RN styles and theme tokens.
- For homepage: only one `ScrollView`, owned by `app/(tabs)/index.tsx`.
- No inline style objects in JSX for new/ported code:
  - Allowed: `style={styles.foo}` or `style={[styles.foo, styles.bar]}`
  - Not allowed: `style={{ ... }}`

## Current Mobile State (Implemented)

### Local iPhone Build Status
- Local native iPhone install has been successfully verified on a physical device.
- Current working path is:
  - Expo-managed app config
  - native `ios/` project checked into the app repo
  - CocoaPods workspace build via Xcode
- Bundle identifier is now set to `com.grant.pailinabroad`.
- For ongoing day-to-day development, continue working in the Expo/RN app as normal.
- When native/device verification is needed:
  - open `ios/pailinabroadmobile.xcworkspace` in Xcode
  - use Xcode signing/device selection for physical iPhone installs
  - `npx expo run:ios --device` is expected to work after signing is configured in Xcode
- This means the project is past the initial "can we get it onto a real phone?" stage and can proceed with normal feature work.

### Current Focus
- Login/auth screen polish pass is now done for the current round.
- Recent auth work focused on:
  - full-screen signed-out presentation without the bottom tab bar
  - updated mobile auth layout / branding treatment
  - sign up / log in mode switching cleanup
  - improved spacing / sizing behavior for smaller phones
  - refined visual polish on shadows, headline treatment, and password-rule presentation
- Immediate next work is the native `My Pathway` page.
- Priority is improving the `My Pathway` screen experience before moving on to later UI cleanup passes.

### Step A: Theme
- Added: `src/theme/theme.ts`
- Tokens include:
  - colors: `background/surface/text/mutedText/primary/border`
  - spacing: `xs/sm/md/lg/xl`
  - radii: `sm/md/lg/xl`
  - typography: fonts (`Poppins` / `Anuphan`), sizes, weights, lineHeights

### Step B: UI Primitives
- Added:
  - `src/components/ui/AppText.tsx`
  - `src/components/ui/Button.tsx`
  - `src/components/ui/Card.tsx`
  - `src/components/ui/Stack.tsx`
- `Stack` gap is token-key-only (`xs|sm|md|lg|xl`).

### Step C: Home Page (UI parity pass with mock data)
- Added:
  - `src/types/home.ts`
  - `src/mocks/home.ts`
  - `src/components/home/*` sections
  - `app/(tabs)/index.tsx` new homepage composition
- Home sections implemented in this order:
  - Hero
  - Free lessons
  - Sign-up CTA
  - Choose us
  - How it works
  - Sign-up CTA (repeat)
  - Characters
  - Take the leap CTA
  - FAQ
- Homepage parity notes:
  - Home now uses bundled local image assets instead of placeholder art for:
    - hero image
    - free lesson cards
    - choose-us blue checkmarks
    - how-it-works number images
    - characters hero/thumbnail images
  - `SignUpCTASection` no longer uses the card/bubble shell; it is now plain text + button, with `all` kept inline and red
  - Free lessons carousel tuned further:
    - cards are slightly narrower
    - lesson image sizing/spacing adjusted
    - expert `COMING SOON!` badge is overlaid so card layout matches the other cards
    - left/right carousel gutter behavior adjusted to be more symmetric

### Language + Sidebar (Mobile)
- Added global UI language context:
  - `src/context/ui-language-context.tsx`
- Provider wired in:
  - `app/_layout.tsx`
- Sidebar/hamburger + TH/EN toggle + menu routes implemented in:
  - `app/(tabs)/_layout.tsx`
- Home page reads `uiLanguage` from context.

## Lessons Work

### Added
- Env scaffold:
  - `.env.example`
  - `src/config/env.ts`
- Supabase REST client/data layer:
  - `src/lib/supabase-rest.ts`
  - `src/api/lessons.ts`
  - `src/types/lesson.ts`
- Lessons routes:
  - `app/lessons/index.tsx`
  - `app/lessons/[id].tsx`

### Current State
- Use live lesson list data on the lessons index page.
- Real app auth/session is now wired through Supabase:
  - signed-in state comes from the current auth session
  - membership entitlement comes from backend profile data (`users.is_paid`)
- In the app, free-plan users now go straight to a native free lesson library instead of a no-account locked state.
- Free lesson library behavior now mirrors the web `FreeLessonsIndex` model:
  - first lesson of each level is available on the free plan
  - `Expert` remains coming soon
  - lesson detail now routes into the native lesson page

## Env Notes
- Real `.env` should live at project root:
  - `pailin-abroad-app/.env`
- Only expose client-safe keys as `EXPO_PUBLIC_*`.
- Supabase keys are required for lessons index data fetching.

## Rich Renderer Risk (Lesson Detail Port)
- `RichSectionRenderer` is the highest-risk port area and should be isolated as its own task.
- Keep backend resolver/data shape as source of truth:
  - web backend `resolver.py` + `merge_jsonb.py`
- Rebuild renderer natively in RN; do not attempt direct web renderer reuse.

## Lesson Detail Status (`app/lessons/[id].tsx`)

### Summary
- Lesson detail is now MVP-complete for the current mobile scope.
- The page is no longer in placeholder-only territory; the basics of the guided lesson flow are in place and usable.
- Remaining work is mostly parity cleanup, edge-case handling, and polish rather than foundational implementation.

### Lesson Shell / Navigation
- Mobile lesson UX now uses the intended guided stepper/session model rather than a close web clone.
- Lesson entry uses a dedicated full-screen intro / cover page before study mode begins.
- Intro cover uses real lesson metadata:
  - title
  - Thai title
  - focus
  - backstory
  - `header_img`-driven lesson artwork
- Visible back-to-library control is present on the cover.
- Cover backstory is secondary/expandable instead of always fully expanded.
- Cover no longer shows the temporary `Sections in this lesson` list.
- Lesson detail fetches the real resolved lesson payload used by the web app.
- Resolved payload fetch is auth-aware and cached in native app code.
- Lesson detail navigation/menu is no longer driven by raw `sections` alone.
- Mobile now mirrors the web `ls-sidebar` model more closely:
  - uses a derived ordered lesson-tab list instead of dumping raw section rows
  - includes `Prepare`, `Comprehension`, `Transcript`, `Practice`, and `Phrases & Verbs` when their payload data exists
  - still excludes non-sidebar items like `pinned_comment`
- Free-plan lesson browsing now has its own native direction:
  - free users land on a lessons hub inside the tab flow
  - the hub offers a full `Lesson Library` view and a separate `Free Lesson Library` view
  - the full free-plan lesson library now mirrors the normal native lesson library structure:
    - same stage selector
    - same level buttons
    - same row/card treatment
    - plus free-plan messaging and lock/check status icons
  - free users can tap locked lessons and view the lesson cover, but the cover CTA becomes a membership unlock prompt instead of entering study mode
  - lesson-library entry/back flow now routes through the tab lessons screen so the bottom nav remains available

### Study Mode / Chrome
- Study-mode content language is a distinct lesson-content control, not the same as global app UI language.
- The lesson content-language toggle now lives in the fixed study chrome as a compact `TH/EN` pill rather than inside each section body.
- Toggling content language refetches/uses the other-language resolved payload like the web lesson flow.
- Section headers, section menu labels, and next-section CTA in study mode follow lesson `contentLang`.
- The opposite lesson-content language is prefetched in the background for faster toggles.
- Translation toggles now keep the current lesson visible and show an inline `Translating...` state instead of dropping back to the full page loader.
- Visible section titles now come from the web-aligned section-type label model rather than from `content_jsonb`.
- Study mode scrolls properly.
- Study mode shell now matches the current intended direction:
  - top chrome is fixed and separate from the content scroll zone
  - the thin red progress bar sits directly below the lesson nav
  - the content area no longer uses a large enclosing card wrapper
  - the footer is sticky and owns both the audio bar and the CTA row
  - fullscreen mode hides the top chrome and audio bar while keeping content + CTA visible
  - safe-area spacing keeps lesson chrome/footer away from the notch and bottom edge

### Audio
- Shared lesson audio tray has been restyled toward the target lesson mock:
  - expanded on entry with a visual drag handle
  - supports expanded and collapsed states
  - collapsed state shows the compact live-dot / title / volume / play layout
  - control sizing and typography are tuned closer to the current design target
- Audio tray now auto-collapses on the native `Prepare` section and auto-expands when the user advances out of `Prepare` via `Next section`.
- Inline snippet audio support is wired for rich lesson content and phrases where snippet data exists.

### Completed Section Ports
- `Prepare`
  - now exists as a first-class native lesson section before `Comprehension` when lesson payload data includes it
  - uses a mobile-native card that intentionally echoes the web `PrepareCard` styling and audio-row behavior
  - keeps inline snippet audio preview available for prepare items where snippet data exists
- `Comprehension`
  - supports normalized resolved-payload questions
  - supports EN/TH content-language switching independent of global UI language
  - supports answer selection, check flow, correctness states, and preserved checked state through language toggles
  - runs inside the fixed-shell lesson layout with sticky footer / CTA behavior
- `Transcript`
  - mirrors web behavior where English is always shown and Thai lines are additionally shown in Thai mode
  - uses the shared study-chrome content-language toggle
- `Apply`
  - uses dedicated section handling instead of the generic placeholder path
  - supports structured dict-shaped `content_jsonb` / `content_jsonb_th` with `prompt`, `response`, `prompt_nodes`, and `response_nodes`
  - uses parsed rich-node data to render accent/callout paragraphs
  - supports local input + reveal-example-answer flow matching current web functionality
- `Understand`
  - uses rich resolved-payload nodes instead of the placeholder path
  - preserves the guided card/pager lesson UX already established for study mode
  - supports understand-specific highlight treatment from the web rich renderer
  - supports inline snippet audio bullets wired from lesson audio snippet data
  - supports inline quick-practice injection for supported exercise kinds
- `Culture Note`
  - uses the native rich-section renderer instead of the placeholder path
  - supports headings, paragraphs, lists, images, tables, links, and inline snippet audio bullets when present
  - intentionally reuses the shared rich-node/audio-bullet path without the understand-only highlight treatment
- `Common Mistake`
  - uses the same guided card/pager shell as `Understand`
  - groups the resolved rich nodes into in-section cards with next/previous navigation
  - preserves web-style inline marker coloring for `[X]`, `[✓]`, and `[-]`
  - reuses the native rich-node renderer for headings, paragraphs, lists, images, tables, links, and snippet audio
- `Practice`
  - no longer uses the generic placeholder path
  - now has dedicated native practice handling for:
    - `multiple_choice`
    - `open` / open-ended practice
    - `fill_blank`
    - `sentence_transform`
  - practice follows the same guided inner card/pager format as `Understand`, with one exercise per card in the main `Practice` tab
  - multiple choice supports native selection, local check flow, correctness reveal, and reset
  - open-ended practice supports native text input plus backend `/api/evaluate_answer` checks through app-side auth-aware API wiring
  - fill-blank practice supports native blank inputs and backend evaluation
  - sentence-transform practice supports native rewrite input / correctness toggle plus backend evaluation
  - prompt images are carried through item normalization and rendered natively when present
  - example items use dedicated preview layouts
  - practice state is preserved within the current lesson session and stays aligned with the lesson `contentLang` payload model where applicable
  - quick-practice rendering is now wired for the currently supported practice exercise kinds
- `Phrases & Verbs`
  - uses dedicated native phrase-card handling driven by resolved `lesson.phrases`
  - phrase-specific audio snippet lookup is wired through native app code using `lesson_phrases` + `phrases_audio_snippets`
  - mobile presents one phrase card at a time inside the existing guided section pager
  - phrase body styling is tuned toward current web behavior:
    - no bordered card around audio bullets
    - light divider between the lead definition bullet and following example bullets
    - continuation lines in mini-conversation examples stay visually indented under the active audio bullet
  - duplicate in-body phrase headings are suppressed when they repeat the already-visible section title

### Known Gaps / Follow-Up Work
- Table parity across rich sections is still incomplete and needs a dedicated mobile-only cleanup/signoff pass.
- `Extra Tip` still needs a proper dedicated/native path if later lessons require it.
- Quick-practice parity should be treated as good enough for current supported lesson types, not guaranteed-final for every future backend payload shape.
- Mark-complete behavior / write-back strategy is still not implemented.
- Additional backend-provided exercise kinds may still require future native support if new lesson content introduces them.

### Current Recommendation
- Treat the lesson page as complete enough for the current MVP/basic mobile scope.
- Expect bug-fixing and edge-case cleanup rather than major architecture work.
- Use future work passes to handle:
  - table cleanup
  - `Extra Tip`
  - mark-complete/write-back
  - newly encountered payload variants
- Added native free-plan lessons flow:
  - `src/screens/GuestLessonLibraryScreen.tsx`
  - `app/lessons/library.tsx`
  - `app/(tabs)/lessons.tsx` now routes free-plan users into the free lesson library and paid users into the full library
  - Free lesson library now keeps its original page structure, but lesson rows visually align with the main lesson library list while keeping right-side checkmarks
- App session/auth state now separates account presence from membership entitlement:
  - `src/context/app-session-context.tsx`
  - current session drives signed-in vs signed-out behavior
  - backend profile data drives free-plan vs paid-member behavior
- Added native Contact page work:
  - `src/api/contact.ts`
  - `src/screens/ContactScreen.tsx`
  - `app/account/contact.tsx`
  - `src/screens/AccountScreen.tsx` now routes Contact from Account
- Added native About page work:
  - `src/screens/AboutScreen.tsx`
  - `app/account/about.tsx`
  - `src/screens/AccountScreen.tsx` now routes About from Account
  - About now uses bundled local images for:
    - Pailin image in the method section
    - Carissa team image
    - Grant team image
- Added native Profile shell work tied to real session/profile state:
  - `src/screens/ProfileScreen.tsx`
  - `app/account/profile.tsx`
  - `src/screens/AccountScreen.tsx` now routes Profile from Account in both free-plan and paid states
  - dev-only Profile controls can open onboarding and reset/complete local onboarding state for testing
- Added native Membership frontend shell with live pricing fetch:
  - `src/api/pricing.ts`
  - `src/screens/MembershipScreen.tsx`
  - `app/account/membership.tsx`
  - `src/screens/AccountScreen.tsx` and `src/screens/ProfileScreen.tsx` now route Membership into the shell
- Membership intentionally mirrors the web page structure closely, but `JOIN NOW!` remains frontend-only and does not start checkout yet.
- Membership styling notes:
  - App background should stay aligned with web `--app-bg` (`#F7FAFD`)
  - Membership pricing uses cached pricing data after first load in the current app session
  - Membership now uses bundled local images for:
    - launch pricing banner
    - loading/error state illustration
  - Pricing cards now match the web treatment more closely:
    - unselected border/shadow use `#9D9D9D`
    - selected state uses blue border/shadow `#3CA0FE` with `#F8FCFF` background
    - 1-month card now shows the red crossed-out comparison price and adjusted vertical alignment
- `EXPO_PUBLIC_API_BASE_URL` is now expected for backend-backed app routes like Contact.
- Added native Resources page parity pass:
  - `src/screens/ResourcesScreen.tsx`
  - `app/(tabs)/resources.tsx`
  - Uses full 5-card web structure
  - Uses bundled local image assets for all resource cards
  - Uses shared `StandardPageHeader` styling so the page header matches the lesson library header treatment
  - `Topic Library` now routes to native list/detail screens
  - `Exercise Bank` now routes to native list/detail screens
  - Disabled cards keep top-right red `Coming soon` treatment as a floating overlay that does not affect card layout
- Added native `Topic Library` work:
  - `src/api/topic-library.ts`
  - `src/types/topic-library.ts`
  - `src/screens/TopicLibraryScreen.tsx`
  - `src/screens/TopicDetailScreen.tsx`
  - `src/components/topic/TopicRichContent.tsx`
  - `app/resources/topic-library.tsx`
  - `app/resources/topic-library/[slug].tsx`
  - `src/screens/ResourcesScreen.tsx` now routes the Topic Library card into the native flow
- Topic Library implementation notes:
  - list/index now mirrors the web page direction with:
    - featured/all filter
    - real working search
    - subtitle/tag rows
    - free-plan lock treatment with membership CTA
  - topic detail intentionally does not keep the older mobile card-stack direction
  - topic detail now follows the web frontend more closely:
    - full-width hero/content treatment instead of a large enclosing bubble
    - top row with back-to-library + content-language toggle
    - divider-line accordion sections instead of card shells
    - open sections use zebra-group body treatment similar to the web renderer
    - `[✓]` / `[X]` inline markers now follow web-style blue/red coloring
  - topic detail links to lesson/topic sentinel URLs are now routed natively where possible
- Added native `Exercise Bank` work:
  - `src/api/exercise-bank.ts`
  - `src/types/exercise-bank.ts`
  - `src/screens/ExerciseBankScreen.tsx`
  - `src/screens/ExerciseBankSectionScreen.tsx`
  - `src/components/exercise-bank/ExerciseBankPager.tsx`
  - `app/resources/exercise-bank/index.tsx`
  - `app/resources/exercise-bank/[categorySlug]/[sectionSlug].tsx`
  - `src/screens/ResourcesScreen.tsx` now routes the Exercise Bank card into the native flow
- Exercise Bank implementation notes:
  - index/list now mirrors the web page direction with:
    - featured/categories filter
    - real working search
    - free-plan and no-account notice treatment with membership CTA
    - category chips for the categories view
  - index toolbar styling is now aligned with the native Topic Library controls
  - section detail intentionally follows the established mobile lesson-style exercise flow rather than the web accordion list:
    - full-page exercise session
    - top row with back-to-bank + content-language toggle
    - section title with category chip
    - sticky bottom `Next exercise` / exit CTA
    - horizontal swipe between exercises
  - exercise body styling has been flattened toward the lesson direction:
    - no large enclosing card around the whole exercise body
    - normal items do not sit inside per-question cards
    - example items keep a dedicated preview card
  - current supported bank exercise kinds:
    - `multiple_choice`
    - `open`
    - `fill_blank`
    - `sentence_transform`
  - answer evaluation is wired through the existing backend `/api/evaluate_answer` flow using native `sourceType: 'bank'`
  - fill-blank rows now use a native `onTextLayout` measurement pass so bracketed hint tokens and blank placeholders wrap more naturally
- Asset workflow notes:
  - Bundled app images live under `assets/images/*`
  - Added:
    - `src/assets/app-images.ts`
    - `src/assets/resource-images.ts`
    - `assets/images/README.md`
    - `images.d.ts`
  - For app-owned design assets, keep them committed to the repo rather than gitignored
- Current known TS issues that predate or sit outside this image/home pass:
  - `src/components/ui/Stack.tsx`
  - `src/screens/MembershipScreen.tsx` (`planCopy.savings` typing issue)
- Current V1 TODO:
  - Keep lesson discussion web-only for v1:
    - native app intentionally does not include the lesson discussion board, pinned comment, reply flow, or comment-history surfaces
    - mobile web may continue to expose lesson discussion without blocking native app signoff
    - do not treat missing native discussion parity as a v1 blocker unless product direction changes
  - Add lesson completion / mark-complete write-back:
    - lesson detail is usable for study, but native write-back is still missing
    - pathway/progress UX should not be treated as complete until this is wired
- Explicit non-goal for mobile v1:
  - no-account `Try Lessons` browsing is not required if the app always pushes users into auth/account creation on entry
- Next recommended phase before detailed testing/debugging:
  - finish the remaining functional gaps that still block broader signoff:
    - lesson completion / mark-complete write-back
  - then move into focused parity testing/debugging for:
    - lesson detail edge cases (`Extra Tip`, table cleanup, newly encountered payload variants, locked-cover copy/states)
    - Topic Library content/layout edge cases
    - Exercise Bank exercise-type and bilingual wrapping edge cases
    - free-plan lessons hub / library navigation and lock-icon polish
- Keep design flexible since cofounder may change direction.

## Onboarding (Current Native Direction)
- Native onboarding is now implemented in-app and should be treated as part of the current mobile flow, not a placeholder.
- Added:
  - `src/context/onboarding-context.tsx`
  - `app/onboarding/index.tsx`
  - `src/screens/OnboardingScreen.tsx`
  - `src/api/onboarding.ts`
- Current onboarding implementation notes:
  - onboarding state is kept separate from auth/session local state for testing convenience
  - dev-only Profile controls can reopen onboarding and reset/complete local onboarding state
  - signed-in users with incomplete onboarding are now routed into onboarding automatically
  - signed-out users still see the normal auth screen first
  - OAuth/Google users skip the password step and use the shortened onboarding flow
  - onboarding step content is now native/mobile-specific and no longer depends on the old web onboarding route model
  - current steps cover:
    - welcome
    - password setup for email users
    - name + avatar selection
    - free vs full account comparison with upgrade CTA
    - completion / confirmation
  - `Continue with free account` advances to completion
  - `Unlock Full Access` currently routes into the native membership screen as the temporary payment-flow handoff
  - onboarding completion writes `onboarding_completed` without granting paid access
  - profile setup writes nickname/avatar updates through native app-side onboarding API plumbing
  - Google/default account data may exist before onboarding, but onboarding profile selection is intended to overwrite it
  - layout has had a compact/small-screen responsiveness pass and the Google dot-count/password-step skip behavior is now correct
- Current onboarding caveats:
  - payment/checkout is still not implemented from the upgrade CTA
  - broader end-to-end QA across more auth/account edge cases is still recommended during the next testing pass

## My Pathway (Current Native Direction)
- Added web-aligned theme tokens in `src/theme/theme.ts` for:
  - accent blue `#3CA0FE`
  - accent surface / muted blue backgrounds
  - success / warning surface helpers
  - explicit shadow color token
- Added native `My Pathway` shell work:
  - `src/screens/MyPathwayScreen.tsx`
  - `src/screens/CompletedLessonsScreen.tsx`
  - `app/pathway/completed.tsx`
- Signed-in primary tab now routes to native `My Pathway` instead of the older placeholder:
  - `src/screens/PrimaryScreen.tsx`
- Current `My Pathway` implementation notes:
  - keeps the guest/no-account homepage flow unchanged
  - uses live auth session + backend profile data for account and membership state
  - uses backend-backed pathway lessons, completed lessons, and user stats
  - free-plan lock treatment still mirrors the web frontend rule:
    - only the first lesson of each level is available without membership
  - keeps visual styling aligned with the web palette:
    - app background `#F7FAFD`
    - black borders/text
    - red primary CTA
    - blue highlight/progress surfaces
  - avoids the web mobile dropdown/tab pattern and instead uses one vertical native flow:
    - header + plan/state
    - continue learning
    - free-plan notice
    - pathway list
    - recent completed history
- Current Pathway limitations:
  - lesson completion writes are not yet wired in native because lesson detail is still a shell
  - `Continue learning` depends on the current backend pathway endpoint behavior
  - `liked lessons` remain intentionally excluded from the app MVP for now
  - comment history is not in the native app and is intentionally out of scope while lesson discussion remains web-only for v1
  - final structure/spacing/content order should still be treated as provisional until cofounder review

## Source of Truth for Future Chats
- This file should be used as the first context document in new chats.
- If implementation direction changes, update this file before switching chats.
