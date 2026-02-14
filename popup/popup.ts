/**
 * Popup script - handles user interaction with the extension popup
 */

const WORDS_PER_MINUTE = 200; // Average reading speed

interface PageStats {
    wordCount: number;
    textLength: number;
}

interface MessageResponse {
    stats?: PageStats;
}

const analyzeBtn = document.getElementById('analyzeBtn') as HTMLButtonElement;
const wordCountEl = document.getElementById('wordCount') as HTMLElement;
const readingTimeEl = document.getElementById('readingTime') as HTMLElement;
const statsDiv = document.getElementById('stats') as HTMLElement;

if (analyzeBtn) {
    analyzeBtn.addEventListener('click', analyzeCurrentPage);
}

/**
 * Analyze the current page and display statistics
 */
async function analyzeCurrentPage(): Promise<void> {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { action: 'getPageStats' }, (response: MessageResponse) => {
                if (response && response.stats) {
                    displayStats(response.stats);
                } else {
                    showError('Could not analyze page');
                }
            });
        }
    } catch (error) {
        console.error('Error:', error);
        showError('Error analyzing page');
    }
}

/**
 * Display statistics on the popup
 */
function displayStats(stats: PageStats): void {
    const { wordCount } = stats;
    const readingTime = Math.ceil(wordCount / WORDS_PER_MINUTE);
    
    if (wordCountEl) {
        wordCountEl.textContent = wordCount.toLocaleString();
    }
    if (readingTimeEl) {
        readingTimeEl.textContent = readingTime === 1 ? '< 1 min' : `${readingTime} min`;
    }
}

/**
 * Show error message
 */
function showError(message: string): void {
    if (wordCountEl) {
        wordCountEl.textContent = '-';
    }
    if (readingTimeEl) {
        readingTimeEl.textContent = '-';
    }
    
    if (statsDiv) {
        const errorEl = document.createElement('div');
        errorEl.style.color = '#e74c3c';
        errorEl.style.padding = '10px';
        errorEl.textContent = message;
        statsDiv.appendChild(errorEl);
        
        setTimeout(() => errorEl.remove(), 3000);
    }
}

// Load stats when popup opens
window.addEventListener('load', analyzeCurrentPage);
