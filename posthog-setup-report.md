# PostHog post-wizard report

The wizard has completed a full PostHog analytics integration for the Pailin Abroad React Native/Expo app. The SDK was installed, a singleton PostHog client created, the root layout wrapped with `PostHogProvider`, and event capture added across the auth, onboarding, membership, and lessons flows. Users are identified by their Supabase user ID on sign-in and session restore, and `posthog.reset()` is called on sign-out to cleanly separate sessions.

| Event name | Description | File |
|---|---|---|
| `sign_up_completed` | User successfully submits the email sign-up form and is redirected to email confirmation. | `src/screens/AuthScreen.tsx` |
| `sign_in_completed` | User successfully signs in with email and password. | `src/screens/AuthScreen.tsx` |
| `google_sign_in_started` | User taps the Continue with Google button on the auth screen. | `src/screens/AuthScreen.tsx` |
| `apple_sign_in_started` | User taps the Continue with Apple button on the auth screen. | `src/screens/AuthScreen.tsx` |
| `guest_mode_started` | User chooses to continue without an account via the guest mode option. | `src/screens/AuthScreen.tsx` |
| `onboarding_completed` | User finishes all onboarding steps and lands on the main app. | `src/screens/OnboardingScreen.tsx` |
| `onboarding_upgrade_pressed` | User taps Unlock Full Access on the benefits step of onboarding, indicating purchase intent. | `src/screens/OnboardingScreen.tsx` |
| `onboarding_free_plan_chosen` | User chooses to continue with the free plan on the benefits step of onboarding. | `src/screens/OnboardingScreen.tsx` |
| `membership_plan_selected` | User selects a membership plan card on the membership screen. | `src/screens/MembershipScreen.tsx` |
| `membership_purchased` | User successfully completes a membership purchase via RevenueCat. | `src/screens/MembershipScreen.tsx` |
| `membership_purchase_cancelled` | User cancels or dismisses the purchase flow after tapping Join Now. | `src/screens/MembershipScreen.tsx` |
| `membership_restore_pressed` | User taps Restore Purchases on the membership screen. | `src/screens/MembershipScreen.tsx` |
| `lesson_opened` | User taps a lesson from the library to open it. | `src/screens/LessonsLibraryScreen.tsx` |
| `sign_out_completed` | User successfully signs out of the app. | `src/context/app-session-context.tsx` |

## Files created or modified

- **Created** `app.config.js` — bridges `.env` → `expo-constants` extras for `POSTHOG_PROJECT_TOKEN` and `POSTHOG_HOST`
- **Created** `src/config/posthog.ts` — PostHog singleton with graceful no-op when env vars are absent
- **Modified** `app/_layout.tsx` — wraps the app tree with `PostHogProvider` and adds manual screen tracking via `posthog.screen()`
- **Modified** `src/screens/AuthScreen.tsx` — captures `sign_up_completed`, `sign_in_completed`, `google_sign_in_started`, `apple_sign_in_started`, `guest_mode_started`
- **Modified** `src/screens/OnboardingScreen.tsx` — captures `onboarding_completed`, `onboarding_upgrade_pressed`, `onboarding_free_plan_chosen`
- **Modified** `src/screens/MembershipScreen.tsx` — captures `membership_plan_selected`, `membership_purchased`, `membership_purchase_cancelled`, `membership_restore_pressed`
- **Modified** `src/screens/LessonsLibraryScreen.tsx` — captures `lesson_opened`
- **Modified** `src/context/app-session-context.tsx` — identifies users on sign-in/session restore, captures `sign_out_completed`, calls `posthog.reset()` on sign-out

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics (wizard) — Dashboard](https://eu.posthog.com/project/233229/dashboard/851104)
- [Sign-ups & Sign-ins](https://eu.posthog.com/project/233229/insights/TPt3w7yA)
- [Auth-to-membership conversion funnel](https://eu.posthog.com/project/233229/insights/8Dy1fB5G)
- [Membership purchases by plan](https://eu.posthog.com/project/233229/insights/L43K4t7K)
- [Onboarding funnel](https://eu.posthog.com/project/233229/insights/nWyUmrd1)
- [Lesson engagement](https://eu.posthog.com/project/233229/insights/YKf12jBF)

## Verify before merging

- [ ] Run a full production build (the wizard only verified the files it touched) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `POSTHOG_PROJECT_TOKEN` and `POSTHOG_HOST` to `.env.example` and any bootstrap scripts so collaborators know what to set.
- [ ] Confirm the returning-visitor path also calls `identify` — the wizard wires `identify` on session hydration and `SIGNED_IN` / `USER_UPDATED` events, but verify a returning user who reopens the app without signing out is identified correctly before the first event fires.
- [ ] This app includes Supabase and RevenueCat data sources. Run `npx @posthog/wizard warehouse` to connect them to PostHog's data warehouse for enriched analytics.

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.
