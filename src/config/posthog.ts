import PostHog from 'posthog-react-native';
import Constants from 'expo-constants';

const projectToken = Constants.expoConfig?.extra?.posthogProjectToken as string | undefined;
const host = (Constants.expoConfig?.extra?.posthogHost as string) || 'https://eu.i.posthog.com';
const isPostHogConfigured = Boolean(projectToken) && projectToken !== 'phc_your_project_token_here';

if (__DEV__ && !isPostHogConfigured) {
  console.warn(
    'POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, ' +
      'this causes events to be silently missed. ' +
      'This error stops appearing once POSTHOG_PROJECT_TOKEN is configured.'
  );
}

export const posthog = new PostHog(projectToken || 'placeholder_key', {
  host,
  disabled: !isPostHogConfigured,
  captureAppLifecycleEvents: true,
  errorTracking: {
    autocapture: {
      uncaughtExceptions: true,
      unhandledRejections: true,
      nativeCrashes: true,
    },
  },
  enableSessionReplay: true,
  sessionReplayConfig: {
    // Reveal product-owned copy; every shared TextInput is explicitly masked instead.
    maskAllTextInputs: false,
    // App artwork and UI icons are useful replay context. User-entered text remains masked.
    maskAllImages: false,
    maskAllSandboxedViews: true,
    // Native logs can contain user IDs and speaking-coach diagnostics.
    captureLog: false,
    // PostHog records timings/status codes only, never request or response bodies.
    captureNetworkTelemetry: true,
    throttleDelayMs: 1000,
  },
  flushAt: 20,
  flushInterval: 10000,
  maxBatchSize: 100,
  maxQueueSize: 1000,
  preloadFeatureFlags: true,
  sendFeatureFlagEvent: true,
  featureFlagsRequestTimeoutMs: 10000,
  requestTimeout: 10000,
  fetchRetryCount: 3,
  fetchRetryDelay: 3000,
});

if (__DEV__) {
  posthog.debug(true);
}

export const isPostHogEnabled = isPostHogConfigured;
