# BadamClasses Android App

Premium student app built with Expo + React Native.

## Development

```bash
cd mobile
npm install
npx expo install --fix
npx expo start
```

Press `a` to open on an Android emulator, or scan the QR code with a compatible Expo development client.

## Backend

The app currently reads courses from the existing BadamClasses API:

- API base: `https://badamclasses.onrender.com/api`
- Health: `GET /health`
- Courses: `GET /courses`

Do not add secrets or production credentials to this app. Authentication tokens will be stored using secure device storage when the login flow is implemented.

## Build

Use an EAS development build first, then create a signed Android App Bundle for Play Store release after QA.
