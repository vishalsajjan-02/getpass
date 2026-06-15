# Gatepass Nexus — Mobile (React Native)

Cross-platform mobile app for **Android** and **iOS**, built with [Expo](https://expo.dev) and **React Native**. It uses the **same backend API and database** as the web app (`http://localhost:3001/api` by default).

## Prerequisites

- Node.js **20+** (Expo SDK 54 — works with **Play Store** Expo Go)
- npm
- [Expo Go](https://expo.dev/go) on your phone, or Android Studio / Xcode for emulators
- Backend running: `cd backend && npm run dev`

## Setup

```bash
cd mobile
npm install
cp .env.example .env
```

Edit `.env` and set `EXPO_PUBLIC_API_URL`:

| Environment | URL |
|-------------|-----|
| iOS Simulator | `http://localhost:3001/api` |
| Android Emulator | `http://10.0.2.2:3001/api` |
| Physical device | `http://YOUR_PC_IP:3001/api` (same Wi‑Fi as phone) |

## Run

```bash
npm start
```

Then press `a` for Android emulator, `i` for iOS simulator, or scan the QR code with Expo Go.

## Features by role

| Role | Mobile screens |
|------|----------------|
| **Employee** | Dashboard, list requests, create gatepass |
| **Gatekeeper** | Today's gatepasses (Out/In), reporting timing |
| **Manager / Admin** | Pending approvals (approve/reject) |
| **Guest** | Guest code login, submit visit request |

## Project structure

```
mobile/
  app/                 # Expo Router screens (file-based routes)
  src/
    api/client.ts      # Same REST API as web (/api/*)
    contexts/          # Auth (JWT in SecureStore)
    hooks/             # React Query hooks
    components/        # UI building blocks
```

## API alignment

All endpoints match the existing backend:

- `POST /auth/login`, `POST /auth/guest-login`, `GET /auth/me`
- `GET/POST /gatepasses`, `PUT /gatepasses/:id/status`
- `GET /user-in-out-time`, `POST /user-in-out-time/check-in|check-out`

No separate mobile backend — one Express server serves web and mobile.

## Build for stores (optional)

```bash
npx expo prebuild
npx expo run:android
npx expo run:ios
```

Use [EAS Build](https://docs.expo.dev/build/introduction/) for production APK/IPA.
