# STYLE_GUIDE.md

This is yAp's universal styling contract. Apply it to every UI edit unless the
user explicitly asks for a different direction.

## Design Source Of Truth

The web app is the canonical UI. The primary reference files are:

- `index.html`
- `css/styles.css`
- `assets/`
- `components/voice-visualizer/`
- interaction behavior in `js/app.js` and `js/features/`

The web app is the design focus and primary distribution channel.

## Visual Personality

yAp should feel:

- voice-first
- soft but not childish
- social and intimate
- polished and mobile-native
- glassy, tactile, and image-led
- playful in details, serious in interaction quality

Avoid:

- generic SaaS dashboards
- heavy dark UI unless explicitly requested
- harsh borders or dense enterprise layouts
- marketing-page hero sections inside the app
- fake decorative complexity that harms the messaging flow

## Core Tokens

Use the web CSS tokens as the styling source of truth:

```css
--font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif;

--color-sooim: #B8D8FF;
--color-chloe: #DEC0F8;
--color-maria: #FFDEB8;
--color-lime: #DFFFB8;

--user-glow-1: #B8D8FF;
--user-glow-2: #DEC0F8;
--user-glow-3: #FFDEB8;
--user-glow-4: #DFFFB8;

--color-wave-active: #F97878;
--color-wave-stopped: #8A8A8E;

--text-primary: #111111;
--text-secondary: #6b6b6b;
--text-tertiary: #aaaaaa;

--r-sm: 10px;
--r-md: 18px;
--r-lg: 24px;
--r-xl: 32px;
--r-full: 9999px;
```

The default screen background is a soft off-white/pastel field:

```css
radial-gradient(circle at top, rgba(255, 233, 205, 0.56), transparent 35%),
radial-gradient(circle at bottom left, rgba(191, 221, 255, 0.44), transparent 36%),
linear-gradient(148deg, #fdfbff 0%, #fff9f5 40%, #f6f8ff 80%, #fdfbff 100%)
```

This exact background fill is universal. All app screens should use the same
gradient field unless the user explicitly requests a different mode. Do not
introduce one-off solid screen backgrounds for new screens.

## Surface Rules

- Prefer translucent white/glass surfaces over opaque gray cards.
- Use soft shadows and inset highlights to make controls feel tactile.
- Use rounded sheets and pills intentionally:
  - small controls: full pill radius
  - input surfaces: around 18px
  - cards/sheets: around 24-32px
- Avoid stacking cards inside cards.
- Avoid large generic white panels unless the web UI already uses that pattern.
- Preserve safe-area-aware mobile layouts.

## Typography Rules

- Use Apple system typography.
- Keep text compact and app-like.
- Use large type only for entry/welcome/empty states.
- Use 17-19px for primary mobile row/action text.
- Use 13-15px for metadata, captions, and secondary labels.
- Do not use negative letter spacing as a new style.
- Do not let text overflow buttons, bubbles, or compact rows.

## Color Rules

- Keep the base UI light, warm, and softly pastel.
- Use black/near-black for primary text and important primary buttons.
- Use yAp participant colors consistently:
  - `#B8D8FF`
  - `#DEC0F8`
  - `#FFDEB8`
  - `#DFFFB8`
- User glows must come from that four-color palette only.
- Use coral/red `#F97878` for active recording/waveform emphasis.
- Avoid introducing a new dominant color family without updating the whole system intentionally.

## Control Rules

- Voice recording and playback controls are core brand moments. Make them rounded, glassy, and tactile.
- All navigation and playback buttons must use the glass effect.
- The glass effect should be created with CSS styling: translucent fills, radial highlights, blur/saturation, soft borders, inset highlights, and subtle shadows. Do not rely on `glass-bg.png` as a button background.
- Prefer icon/image controls for record, play, pause, stop, close, send, add, and
  back actions when the web app uses them.
- Use existing assets in `assets/` before drawing new icons.
- Buttons should have clear pressed/disabled/loading states.
- Controls must be large enough for touch and must not shift layout when state
  changes.

## Screen Rules

- Preserve the current mobile app flow:
  - splash
  - welcome
  - phone auth
  - profile setup
  - chats list
  - create chat
  - contacts
  - chat view
  - recording/analysis overlays
  - profile/group settings
- Keep first-screen experiences functional, not marketing-only.
- Empty states should be useful and visually consistent with the rest of yAp.
- Overlays and sheets should feel like the web app: rounded, soft, translucent,
  and focused.
- yAp must be fully responsive across mobile dimensions, including small
  iPhones, large iPhones, browser mode, installed PWA mode, Safari browser
  chrome, keyboard-open states, and safe-area insets. No UI element may overlap,
  clip, become unreachable, or require horizontal scrolling.

## Web Edit Rules

- Use CSS variables where possible.
- Add new tokens only when they are likely to be reused.
- Keep selectors scoped to the screen/component being edited.
- Avoid broad CSS changes unless intentionally updating the design system.
- Preserve mobile viewport and keyboard behavior.
- Verify text and controls do not overlap, clip, overflow, become unreachable,
  or require horizontal scrolling on narrow screens.

## Asset Rules

- Reuse:
  - `assets/y.png`
  - record/play/pause/stop/send/close/add SVG assets
  - avatar/contact placeholders
- `assets/y.png` is the logo. Use it wherever the yAp logo appears.
- Do not use `yap-logo.png` or another logo asset as a replacement unless the
  user explicitly changes the brand direction.
- Do not use `glass-bg.png` as the background for navigation or playback
  buttons. Style the glass effect directly in CSS or SwiftUI.
- Do not replace the brand or main control assets without explicit user approval.
- New assets should match the existing soft, glassy, mobile visual language.

## Final UI Review Checklist

Before finishing any UI task, check:

- Does this still look like yAp's web app?
- Did I reuse existing tokens/assets?
- Does it remain voice-first?
- Are all visible controls functional?
- Does it fit on mobile without clipping or overlap?
- Does it work across small/large mobile widths, safe areas, browser chrome,
  PWA mode, and keyboard-open states?
- Did I preserve the no-fake-flow rule?
