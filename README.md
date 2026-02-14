# Reading Time Chrome Extension

A lightweight Chrome extension that displays the approximate reading time for articles and web pages.

## Features

- **Quick Analysis**: Click the extension icon to analyze the current page
- **Reading Statistics**: Displays word count and estimated reading time
- **Accurate Calculations**: Based on average reading speed of 200 words per minute
- **Manifest V3**: Built with the latest Chrome Extension manifest version

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
├── icons/                 # Extension icons
│   ├── icon-16.png       # 16x16 icon
│   ├── icon-48.png       # 48x48 icon
│   └── icon-128.png      # 128x128 icon
└── README.md              # Documentation
```

## Installation & Setup

1. Clone or download the extension folder
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the extension folder
5. The extension icon will appear in your Chrome toolbar

## Usage

1. Navigate to any web page
2. Click the Reading Time extension icon
3. The popup will display:
   - **Word Count**: Total number of words on the page
   - **Reading Time**: Estimated time to read (in minutes)

## Development

### Key Files:
- **manifest.json**: Defines extension permissions and scripts
- **content.js**: Runs on web pages to calculate reading statistics
- **service-worker.js**: Handles background events
- **popup/**: Contains the extension's UI

### Permissions:
- `scripting`: Required to analyze page content
- `activeTab`: Required to access the current tab

## Configuration

To adjust the reading speed calculation, modify the `WORDS_PER_MINUTE` constant in:
- `popup/popup.js` (for popup display)
- `content.js` (for indicator calculation)

Default: 200 words per minute

## Testing

1. Install the extension using the setup steps above
2. Navigate to different web pages and click the extension icon
3. Verify that word count and reading time are calculated correctly

## Browser Support

- Chrome and Chromium-based browsers (Edge, Brave, etc.)

## Future Enhancements

- [ ] Reading time indicator on page
- [ ] Show reading speed in tab titles
- [ ] Customizable reading speed
- [ ] Dark mode support
- [ ] Better icons
- [ ] Calculate actual reading speed based on user behavior
