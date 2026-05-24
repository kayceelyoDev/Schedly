# Schedly 📅

Schedly is a beautifully designed, local-first React Native application tailored for affiliate marketers and content creators. It helps you schedule posts, manage captions, and track your revenue performance seamlessly. 

Built with **Expo**, **Expo Router**, and **SQLite**, Schedly ensures all your data stays private and fast on your local device.

## 🌟 Features

*   **Task & Post Scheduling:** Schedule tasks and affiliate posts with local push notifications. Never miss a peak posting time again.
*   **Performance Analytics:** 
    *   Track total revenue and projected earnings (Daily, Weekly, Monthly, Yearly).
    *   View interactive revenue and view trends via line charts.
    *   Discover your "Sweet Spot" — the app analyzes your post views to tell you what time of day gets the highest engagement.
*   **Caption Vault:** Save, organize, and copy your most-used captions and affiliate links for quick access.
*   **Deep Customization:**
    *   **Theming:** Full Light and Dark mode support with sleek, modern UI.
    *   **Accent Colors:** Personalize the app with custom brand colors (Orange, Blue, Green, etc.).
    *   **Localization:** Toggle between 12-hour/24-hour time formats and change your preferred currency symbol (e.g., $, ₱, €).
*   **100% Offline:** All data is stored locally using `expo-sqlite` for maximum privacy and offline availability.

## 📸 Tech Stack

*   **Framework:** React Native + Expo (SDK 51+)
*   **Routing:** Expo Router
*   **Storage:** `expo-sqlite`
*   **Notifications:** `expo-notifications` (Fully supports Android 13+ Alarms)
*   **Icons & UI:** `lucide-react-native`, `react-native-reanimated`, `react-native-gifted-charts`

## 🚀 Getting Started

### Prerequisites
Make sure you have Node.js installed, and if you want to build locally, the Android SDK or iOS toolchain.

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the App
To start the Expo development server:
```bash
npx expo start
```
You can run it on an Android Emulator, iOS Simulator, or via the Expo Go app. 
*(Note: Push notifications are not supported inside the Expo Go app on SDK 53+. To test notifications, you must use a development build or APK).*

## 📦 Building for Production

Since Schedly relies on native background notifications, the best way to use it is by compiling a standalone APK or AAB.

**Using EAS Build (Cloud):**
```bash
npm install -g eas-cli
eas build -p android --profile preview
```
Once the build is finished, EAS will provide a link to download your `.apk` file which you can install on your physical device or emulator.

## 📄 License
This project is licensed under the MIT License.
