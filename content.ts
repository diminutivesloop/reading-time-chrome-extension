/**
 * Content script - runs in the context of web pages
 * Analyzes page content for reading statistics
 */

interface PageStats {
    wordCount: number;
    textLength: number;
}

interface MessageRequest {
    action: string;
}

interface MessageResponse {
    stats?: PageStats;
}

/**
 * Extract text content from the page
 */
function getPageText(): string {
    // Try to get text from main element first
    let mainElement = document.querySelector('main');
    
    // Fall back to element with role="main"
    if (!mainElement) {
        mainElement = document.querySelector('[role="main"]');
    }
    
    // Fall back to body if no main element found
    const textElement = mainElement || document.body;
    const bodyText = textElement.innerText;
    return bodyText || '';
}

/**
 * Count words in text
 */
function countWords(text: string): number {
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    return words.length;
}

/**
 * Calculate reading statistics
 */
function calculatePageStats(): PageStats {
    const pageText = getPageText();
    
    const stats: PageStats = {
        wordCount: countWords(pageText),
        textLength: pageText.length
    };
    
    return stats;
}

/**
 * Listen for messages from the popup
 */
chrome.runtime.onMessage.addListener(
    (request: MessageRequest, _, sendResponse: (response: MessageResponse) => void) => {
        if (request.action === 'getPageStats') {
            const stats = calculatePageStats();
            sendResponse({ stats, success: true });
        }
    }
);

/**
 * Optional: Add reading time indicator to the page
 */
function showReadingTimeIndicator(): void {
    const stats = calculatePageStats();
    const WORDS_PER_MINUTE = 200;
    const readingTime = Math.ceil(stats.wordCount / WORDS_PER_MINUTE);
    
    // Create a small indicator (optional)
    const indicator = document.createElement('div');
    indicator.id = 'reading-time-indicator';
    indicator.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #667eea;
        color: white;
        padding: 10px 15px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        z-index: 10000;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    `;
    indicator.textContent = `📖 ${readingTime} min read`;
    
    // Uncomment to enable automatic indicator display
    // document.body.appendChild(indicator);
}

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showReadingTimeIndicator);
} else {
    showReadingTimeIndicator();
}
