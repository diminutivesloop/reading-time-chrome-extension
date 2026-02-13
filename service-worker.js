/**
 * Service Worker - background script for Chrome extension
 * Handles extension events and manages state
 */

/**
 * Listen for extension installation
 */
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'INSTALL') {
        console.log('Reading Time extension installed');
    } else if (details.reason === 'UPDATE') {
        console.log('Reading Time extension updated');
    }
});

/**
 * Listen for messages from content scripts or popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Handle different message types here
    if (request.action === 'trackEvent') {
        console.log('Event tracked:', request.data);
    }
    sendResponse({ success: true });
});

/**
 * Listen for tab updates
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        console.log('Tab loaded:', tab.url);
    }
});
