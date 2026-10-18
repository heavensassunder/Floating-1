# Floating Buddy AI (Native Android)

A cute slime buddy that floats on top of other Android apps and talks via OpenRouter AI with vision and conversational capabilities.

## Architecture & Files
- **`OpenRouterClient.kt`**: Communicates with OpenRouter AI using `google/gemini-flash-1.5`. Supports both text chat and multimodal screen capture vision prompts.
- **`SlimeStats.kt`**: Manages hunger, happiness, energy, and background decay. Persists to SharedPreferences.
- **`ChatBubbleView.kt`**: Custom overlay view rendered directly above the floating slime avatar with 5-second auto-dismiss and fade animation.
- **`ScreenshotHelper.kt`**: Uses `MediaProjection` and `ImageReader` to capture the screen and encode it as Base64.
- **`FloatingService.kt`**: Foreground service hosting the slime overlay with interactive drag physics, single-tap chat, double-tap screen vision, and long-press feeding popup.
- **`MainActivity.kt`**: Modern Jetpack Compose Material 3 UI for configuring API key, viewing real-time stats, and requesting runtime overlay and media projection permissions.

## How to Run in Android Studio
1. Open Android Studio (Hedgehog, Iguana, Koala, or Ladybug).
2. Click **Open** and select the `android/` directory (or extract the downloaded ZIP).
3. Allow Gradle to sync.
4. Connect an Android device (Android 8.0 / API 26+) or launch an emulator.
5. Click **Run 'app'** (`Shift + F10`).
6. In the app:
   - Enter your OpenRouter API key and tap **Save Key**.
   - Tap **Start Floating Buddy**.
   - Grant the "Display over other apps" permission when prompted.
   - Accept the screen capture / media projection prompt.
   - Enjoy your cute floating slime!

## Automatic Debug APK via GitHub Actions
This project includes a ready-to-run GitHub Actions workflow in `.github/workflows/build-apk.yml`.

### How to Collect the Debug APK Artifact:
1. Push this project to your GitHub repository.
2. Go to the **Actions** tab on your GitHub repository.
3. Select **Build Android Debug APK** in the left sidebar.
4. Click **Run workflow** (or simply push a commit to trigger it automatically).
5. Once the build completes successfully (green checkmark):
   - Scroll down to the **Artifacts** section at the bottom of the workflow run summary.
   - Click **`floating-buddy-ai-debug-apk`** to download your debug APK directly to your phone or computer!

