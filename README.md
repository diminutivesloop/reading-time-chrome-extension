# Reading Time Chrome Extension

A lightweight Chrome extension that displays the approximate reading time for articles and web pages.

🤖 Built w/ substantial help from GitHub Copilot

## Project Structure

```
reading-time-chrome-extension/
├── manifest.json           # Extension configuration
├── esbuild.mjs             # Build script
├── tsconfig.json           # TypeScript configuration
├── src/
│   ├── content.ts          # Content script: message routing, stats, title management
│   ├── debug.ts            # Debug mode feature module
│   ├── messages.ts         # Message request/response types
│   ├── page-stats.ts       # Shared page statistics types
│   ├── speed-test.ts       # Reading speed test feature module
│   ├── shared.ts            # Shared utilities and constants
│   ├── wpm-storage.ts      # Reading-speed storage helpers
│   ├── popup.html          # Popup UI
│   ├── popup.css           # Popup styling
│   └── popup.ts            # Popup logic
└── README.md               # Documentation
```

## Installation & Setup

1. Clone or download the extension folder
2. Run `npm install` and `npm run build` to compile and bundle TypeScript files
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

To adjust the reading speed calculation, modify the `DEFAULT_WORDS_PER_MINUTE` constant in:

- `src/wpm-storage.ts`

Default: 200 words per minute

## Future Enhancements

- [x] Customizable reading speed
- [ ] Reading time indicator on page
- [x] Show reading time in tab titles
- [x] Measure actual reading speed
- [ ] Custom selection of reading text
- [x] Debug mode that shows what text is analyzed and where the word boundaries are

## Known Issues

- Debug overlay may not position correctly on pages w/ dynamic content
- Debug overlay word count is higher than popup count
