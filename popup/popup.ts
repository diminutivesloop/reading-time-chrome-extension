/**
 * Popup script - handles user interaction with the extension popup
 */

const DEFAULT_WORDS_PER_MINUTE = 200; // Average reading speed

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
const wpmInput = document.getElementById('wpmInput') as HTMLInputElement;
const saveWpmBtn = document.getElementById('saveWpmBtn') as HTMLButtonElement;
const errorEl = document.getElementById('error') as HTMLElement;

if (analyzeBtn) {
    analyzeBtn.addEventListener('click', analyzeCurrentPage);
}

if (saveWpmBtn) {
    saveWpmBtn.addEventListener('click', saveWpmSetting);
}

if (wpmInput) {
    wpmInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveWpmSetting();
        }
    });
}

/**
 * Analyze the current page and display statistics
 */
async function analyzeCurrentPage(): Promise<void> {
    clearError();

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

async function getWordsPerMinute(): Promise<number> {
    const { wordsPerMinute } = await chrome.storage.sync.get<{ wordsPerMinute: number }>({ wordsPerMinute: DEFAULT_WORDS_PER_MINUTE });
    return wordsPerMinute;
}

/**
 * Display statistics on the popup
 */
async function displayStats(stats: PageStats): Promise<void> {
    clearError();

    try {
        const { wordCount } = stats;
        const readingTime = Math.ceil(wordCount / await getWordsPerMinute());
        
        if (wordCountEl) {
            wordCountEl.textContent = wordCount.toLocaleString();
        }
        if (readingTimeEl) {
            readingTimeEl.textContent = readingTime === 1 ? '< 1 min' : `${readingTime} min`;
        }
    } catch (error) {
        console.error('Error displaying stats:', error);
        showError('Error calculating reading time');
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
    
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.add('show');
    }
}

/**
 * Clear error message
 */
function clearError(): void {
    if (errorEl) {
        errorEl.textContent = '';
        errorEl.classList.remove('show');
    }
}

/**
 * Load and display the current WPM setting
 */
async function loadWpmSetting(): Promise<void> {
    try {
        if (wpmInput) {
            wpmInput.value = (await getWordsPerMinute()).toString();
        }
    } catch (error) {
        console.error('Error loading WPM setting:', error);
    }
}

/**
 * Save the WPM setting
 */
async function saveWpmSetting(): Promise<void> {
    clearError();

    try {
        const wpm = parseInt(wpmInput.value, 10);
        
        // Validate input
        if (isNaN(wpm) || wpm < 50 || wpm > 1000) {
            showError('Please enter a value between 50 and 1000');
            return;
        }

        await chrome.storage.sync.set({ wordsPerMinute: wpm });
        
        // Show success feedback
        if (saveWpmBtn) {
            const originalText = saveWpmBtn.textContent;
            saveWpmBtn.textContent = '✓ Saved';
            saveWpmBtn.style.opacity = '0.8';
            setTimeout(() => {
                saveWpmBtn.textContent = originalText;
                saveWpmBtn.style.opacity = '1';
            }, 1500);
        }
        
        // Re-analyze if stats are already shown
        if (wordCountEl && wordCountEl.textContent !== '-') {
            analyzeCurrentPage();
        }
    } catch (error) {
        console.error('Error saving WPM setting:', error);
        showError('Error saving setting');
    }
}

// Load stats and settings when popup opens
window.addEventListener('load', () => {
    loadWpmSetting();
    analyzeCurrentPage();
});
