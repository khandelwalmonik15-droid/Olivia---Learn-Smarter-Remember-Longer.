/**
 * Olivia - AI Study Assistant
 * Content Script — Floating Widget
 *
 * Injects a fixed, circular Olivia button into every supported webpage.
 * Clicking it opens a compact popup menu with study actions.
 *
 * Uses Shadow DOM so the widget's styles are fully isolated from the host page.
 * Does NOT touch chrome.storage directly — all state lives in the DOM only.
 * Does NOT break the existing right-click "Save to Olivia" context-menu feature.
 *
 * Action logic is NOT implemented yet — each menu item dispatches a named
 * custom event that future code can listen for.
 */

(function () {
  'use strict';

  // ── Guard: only inject once per page (handles SPAs that re-run content scripts) ──
  if (document.getElementById('olivia-widget-host')) return;

  // ── 1. Create the shadow host element ────────────────────────────────────────
  const host = document.createElement('div');
  host.id = 'olivia-widget-host';
  // content.css positions the host; styles inside are in the shadow root below.
  document.documentElement.appendChild(host);

  // ── 2. Attach a Shadow Root (closed → page JS cannot access our internals) ──
  const shadow = host.attachShadow({ mode: 'closed' });

  // ── 3. Shadow-root styles (fully isolated from the host page) ────────────────
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    /* ── Reset inside shadow root ── */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

    /* ── Floating trigger button ── */
    #olivia-fab {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow:
        0 4px 14px rgba(139, 92, 246, 0.5),
        0 2px 6px rgba(0, 0, 0, 0.35);
      transition: transform 0.18s ease, box-shadow 0.18s ease;
      position: relative;
      outline: none;
      -webkit-tap-highlight-color: transparent;
    }

    #olivia-fab:hover {
      transform: scale(1.08);
      box-shadow:
        0 6px 20px rgba(139, 92, 246, 0.65),
        0 3px 8px rgba(0, 0, 0, 0.4);
    }

    #olivia-fab:active {
      transform: scale(0.95);
    }

    /* Active state — rotates icon slightly when menu is open */
    #olivia-fab.is-open {
      box-shadow:
        0 6px 22px rgba(139, 92, 246, 0.75),
        0 3px 8px rgba(0, 0, 0, 0.4);
    }

    #olivia-fab svg {
      width: 26px;
      height: 26px;
      color: #fff;
      flex-shrink: 0;
      transition: transform 0.22s ease;
    }

    #olivia-fab.is-open svg {
      transform: rotate(20deg);
    }

    /* Tooltip label shown on hover (not when menu is open) */
    #olivia-fab::after {
      content: 'Olivia';
      position: absolute;
      right: calc(100% + 10px);
      top: 50%;
      transform: translateY(-50%);
      background: rgba(15, 20, 35, 0.92);
      color: #f8fafc;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 9px;
      border-radius: 8px;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.15s ease;
      border: 1px solid rgba(139, 92, 246, 0.35);
    }

    #olivia-fab:hover:not(.is-open)::after {
      opacity: 1;
    }

    /* ── Popup menu card ── */
    #olivia-menu {
      position: absolute;
      bottom: calc(100% + 10px);  /* floats above the FAB */
      right: 0;
      width: 210px;
      background: #131927;
      border: 1px solid rgba(139, 92, 246, 0.28);
      border-radius: 14px;
      box-shadow:
        0 8px 32px rgba(0, 0, 0, 0.55),
        0 2px 8px rgba(139, 92, 246, 0.2);
      overflow: hidden;

      /* Hidden by default */
      opacity: 0;
      transform: translateY(8px) scale(0.97);
      pointer-events: none;
      transition: opacity 0.18s ease, transform 0.18s ease;
    }

    #olivia-menu.is-open {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }

    /* Menu header */
    .olivia-menu-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 11px 14px 9px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }

    .olivia-menu-header-avatar {
      width: 26px;
      height: 26px;
      border-radius: 8px;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .olivia-menu-header-avatar svg {
      width: 14px;
      height: 14px;
      color: #fff;
    }

    .olivia-menu-header-text {
      display: flex;
      flex-direction: column;
    }

    .olivia-menu-title {
      font-size: 13px;
      font-weight: 700;
      color: #f8fafc;
      line-height: 1.2;
    }

    .olivia-menu-sub {
      font-size: 10px;
      color: #64748b;
      line-height: 1.2;
    }

    /* Menu items list */
    .olivia-menu-list {
      list-style: none;
      padding: 6px 0;
    }

    .olivia-menu-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 14px;
      cursor: pointer;
      color: #cbd5e1;
      font-size: 12.5px;
      font-weight: 500;
      transition: background 0.13s ease, color 0.13s ease;
      user-select: none;
    }

    .olivia-menu-item:hover {
      background: rgba(139, 92, 246, 0.12);
      color: #f8fafc;
    }

    .olivia-menu-item:active {
      background: rgba(139, 92, 246, 0.22);
    }

    .olivia-menu-item svg {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      color: #8b5cf6;
      transition: color 0.13s ease;
    }

    .olivia-menu-item:hover svg {
      color: #c084fc;
    }

    /* Divider between item groups */
    .olivia-menu-divider {
      height: 1px;
      background: rgba(255,255,255,0.06);
      margin: 4px 0;
    }

    /* "Selected text" indicator — shown when user has text selected */
    .olivia-selection-hint {
      display: none;        /* hidden by default; shown via JS */
      align-items: center;
      gap: 6px;
      margin: 0 10px 6px;
      padding: 5px 8px;
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: 7px;
      font-size: 10.5px;
      color: #93c5fd;
    }

    .olivia-selection-hint.has-selection {
      display: flex;
    }

    .olivia-selection-hint svg {
      width: 12px;
      height: 12px;
      color: #60a5fa;
      flex-shrink: 0;
    }
  `;
  shadow.appendChild(styleEl);

  // ── 4. Build the wrapper (positions relative so menu can float above) ────────
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position: relative; display: inline-block;';

  // ── 5. Build the popup menu ───────────────────────────────────────────────────
  const menu = document.createElement('div');
  menu.id = 'olivia-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', 'Olivia study actions');

  menu.innerHTML = `
    <!-- Header -->
    <div class="olivia-menu-header">
      <div class="olivia-menu-header-avatar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          <circle cx="12" cy="12" r="4" fill="currentColor" fill-opacity="0.2"/>
        </svg>
      </div>
      <div class="olivia-menu-header-text">
        <span class="olivia-menu-title">Olivia</span>
        <span class="olivia-menu-sub">Study Assistant · Team Oggy</span>
      </div>
    </div>

    <!-- Selection hint (shown when page text is selected) -->
    <div class="olivia-selection-hint" id="olivia-sel-hint">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="9 11 12 14 22 4"/>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
      <span id="olivia-sel-label">Text selected</span>
    </div>

    <!-- Action items -->
    <ul class="olivia-menu-list" role="none">
      <li class="olivia-menu-item" data-action="save-page" role="menuitem" tabindex="0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17 21 17 13 7 13 7 21"/>
          <polyline points="7 3 7 8 15 8"/>
        </svg>
        Save Page
      </li>
      <li class="olivia-menu-item" data-action="save-selection" role="menuitem" tabindex="0" id="olivia-save-sel-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
        Save Selected Text
      </li>

      <li class="olivia-menu-divider" role="separator"></li>

      <li class="olivia-menu-item" data-action="summarize" role="menuitem" tabindex="0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="8" y1="6" x2="21" y2="6"/>
          <line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6" x2="3.01" y2="6"/>
          <line x1="3" y1="12" x2="3.01" y2="12"/>
          <line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
        Summarize Page
      </li>
      <li class="olivia-menu-item" data-action="flashcards" role="menuitem" tabindex="0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
        </svg>
        Create Flashcards
      </li>
      <li class="olivia-menu-item" data-action="quiz" role="menuitem" tabindex="0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        Generate Quiz
      </li>
    </ul>
  `;

  // ── 6. Build the FAB (Floating Action Button) ────────────────────────────────
  const fab = document.createElement('button');
  fab.id = 'olivia-fab';
  fab.setAttribute('aria-label', 'Open Olivia study assistant');
  fab.setAttribute('aria-expanded', 'false');
  fab.setAttribute('aria-haspopup', 'true');
  fab.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      <circle cx="12" cy="12" r="4" fill="currentColor" fill-opacity="0.25"/>
    </svg>
  `;

  // ── 7. Assemble the shadow tree ───────────────────────────────────────────────
  wrapper.appendChild(menu);
  wrapper.appendChild(fab);
  shadow.appendChild(wrapper);

  // ── 8. State ─────────────────────────────────────────────────────────────────
  let menuOpen = false;
  // Store the selection captured at the moment the FAB is clicked,
  // so "Save Selected Text" uses the real selection even if it blurs.
  let capturedSelection = '';

  const selHint = shadow.getElementById('olivia-sel-hint');
  const selLabel = shadow.getElementById('olivia-sel-label');

  // ── 9. Toggle menu open/closed ───────────────────────────────────────────────
  function openMenu() {
    menuOpen = true;

    // Capture any active selection NOW, before the click moves focus
    const sel = window.getSelection();
    capturedSelection = (sel && sel.toString().trim()) ? sel.toString().trim() : '';

    // Show or hide the selection hint
    if (capturedSelection) {
      const preview = capturedSelection.length > 28
        ? capturedSelection.substring(0, 26) + '…'
        : capturedSelection;
      selLabel.textContent = `"${preview}"`;
      selHint.classList.add('has-selection');
    } else {
      selHint.classList.remove('has-selection');
    }

    menu.classList.add('is-open');
    fab.classList.add('is-open');
    fab.setAttribute('aria-expanded', 'true');

    // Focus first menu item for accessibility
    const firstItem = menu.querySelector('.olivia-menu-item');
    if (firstItem) firstItem.focus();
  }

  function closeMenu() {
    menuOpen = false;
    menu.classList.remove('is-open');
    fab.classList.remove('is-open');
    fab.setAttribute('aria-expanded', 'false');
  }

  // ── 10. FAB click ─────────────────────────────────────────────────────────────
  fab.addEventListener('click', (e) => {
    e.stopPropagation();
    if (menuOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  // ── 11. Close when clicking OUTSIDE the shadow host ─────────────────────────
  // We listen on the document. Clicks inside the shadow don't bubble to document
  // with a path that reaches the host, so we compare composedPath().
  document.addEventListener('click', (e) => {
    if (!menuOpen) return;
    // composedPath() crosses shadow boundaries — check if host is in the path
    const path = e.composedPath();
    if (!path.includes(host)) {
      closeMenu();
    }
  }, true /* capture phase — before any stopPropagation */);

  // ── 12. Close on Escape key ──────────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuOpen) {
      closeMenu();
      fab.focus();
    }
  });

  // ── 13. Keyboard navigation within the menu ──────────────────────────────────
  menu.addEventListener('keydown', (e) => {
    const items = Array.from(menu.querySelectorAll('.olivia-menu-item'));
    const current = shadow.activeElement || document.activeElement;
    const idx = items.indexOf(current);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = items[(idx + 1) % items.length];
      if (next) next.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = items[(idx - 1 + items.length) % items.length];
      if (prev) prev.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (current && current.dataset.action) {
        dispatchAction(current.dataset.action);
      }
    }
  });

  // ── 14. Menu item clicks ─────────────────────────────────────────────────────
  menu.addEventListener('click', (e) => {
    const item = e.target.closest('.olivia-menu-item');
    if (!item) return;
    e.stopPropagation();
    dispatchAction(item.dataset.action);
  });

  // ── 15. Action dispatcher ────────────────────────────────────────────────────
  // Dispatches a custom event on the document so future code can implement
  // action logic by listening for 'olivia:action' without touching this file.
  // Also closes the menu after every action.
  function dispatchAction(actionName) {
    if (!actionName) return;
    closeMenu();

    // Attach the captured selection so action handlers can use it
    const event = new CustomEvent('olivia:action', {
      bubbles: true,
      composed: true,   // crosses shadow boundaries
      detail: {
        action: actionName,
        selectedText: capturedSelection,
        pageUrl: window.location.href,
        pageTitle: document.title
      }
    });
    document.dispatchEvent(event);

    // Temporary: log to console so you can verify each action fires correctly
    // (remove or guard behind a debug flag before production)
    console.log(`[Olivia] Action dispatched: "${actionName}"`, {
      selectedText: capturedSelection ? capturedSelection.substring(0, 60) + '…' : '(none)',
      url: window.location.href
    });
  }

})(); // end IIFE
