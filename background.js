/**
 * Olivia - AI Study Assistant
 * Background Service Worker
 * 
 * Handles right-click context menu creation and saving selected text
 * directly to chrome.storage.local.
 */

// Helper to format date cleanly (e.g. "Oct 29, 3:45 PM")
function formatCurrentDate() {
  const now = new Date();
  const datePart = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
  const timePart = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  return `${datePart}, ${timePart}`;
}

// 1. Setup the Context Menu when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  // Remove existing menu items first to avoid duplicate ID errors on reload
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'save-to-olivia',
      title: 'Save to Olivia ("%s")',
      contexts: ['selection'] // Only show when user highlights/selects text
    });
  });

  // Ensure olivia_notes is initialized without seeding fake or unwanted notes
  chrome.storage.local.get(['olivia_notes'], (result) => {
    if (!result.olivia_notes) {
      chrome.storage.local.set({ olivia_notes: [] });
    }
  });
});

// 2. Listen for when user clicks the right-click menu item
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'save-to-olivia' && info.selectionText) {
    const selectedText = info.selectionText.trim();
    if (!selectedText) return;

    // Build the note object with all required metadata
    const newNote = {
      id: 'note-' + Date.now(),
      title: (tab && tab.title) ? tab.title : 'Saved Web Note',
      content: selectedText,
      url: info.pageUrl || (tab && tab.url) || '',
      tag: 'WebClip',
      date: formatCurrentDate()
    };

    // Save directly to user's saved notes in chrome.storage.local
    chrome.storage.local.get(['olivia_notes'], (result) => {
      const currentNotes = result.olivia_notes || [];
      const updatedNotes = [newNote, ...currentNotes];

      chrome.storage.local.set({ olivia_notes: updatedNotes }, () => {
        // Flash a quick checkmark badge on the extension icon for visual confirmation
        showSavedConfirmation();
      });
    });
  }
});

// Show a sleek confirmation badge on the toolbar icon (e.g., "✓" in purple for 2.5 seconds)
function showSavedConfirmation() {
  chrome.action.setBadgeBackgroundColor({ color: '#8b5cf6' }); // Purple accent
  chrome.action.setBadgeText({ text: '✓' });

  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' });
  }, 2500);
}
