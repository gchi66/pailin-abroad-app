# Pailin Abroad analytics guide

This document defines what the founders should look at, how each number is calculated, and which data must never be sent to PostHog.

## Founder Weekly dashboard

Keep this dashboard to eight tiles. Each title should be a plain-English question.

| Dashboard question | PostHog measurement | Why it matters |
|---|---|---|
| How many people used the app this week? | Weekly unique users of an action combining `Application Opened` and `Application Became Active` | Overall reach, including cold launches and returns from the background |
| How many learners actively learned? | Unique users with `lesson_started`, `exercise_bank_set_started`, or `speaking_session_started` | Real usage rather than app opens |
| Do learners finish lessons they start? | Funnel: `lesson_started` → `lesson_completed`, within 7 days | Core learning activation |
| Do new learners finish onboarding? | Funnel ending in `onboarding_completed` | First-use friction |
| Do learners finish the placement test? | Funnel: `placement_test_started` → `placement_test_completed` | Placement flow quality |
| How much practice is being completed? | Weekly count and unique users for `exercise_bank_set_completed` and `speaking_recording_evaluated` | Practice engagement |
| Are speaking evaluations useful? | Breakdown of `speaking_recording_evaluated` by `status` and `practice_type` | Speaking quality |
| Are free users becoming members? | Funnel: `membership_plan_selected` → `membership_purchased` | Revenue conversion |

Add one recordings playlist filtered to sessions containing an exception, a placement-test exit, a purchase cancellation, or a started-but-uncompleted lesson. This makes recordings purposeful instead of an unstructured video inbox.

## Why the starter dashboard is misleading

The PostHog starter dashboard is designed primarily around websites. Pailin Abroad is a React Native app, so it uses different automatic events:

| Starter number | What it currently asks for | Correct mobile equivalent |
|---|---|---|
| Pageviews | `$pageview` | Count `$screen`; break down by `$screen_name` |
| Sessions | Often a web/pageview-based query | Count unique `$session_id` values on `$screen` |
| Active users | Unique people who generated almost any event | Unique people who generated a meaningful learning event |

Therefore, `0` pageviews does not mean that navigation tracking is broken. The app calls `posthog.screen(...)` on every Expo Router pathname change, which produces `$screen`, not `$pageview`.

Do not use the starter dashboard as the founders' source of truth. Its broad active-user number can include anonymous users, lifecycle events, touch autocapture, test devices, and admins. Duplicate or replace it with the dashboard below.

## Exact dashboard build sheet

Create one dashboard named **Founder Weekly — Product & Learning**, set its default date range to **Last 7 days**, and compare it with the previous period. Apply these shared filters wherever the property exists:

- Library is `posthog-react-native` (the UI may display this as `$lib`).
- Person property `is_admin` is not `true`, once that property is present.
- Exclude known founder/test distinct IDs with a cohort named **Internal & test users**.

Build these insights in order:

1. **How many people used the app this week?** — Trends; action containing `Application Opened` OR `Application Became Active`; weekly unique users; big number with previous-period comparison.
2. **How many visits did they make?** — Trends; event `$screen`; aggregate by unique sessions / `$session_id`; total value with previous-period comparison.
3. **Which parts of the app are people using?** — Trends; event `$screen`; total events; break down by `$screen_name`; bar chart; show the top 10.
4. **How many learners actively learned?** — Trends; action containing `lesson_started` OR `exercise_bank_set_started` OR `speaking_session_started`; weekly unique users; big number.
5. **Do learners finish lessons they start?** — Funnel; `lesson_started` to `lesson_completed`; unique users; conversion window 7 days. Treat this as a person-level completion signal, not an exact per-lesson completion rate.
6. **Do learners finish the placement test?** — Funnel; `placement_test_started` to `placement_test_completed`; unique users; conversion window 24 hours.
7. **How much practice was completed?** — Trends with two series: `exercise_bank_set_completed` and `speaking_recording_evaluated`; total events; weekly bar chart.
8. **Are free users becoming members?** — Funnel; `membership_plan_selected` to `membership_purchased`; unique users; conversion window 7 days.

Add two backend-owned business tiles:

- **How many people signed up?** — `sign_up_completed`; unique users. This event is emitted after an authenticated profile is created, and historical users have been backfilled with their original signup timestamps.
- **What changed with memberships?** — `membership_status_changed`; break down by `membership_event_type`, `subscription_status`, `source`, and `plan_id`. RevenueCat and Stripe webhooks emit this event and update the person's current `is_paid`, plan, provider, renewal/cancellation, and expiry properties even when the app is closed.

