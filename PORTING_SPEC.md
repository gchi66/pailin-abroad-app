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

## Lessons Work (In Progress)

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

### Current Decision
- Prioritize wiring Supabase/env into `app/lessons/index.tsx` now.
- Use live lesson list data on the lessons index page.
- Pause deep lesson detail implementation in `app/lessons/[id].tsx` for later.
- App preview state now follows web entitlement more closely:
  - `free plan` = signed-in user without membership
  - `paid` = signed-in user with membership
- In the app, free-plan users now go straight to a native free lesson library instead of a no-account locked state.
- Free lesson library behavior now mirrors the web `FreeLessonsIndex` model:
  - first lesson of each level is available on the free plan
  - `Expert` remains coming soon
  - lesson detail taps are still placeholder-only until `app/lessons/[id].tsx` is ported

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
- Defer sticky audio/player behavior (`expo-av`) to a later phase if needed.

## Next Priority (Per Latest Decision)
- Lessons index live data is already wired through `LessonsLibraryScreen`.
- `app/lessons/[id].tsx` remains a shell; resolved payload + native section renderer is still deferred.
- Added native free-plan lessons flow:
  - `src/screens/GuestLessonLibraryScreen.tsx`
  - `app/lessons/library.tsx`
  - `app/(tabs)/lessons.tsx` now routes free-plan users into the free lesson library and paid users into the full library
  - Free lesson library now keeps its original page structure, but lesson rows visually align with the main lesson library list while keeping right-side checkmarks
- App session preview state now separates account presence from membership entitlement:
  - `src/context/app-session-context.tsx`
  - default preview now assumes a signed-in user on the free plan
  - Account preview toggle is now `Free Plan` vs `Paid`
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
- Added native Profile shell work tied to preview member state:
  - `src/screens/ProfileScreen.tsx`
  - `app/account/profile.tsx`
  - `src/screens/AccountScreen.tsx` now routes Profile from Account in both free-plan and paid preview states
- Current Profile shell is frontend-only and intentionally uses preview entitlement state rather than real auth.
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
  - `Exercise Bank` and `Topic Library` remain placeholder destinations for now
  - Disabled cards keep top-right red `Coming soon` treatment
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
- Next priority:
  - `My Pathway` native MVP is now implemented as the signed-in primary surface and should be reviewed with cofounder/UI design feedback before the next polish pass
  - Next major implementation step: wire up real app auth/login and replace the preview session slider with real session state
  - Keep `app/lessons/[id].tsx` rich renderer work scoped as a separate beast-sized task when it starts
- Keep design flexible since cofounder may change direction.

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
  - uses the preview member/free-plan state from `src/context/app-session-context.tsx`
  - uses live lesson index data as the content source for lesson cards where possible
  - uses frontend-owned preview progress rules for resume/completed state until real auth-backed pathway data exists
  - keeps visual styling aligned with the web palette:
    - app background `#F7FAFD`
    - black borders/text
    - red primary CTA
    - blue highlight/progress surfaces
  - avoids the web mobile dropdown/tab pattern and instead uses one vertical native flow:
    - header + plan/state
    - continue learning
    - free-plan notice
    - pathway preview
    - completed preview
- Current Pathway limitations:
  - `Continue learning` is still preview-derived, not auth-backed
  - completed lesson history screen is preview/static for now
  - `liked lessons` and `comment history` remain intentionally excluded from the app MVP
  - final structure/spacing/content order should still be treated as provisional until cofounder review

## Source of Truth for Future Chats
- This file should be used as the first context document in new chats.
- If implementation direction changes, update this file before switching chats.
