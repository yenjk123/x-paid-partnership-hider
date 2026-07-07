(() => {
  "use strict";

  // Set to true while developing locally if you want console messages.
  // Leave false for normal use so the extension does not log page content.
  const DEBUG = false;

  const PROCESSED_ATTRIBUTE = "data-paid-partnership-hider-processed";
  const MATCHED_ATTRIBUTE = "data-paid-partnership-hider-matched";
  const HIDDEN_ATTRIBUTE = "data-paid-partnership-hider-hidden";
  const ENABLED_STORAGE_KEY = "enabled";
  const SCAN_DELAY_MS = 150;
  const MAX_ADJACENT_THREAD_CELLS = 3;

  const PAID_PARTNERSHIP_PATTERNS = [
    /paid\s+partnership/i,
    /\u043f\u043b\u0430\u0442\u043d(?:\u043e\u0435|\u0430\u044f)\s+\u043f\u0430\u0440\u0442\u043d[\u0435\u0451]\u0440\u0441\u0442\u0432[\u043e\u0430]/i,
    /colaboraci[o\u00f3]n\s+pagada/i,
    /colabora[c\u00e7][a\u00e3]o\s+paga/i,
    /parceria\s+paga/i,
    /partenariat\s+(?:r[e\u00e9]mun[e\u00e9]r[e\u00e9]|payant|sponsoris[e\u00e9])/i,
    /bezahlte\s+partnerschaft/i,
    /collaborazione\s+a\s+pagamento/i,
    /partnership\s+a\s+pagamento/i,
    /betaald\s+partnerschap/i,
    /p[l\u0142]atne\s+partnerstwo/i,
    /[u\u00fc]cretli\s+ortakl[i\u0131]k/i,
    /kemitraan\s+berbayar/i,
    /\u6709\u6599\s*\u30d1\u30fc\u30c8\u30ca\u30fc\u30b7\u30c3\u30d7/i,
    /\uc720\ub8cc\s*\ud30c\ud2b8\ub108\uc2ed/i,
    /\u4ed8\u8d39\s*\u5408\u4f5c/i,
    /\u4ed8\u8cbb\s*\u5408\u4f5c/i,
    /\u0634\u0631\u0627\u0643\u0629\s+\u0645\u062f\u0641\u0648\u0639\u0629/i,
    /\u092a\u0947\u0921\s+\u092a\u093e\u0930\u094d\u091f\u0928\u0930\u0936\u093f\u092a/i,
    /\u0e1e\u0e32\u0e23\u0e4c\u0e17\u0e40\u0e19\u0e2d\u0e23\u0e4c\u0e0a\u0e34\u0e1b\u0e41\u0e1a\u0e1a\u0e0a\u0e33\u0e23\u0e30\u0e40\u0e07\u0e34\u0e19/i
  ];

  let scanTimer = null;
  let isEnabled = true;

  function debugLog(message) {
    if (DEBUG) {
      console.debug("[X Paid Partnership Hider]", message);
    }
  }

  function getCandidatePostContainers(root = document) {
    const candidates = new Set();

    root.querySelectorAll?.("article").forEach((article) => {
      candidates.add(article);
    });

    root
      .querySelectorAll?.(
        [
          '[data-testid="tweet"]',
          '[data-testid="cellInnerDiv"] article',
          '[aria-label*="Timeline"] article',
          '[role="article"]'
        ].join(",")
      )
      .forEach((element) => {
        const article = element.closest("article");
        candidates.add(article || element);
      });

    return candidates;
  }

  function hideIfPaidPartnershipPost(container) {
    if (!container || container.nodeType !== Node.ELEMENT_NODE || !isEnabled) {
      return;
    }

    if (container.getAttribute(PROCESSED_ATTRIBUTE) === "true") {
      return;
    }

    container.setAttribute(PROCESSED_ATTRIBUTE, "true");

    if (isPaidPartnershipText(container.innerText || "")) {
      getHideTargetsForPost(container).forEach(hideTarget);
      debugLog("Hid a paid partnership post or thread.");
    }
  }

  function hideTarget(target) {
    target.setAttribute(MATCHED_ATTRIBUTE, "true");
    target.setAttribute(HIDDEN_ATTRIBUTE, "true");
  }

  function isPaidPartnershipText(text) {
    return PAID_PARTNERSHIP_PATTERNS.some((pattern) => pattern.test(text));
  }

  function getHideTargetsForPost(container) {
    const currentCell = container.closest('[data-testid="cellInnerDiv"]');

    if (!currentCell) {
      return [container];
    }

    const authorKey = getPostAuthorKey(container);
    const targets = new Set([currentCell]);

    collectAdjacentThreadCells(currentCell, "previousElementSibling", authorKey, targets);
    collectAdjacentThreadCells(currentCell, "nextElementSibling", authorKey, targets);

    return Array.from(targets);
  }

  function collectAdjacentThreadCells(startCell, direction, authorKey, targets) {
    let previousCell = startCell;
    let nextCell = startCell[direction];
    let checkedCells = 0;

    while (nextCell && checkedCells < MAX_ADJACENT_THREAD_CELLS) {
      checkedCells += 1;

      if (
        !isSameAuthorPostCell(nextCell, authorKey) ||
        !areCellsVisuallyThreadConnected(previousCell, nextCell)
      ) {
        break;
      }

      targets.add(nextCell);
      previousCell = nextCell;
      nextCell = nextCell[direction];
    }
  }

  function isSameAuthorPostCell(cell, authorKey) {
    if (!cell.matches?.('[data-testid="cellInnerDiv"]')) {
      return false;
    }

    const article = cell.querySelector("article");
    return authorKey !== null && article && getPostAuthorKey(article) === authorKey;
  }

  function areCellsVisuallyThreadConnected(firstCell, secondCell) {
    return hasThreadConnector(firstCell) || hasThreadConnector(secondCell);
  }

  function hasThreadConnector(cell) {
    const article = cell.querySelector("article");
    const avatarRect = getAvatarRect(article);

    if (!avatarRect) {
      return false;
    }

    const avatarCenterX = avatarRect.left + avatarRect.width / 2;
    const avatarBottom = avatarRect.bottom;

    for (const element of cell.querySelectorAll("div, span")) {
      const rect = element.getBoundingClientRect();

      if (
        rect.width >= 1 &&
        rect.width <= 4 &&
        rect.height >= 24 &&
        Math.abs((rect.left + rect.width / 2) - avatarCenterX) <= 12 &&
        rect.top >= avatarBottom - 4 &&
        hasVisibleBackground(element)
      ) {
        return true;
      }
    }

    return false;
  }

  function getAvatarRect(article) {
    if (!article) {
      return null;
    }

    const avatar =
      article.querySelector('[data-testid*="UserAvatar"] img') ||
      article.querySelector('img[src*="profile_images"]') ||
      article.querySelector('img[alt][draggable="true"]');

    if (!avatar) {
      return null;
    }

    const rect = avatar.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 ? rect : null;
  }

  function hasVisibleBackground(element) {
    const backgroundColor = window.getComputedStyle(element).backgroundColor;
    return backgroundColor !== "transparent" && backgroundColor !== "rgba(0, 0, 0, 0)";
  }

  function getPostAuthorKey(container) {
    const ignoredPaths = new Set([
      "compose",
      "explore",
      "hashtag",
      "home",
      "i",
      "messages",
      "notifications",
      "search",
      "settings"
    ]);

    for (const link of container.querySelectorAll?.("a[href]") || []) {
      const href = link.getAttribute("href") || "";
      const match = href.match(/^(?:https?:\/\/(?:x|twitter)\.com)?\/([^/?#]+)(?:[/?#]|$)/i);

      if (!match) {
        continue;
      }

      const path = match[1].toLowerCase();

      if (!ignoredPaths.has(path)) {
        return path;
      }
    }

    return null;
  }

  function scanForPaidPartnershipPosts(root = document) {
    if (!isEnabled) {
      return;
    }

    getCandidatePostContainers(root).forEach(hideIfPaidPartnershipPost);
  }

  function setHiddenStateForMatchedPosts(shouldHide) {
    document
      .querySelectorAll(`[${MATCHED_ATTRIBUTE}="true"]`)
      .forEach((container) => {
        if (shouldHide) {
          container.setAttribute(HIDDEN_ATTRIBUTE, "true");
        } else {
          container.removeAttribute(HIDDEN_ATTRIBUTE);
        }
      });
  }

  function applyEnabledState(nextEnabled) {
    isEnabled = Boolean(nextEnabled);

    if (isEnabled) {
      setHiddenStateForMatchedPosts(true);
      scheduleScan();
      debugLog("Extension enabled.");
      return;
    }

    if (scanTimer !== null) {
      window.clearTimeout(scanTimer);
      scanTimer = null;
    }

    setHiddenStateForMatchedPosts(false);
    debugLog("Extension disabled.");
  }

  function loadEnabledState(callback) {
    if (typeof chrome === "undefined" || !chrome.storage?.local) {
      callback(true);
      return;
    }

    chrome.storage.local.get({ [ENABLED_STORAGE_KEY]: true }, (result) => {
      callback(result[ENABLED_STORAGE_KEY] !== false);
    });
  }

  function watchEnabledState() {
    if (typeof chrome === "undefined" || !chrome.storage?.onChanged) {
      return;
    }

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local" || !changes[ENABLED_STORAGE_KEY]) {
        return;
      }

      applyEnabledState(changes[ENABLED_STORAGE_KEY].newValue !== false);
    });
  }

  function scheduleScan(root = document) {
    if (scanTimer !== null) {
      window.clearTimeout(scanTimer);
    }

    scanTimer = window.setTimeout(() => {
      scanTimer = null;
      scanForPaidPartnershipPosts(root);
    }, SCAN_DELAY_MS);
  }

  function observeTimelineChanges() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          scheduleScan();
          return;
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    debugLog("MutationObserver started.");
  }

  function start() {
    loadEnabledState((enabled) => {
      applyEnabledState(enabled);
      watchEnabledState();
    });

    if (document.body) {
      observeTimelineChanges();
      return;
    }

    document.addEventListener(
      "DOMContentLoaded",
      () => {
        scanForPaidPartnershipPosts();
        observeTimelineChanges();
      },
      { once: true }
    );
  }

  start();
})();
