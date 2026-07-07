const ENABLED_STORAGE_KEY = "enabled";

const toggle = document.getElementById("enabledToggle");
const statusText = document.getElementById("statusText");

function setStatus(enabled) {
  statusText.textContent = enabled
    ? "Hiding paid partnership posts"
    : "Paused";
}

chrome.storage.local.get({ [ENABLED_STORAGE_KEY]: true }, (result) => {
  const enabled = result[ENABLED_STORAGE_KEY] !== false;
  toggle.checked = enabled;
  setStatus(enabled);
});

toggle.addEventListener("change", () => {
  const enabled = toggle.checked;
  chrome.storage.local.set({ [ENABLED_STORAGE_KEY]: enabled }, () => {
    setStatus(enabled);
  });
});
