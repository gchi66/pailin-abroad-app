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

### Language + Sidebar (Mobile)
- Added global UI language context:
  - `src/context/ui-language-context.tsx`
- Provider wired in:
  - `app/_layout.tsx`
- Sidebar/hamburger + TH/EN toggle + menu routes implemented in:
  - `app/(tabs)/_layout.tsx`
- Home page reads `uiLanguage` from context.

## Lessons Work (Started, Now Paused)

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

### Important Pause Decision
- Supabase integration is currently **paused** by product decision.
- Do not prioritize env setup/data wiring right now.
- Continue porting other pages/components first.

## Env Notes
- Real `.env` should live at project root:
  - `pailin-abroad-app/.env`
- Only expose client-safe keys as `EXPO_PUBLIC_*`.
- If Supabase remains paused, lessons routes may be left untouched or hidden.

## Rich Renderer Risk (Lesson Port)
- `RichSectionRenderer` is the highest-risk port area and should be isolated as its own task.
- Keep backend resolver/data shape as source of truth:
  - web backend `resolver.py` + `merge_jsonb.py`
- Rebuild renderer natively in RN; do not attempt direct web renderer reuse.
- Defer sticky audio/player behavior (`expo-av`) to a later phase if needed.

## Next Priority (Per Latest Decision)
- Skip/park Supabase + lesson deep work for now.
- Continue configuring/porting other app pages first.
- Keep design flexible since cofounder may change direction.

## Source of Truth for Future Chats
- This file should be used as the first context document in new chats.
- If implementation direction changes, update this file before switching chats.
