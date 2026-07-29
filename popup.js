const toggle = document.getElementById("toggle");
const commentModeBtn = document.getElementById("commentModeBtn");

function renderCommentMode(mode) {
    if (mode === "remove") {
        commentModeBtn.textContent = "Remove Verified Comments";
        commentModeBtn.className = "remove";
    } else {
        commentModeBtn.textContent = "Push Comments";
        commentModeBtn.className = "push";
    }
}

chrome.storage.local.get({ enabled: true, commentMode: "push" }, result => {
    toggle.checked = result.enabled;
    renderCommentMode(result.commentMode);
});

toggle.addEventListener("change", () => {
    chrome.storage.local.set({ enabled: toggle.checked });
});

commentModeBtn.addEventListener("click", () => {
    chrome.storage.local.get({ commentMode: "push" }, result => {
        const next = result.commentMode === "push" ? "remove" : "push";
        chrome.storage.local.set({ commentMode: next });
        renderCommentMode(next);
    });
});
