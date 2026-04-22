# GYDS Banking — Build the Android App

This project is built with **Expo + React Native + Express + PostgreSQL**. You can open and build it in **Android Studio** (or any code editor like VS Code, Code Studio on mobile, etc.).

---

## What is in the zip

`gyds-banking-source.zip` contains the full source:

- `client/` — React Native (Expo) mobile app
- `server/` — Express + Drizzle backend
- `shared/` — shared TypeScript schema
- `assets/` — icons, splash, images
- `app.json`, `package.json`, `tsconfig.json`, `drizzle.config.ts`

It does **not** include `node_modules`, `.git`, or build caches — those are recreated locally.

---

## 1. One-time setup on your computer

You need:

- **Node.js 20+** — https://nodejs.org
- **Java 17 (JDK)** — required by Android Studio
- **Android Studio** with the Android SDK — https://developer.android.com/studio
- A PostgreSQL database (local Postgres, Neon, Supabase, etc.)

After installing Android Studio, open `Settings → Languages & Frameworks → Android SDK` and install at least:
- Android SDK Platform **34**
- Android SDK Build-Tools **34.0.0**
- Android SDK Command-line Tools

Then add this to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk     # macOS
# export ANDROID_HOME=$HOME/Android/Sdk           # Linux
# Windows: set ANDROID_HOME to %LOCALAPPDATA%\Android\Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
```

---

## 2. Unzip and install dependencies

```bash
unzip gyds-banking-source.zip -d gyds-banking
cd gyds-banking
npm install
```

---

## 3. Configure environment

Create a `.env` file in the project root:

```
DATABASE_URL=postgresql://user:password@host:5432/dbname
SESSION_SECRET=any-long-random-string
```

Then push the schema to your database:

```bash
npm run db:push
```

---

## 4. Generate the native Android project

This is the magic command — it creates an `android/` folder you can open in Android Studio:

```bash
npx expo prebuild --platform android --clean
```

After it finishes, you will have a complete native Android project at `./android`.

---

## 5. Open in Android Studio

1. Launch **Android Studio**
2. Choose **Open**, then select the `android/` folder inside the project
3. Wait for Gradle to sync (first time can take 5–15 minutes)
4. Plug in an Android phone (with USB debugging on) **or** start an emulator from `Tools → Device Manager`

---

## 6. Run the app

### Option A — from Android Studio
- Press the green **Run** button (▶). It will build and install the APK on your device.

### Option B — from the terminal (recommended)
Open two terminals in the project root:

```bash
# Terminal 1 — starts the backend API
npm run server:dev
```

```bash
# Terminal 2 — builds and runs the Android app
npx expo run:android
```

Metro will start, the APK will install, and the app will open. Login with the admin account:

- Email: **netlifegy@gmail.com**
- Password: **Zaq12wsx**

---

## 7. Build a release APK (for distribution)

```bash
cd android
./gradlew assembleRelease    # macOS / Linux
gradlew.bat assembleRelease  # Windows
```

The signed APK will appear at:

```
android/app/build/outputs/apk/release/app-release.apk
```

For Play Store upload, build an AAB instead:

```bash
./gradlew bundleRelease
# → android/app/build/outputs/bundle/release/app-release.aab
```

You will need to set up a release signing key — the official guide is at
https://reactnative.dev/docs/signed-apk-android

---

## Editing on mobile (Code Studio / Acode / similar)

Yes — the source is plain TypeScript/JavaScript, you can edit it on a phone:

1. Unzip on your phone
2. Open the project folder in **Code Studio**, **Acode**, or **Termux + nvim**
3. To run/build, you still need a computer or a cloud builder (EAS) — phones can't compile native Android by themselves

For a no-computer build, sign up at https://expo.dev and run:

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

Expo will build the APK in the cloud and email you a download link.

---

## Troubleshooting

- **`SDK location not found`** → create `android/local.properties` with `sdk.dir=/path/to/Android/sdk`
- **Gradle sync fails** → File → Invalidate Caches → Invalidate and Restart
- **`Unable to load script`** → make sure Metro is running (`npx expo start`) and the device is on the same Wi-Fi
- **Database connection error** → double-check `DATABASE_URL` in `.env` and that you ran `npm run db:push`

---

Built with Expo SDK 54, React Native 0.81, React 19.
