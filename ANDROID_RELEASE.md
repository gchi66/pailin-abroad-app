# Android Play Store Release

Run these commands from the project root:

```bash
cd /Users/macbook/Code/pailin-abroad-app
git status
git branch --show-current
npx eas-cli@latest build --platform android --profile production
```

The `production` profile in `eas.json` creates the Android App Bundle (`.aab`) used by Google Play and automatically increments the remote Android build number.

When the EAS build finishes, open the build link printed in the terminal, download the `.aab`, and upload it manually in Google Play Console.

Before building, confirm that:

- The branch is the branch intended for release (normally `master`).
- `git status` does not contain unintended changes.
- The user-facing app version is correct.

This command builds only; it does not submit anything to Google Play automatically.
