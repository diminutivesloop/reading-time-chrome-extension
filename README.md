# Reading Time Chrome Extension

A lightweight Chrome extension that displays the approximate reading time for articles and web pages.

## Project Structure

```
reading-time-chrome-extension/
├── manifest.json           # Extension configuration
├── content.ts              # Content script for page analysis
├── service-worker.ts       # Background service worker
├── tsconfig.json           # TypeScript configuration
├── popup/
│   ├── popup.html         # Popup UI
│   ├── popup.css          # Popup styling
│   └── popup.ts           # Popup logic
└── README.md              # Documentation
```

## Installation & Setup

1. Clone or download the extension folder
2. Run `bun install` and `bun run build` to compile TypeScript files
3. Open Chrome and go to `chrome://extensions/`
4. Enable **Developer mode** (top-right toggle)
5. Click **Load unpacked** and select the extension folder
6. The extension icon will appear in your Chrome toolbar

Note: After reloading the extension the popup may not work until you refresh the current page because the content script is not automatically injected into already loaded pages. 

## Usage

1. Navigate to any web page
2. Click the Reading Time extension icon
3. The popup will display:
   - **Word Count**: Total number of words on the page
   - **Reading Time**: Estimated time to read (in minutes)

## Configuration

To adjust the reading speed calculation, modify the `WORDS_PER_MINUTE` constant in:
- `popup/popup.ts` (for popup display)
- `content.ts` (for indicator calculation)

Default: 200 words per minute

## Future Enhancements

- [ ] Customizable reading speed
- [ ] Reading time indicator on page
- [ ] Show reading speed in tab titles
- [ ] Measure actual reading speed
- [ ] Custom selection of reading text
- [ ] Debug mode that shows what text is analyzed and where the word boundaries are
