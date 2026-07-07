# X Paid Partnership Hider

A lightweight Chrome Extension Manifest V3 extension that hides X/Twitter posts labeled as paid partnerships.

## What It Does

- Runs on `https://x.com/*` and `https://twitter.com/*`.
- Detects X/Twitter paid partnership labels in English and common localized equivalents.
- Hides the matching post from the timeline.
- Also hides adjacent posts in the same visually connected thread preview when X renders the paid partnership as a multi-post thread.
- Includes a minimal toolbar popup with an on/off switch.
- Works entirely client-side in the browser.

## Privacy

All processing happens locally in Chrome. The extension does not collect, transmit, store, or log user data.

The only saved value is the local on/off setting for the extension. It is stored in Chrome extension storage on your device.

## Permissions

The extension uses only:

- `storage`: saves whether the extension is enabled or paused.

It does not request network, tabs, cookies, history, or identity permissions.

## File Structure

```text
x-paid-partnership-hider/
  manifest.json
  content.js
  styles.css
  popup.html
  popup.css
  popup.js
  icons/
    icon-16.png
    icon-32.png
    icon-48.png
    icon-128.png
  README.md
```

## How It Works

The content script scans X/Twitter post containers, preferring `article` elements because posts are usually rendered that way.

If a compact label outside the user-written post text contains `Paid partnership` or a supported localized equivalent, the extension marks the post and hides it with CSS. For thread previews, it also hides adjacent same-author cells only when they appear visually connected by X's thread connector.

X/Twitter is a dynamic single-page app, so the extension uses a debounced `MutationObserver` to scan newly added posts while you scroll.

## Install Locally in Chrome

1. Download or clone this repository.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the `x-paid-partnership-hider` folder.
6. Open or refresh `https://x.com/` or `https://twitter.com/`.

## How to Test

1. Load the extension as unpacked in Chrome.
2. Open X/Twitter.
3. Browse the timeline.
4. Confirm regular posts remain visible.
5. Confirm posts labeled `Paid partnership` by X/Twitter are hidden.
6. Scroll to load new posts and confirm newly added matching posts are hidden.
7. If a paid partnership appears as a thread preview, confirm the connected thread preview is hidden.
8. Use the toolbar popup switch to pause or resume hiding.

## Development Notes

- There are no external dependencies.
- There is no build step.
- Edit the files directly and reload the unpacked extension in `chrome://extensions`.
- For local debugging, set `DEBUG` to `true` at the top of `content.js`. Keep it `false` for normal use.

## Known Limitations

- The extension depends on visible text in the rendered page. If X/Twitter changes the label text or hides it from `innerText`, matching may need to be updated.
- The extension intentionally ignores matching words inside the main user-written post text.
- The multilingual matcher is a curated best-effort list. X/Twitter can change localized label wording at any time.
- The extension hides matching post containers visually instead of deleting them from the page.
- The thread-hiding behavior is conservative and based on X's current visual thread connector layout.
- The extension only targets the web versions of X/Twitter listed in `manifest.json`.
