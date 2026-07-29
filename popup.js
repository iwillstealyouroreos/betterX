const toggle = document.getElementById("toggle");

chrome.storage.local.get({ enabled: true }, result => {
    toggle.checked = result.enabled;
});

toggle.addEventListener("change", () => {
    chrome.storage.local.set({ enabled: toggle.checked });
});