For a current paid-member snapshot, count persons where the person property `is_paid` is `true`, excluding `is_admin = true` and sandbox membership events. Do not calculate the current total by summing purchase events because cancellations and expirations change the answer.

Put retention and diagnostics on separate dashboards so the weekly founder view stays readable:

- **Learning Retention** — weekly retention where the start and return action is the combined active-learning action.
- **Quality & Recordings** — `$exception` trend, recordings containing `$exception`, recordings containing `placement_test_exited`, and recordings containing `membership_purchase_cancelled`.

## When each metric can show data

The app already generated `$screen`, application lifecycle, authentication, onboarding, and membership events before the replay release. Those insights can show historical data immediately. Existing signup dates and current membership properties were backfilled from Supabase on November 16, 2026.

The following learning events were added with app version 2.1.7 and will remain at zero until that build (or a compatible EAS update) is installed and someone performs the action:

- `lesson_started`, `lesson_completed`, and `lesson_marked_incomplete`
- `placement_test_started`, `placement_test_section_completed`, `placement_test_completed`, and `placement_test_exited`
- `exercise_bank_set_started`, `exercise_bank_set_completed`, and exercise answer/skip events
- `speaking_session_started`, `speaking_recording_evaluated`, and speaking skip/completion events
- `lesson_comment_posted` and `contact_message_sent`

When an insight unexpectedly shows no data, first open **Activity → Events**, search for its exact event name, and inspect one event's timestamp, distinct ID, `$lib`, `$session_id`, and app version. If the event exists there, the insight's date range, filters, or aggregation is wrong; if it does not, the installed app build did not send it.

## Delivery for non-technical founders

Use PostHog dashboard subscriptions before building custom reporting software:

1. Name the dashboard **Founder Weekly — Product & Learning**.
2. Use the eight plain-English titles above; hide unnecessary legends and technical property names.
3. Subscribe both founders by email every Monday morning in the project timezone.
4. Enable the automatic AI summary so the email explains the largest changes from the previous week.
5. Review the dashboard in PostHog only when the email raises a question. Open linked recordings to understand why a number changed.

A custom reporting page is only justified if this workflow remains confusing, if outside stakeholders need restricted access, or if PostHog data must be combined with accounting/support data. PostHog dashboards can also be shared or embedded later.

## Event coverage

PostHog automatically captures app lifecycle events, route screen views, supported touches, unhandled JavaScript errors, rejected promises, and native crashes. Custom events add the business meaning:

- Acquisition and accounts: authentication, guest entry, onboarding, and sign-out.
- Learning: lesson open, start, completion, and manual incomplete status.
- Placement: manual-level choice, test start, section completion, final result, and early exit.
- Exercise Bank: set start, submitted result, skipped question, and set completion.
- Speaking Coach: session open/start, recording evaluation outcome, skipped question, and lesson completion.
- Revenue: plan selection, free-plan selection, purchase, cancellation, and restore.
- Engagement: campaign interactions, lesson comments, and successful support messages.

Screen views and touch autocapture are useful for discovery but should not replace named outcome events in funnels.

## Privacy rules

- Never send names, email addresses, passwords, contact-message bodies, learner answers, transcripts, recordings, or access tokens as event properties.
- Use stable IDs, booleans, counts, status enums, content type, lesson ID, and coarse timing values.
- Session replay masks all text inputs, images, and sandboxed system views.
- Replay console-log capture stays disabled because diagnostic logs may contain user IDs or speaking details.
- Revisit the privacy notice before enabling production replay and document PostHog as an analytics/session-replay processor.

## Release model

- The first replay-enabled release is a native change. Build and submit a new iOS/Android binary.
- In PostHog Project Settings, enable **Record user sessions** and choose the production sampling percentage.
- Test replay in a development or preview build; Expo Go cannot run the native replay plugin.
- After users install the replay-capable binary, JavaScript-only event and replay-configuration changes can ship through EAS Update to builds with the matching runtime version.
- Any later dependency, permission, native configuration, or SDK change requires another native build.

## Verification checklist

- Confirm `isSessionReplayActive()` returns true on a physical iOS and Android test device.
- Use the app for at least 10 seconds and confirm the replay appears in the EU PostHog project.
- Confirm typed text and images are masked in authentication, profile, lesson, and contact screens.
- Confirm the test user is identified after sign-in and reset after sign-out.
- Complete one run of each founder funnel and verify its events and properties.
- Confirm the production EAS environment contains `POSTHOG_PROJECT_TOKEN` and `POSTHOG_HOST`.
- Configure source-map/symbol upload before relying on exception stack traces in production.
