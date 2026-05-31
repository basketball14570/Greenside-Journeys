# Assets

Expo expects three image assets referenced from `app.json`. Drop in PNGs
with the names below — the scaffold ships without binaries so the repo
stays text-only. Until you add them, `npx expo start` will warn and use
the Expo default icons (the app still runs).

| File              | Size       | Used by                    | Notes                                                            |
| ----------------- | ---------- | -------------------------- | ---------------------------------------------------------------- |
| `icon.png`        | 1024x1024  | iOS home screen + App Store | Square, opaque, no transparency. Should look good at 60px.       |
| `adaptive-icon.png` | 1024x1024 | Android adaptive icon foreground | Centered logo, leave ~25% safe padding on all sides (Android crops). |
| `splash.png`      | 1284x2778  | Launch splash               | Same green background (`#0a1f14`) as the app, logo centered.     |

Quickest path: take the Greenside Edge logo SVG from `public/` on the
web app and export at the sizes above with the dark-green background
baked in.
