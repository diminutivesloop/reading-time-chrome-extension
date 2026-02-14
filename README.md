# Reading Time Chrome Extension

A lightweight Chrome extension that displays the approximate reading time for articles and web pages.

## Project Structure

```
reading-time-chrome-extension/
├── manifest.json           # Extension configuration
├── content.js              # Content script for page analysis
├── service-worker.js       # Background service worker
├── popup/
│   ├── popup.html         # Popup UI
│   ├── popup.css          # Popup styling
│   └── popup.js           # Popup logic
└── README.md              # Documentation
```

## Installation & Setup

1. Clone or download the extension folder
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the extension folder
5. The extension icon will appear in your Chrome toolbar

Note: After reloading the extension the popup may not work until you refresh the current page because the content script is not automatically injected into already loaded pages. 

## Usage

1. Navigate to any web page
2. Click the Reading Time extension icon
3. The popup will display:
   - **Word Count**: Total number of words on the page
   - **Reading Time**: Estimated time to read (in minutes)

## Configuration

To adjust the reading speed calculation, modify the `WORDS_PER_MINUTE` constant in:
- `popup/popup.js` (for popup display)
- `content.js` (for indicator calculation)

Default: 200 words per minute

## Future Enhancements

- [ ] Customizable reading speed
- [ ] Reading time indicator on page
- [ ] Show reading speed in tab titles
- [ ] Measure actual reading speed
- [ ] Custom selection of reading text
- [ ] Debug mode that shows what text is analyzed and where the word boundaries are
