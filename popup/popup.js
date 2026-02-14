/**
 * Popup script - handles user interaction with the extension popup
 */

const WORDS_PER_MINUTE = 200; // Average reading speed

document.getElementById('analyzeBtn').addEventListener('click', analyzeCurrentPage);

/**
 * Analyze the current page and display statistics
 */
async function analyzeCurrentPage() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        chrome.tabs.sendMessage(tab.id, { action: 'getPageStats' }, (response) => {
            if (response && response.stats) {
                displayStats(response.stats);
            } else {
                showError('Could not analyze page');
            }
        });
    } catch (error) {
        console.error('Error:', error);
        showError('Error analyzing page');
    }
}

/**
 * Display statistics on the popup
 */
function displayStats(stats) {
    const {wordCount } = stats;
    const readingTime = Math.ceil(wordCount / WORDS_PER_MINUTE);
    
    document.getElementById('wordCount').textContent = wordCount.toLocaleString();
    document.getElementById('readingTime').textContent = readingTime === 1 ? '< 1 min' : `${readingTime} min`;
}

/**
 * Show error message
 */
function showError(message) {
    document.getElementById('wordCount').textContent = '-';
    document.getElementById('readingTime').textContent = '-';
    
    const statsDiv = document.getElementById('stats');
    const errorEl = document.createElement('div');
    errorEl.style.color = '#e74c3c';
    errorEl.style.padding = '10px';
    errorEl.textContent = message;
    statsDiv.appendChild(errorEl);
    
    setTimeout(() => errorEl.remove(), 3000);
}

// Load stats when popup opens
window.addEventListener('load', analyzeCurrentPage);
