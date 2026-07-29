(function () {
    let enabled = true;
    let commentMode = "push";
    let observer = null;
    let lastPath = null;

    // Verified reply cells that are hidden and waiting to be revealed once
    // no new replies have loaded for a while (see revealQueuedComments).
    let pushQueue = [];
    let settleTimer = null;
    const SETTLE_DELAY_MS = 1200;

    function isHomeTimeline() {
        return window.location.pathname === "/home";
    }

    function isPostPage() {
        return /^\/[^/]+\/status\/\d+/.test(window.location.pathname);
    }

    function isVerified(article) {
        return !!article.querySelector('svg[aria-label="Verified account"][data-testid="icon-verified"]');
    }

    // Replies are wrapped in a virtualized-list cell; hiding/moving that
    // wrapper (rather than just the <article> inside it) avoids leaving
    // behind an empty-looking row.
    function commentCell(article) {
        return article.closest('div[data-testid="cellInnerDiv"]') || article.parentElement;
    }

    function hideVerifiedPosts() {
        document.querySelectorAll("article").forEach(post => {
            post.style.display = isVerified(post) ? "none" : "";
        });
    }

    function showAllPosts() {
        document.querySelectorAll("article").forEach(post => {
            post.style.display = "";
        });
    }

    function resetCommentQueue() {
        clearTimeout(settleTimer);
        settleTimer = null;
        pushQueue = [];
    }

    // "No more comments to load" isn't something we can observe directly,
    // so it's approximated as: no new reply has appeared for SETTLE_DELAY_MS.
    // Every time a new reply shows up the timer restarts; once it fires we
    // treat the current batch as finished loading and reveal the queue.
    function scheduleSettle() {
        clearTimeout(settleTimer);
        settleTimer = setTimeout(revealQueuedComments, SETTLE_DELAY_MS);
    }

    function revealQueuedComments() {
        settleTimer = null;
        if (!pushQueue.length) return;

        const byParent = new Map();
        pushQueue.forEach(({ article, cell }) => {
            const parent = cell.parentElement;
            if (!parent) return;
            if (!byParent.has(parent)) byParent.set(parent, []);
            byParent.get(parent).push({ article, cell });
        });

        byParent.forEach(items => {
            items.forEach(({ article, cell }) => {
                cell.style.display = "";
                cell.parentElement.appendChild(cell);
                article.dataset.betterxCommentState = "visible";
            });
        });
        pushQueue = [];
    }

    // On a post page the first article is the tweet being viewed, not a
    // reply, so it's excluded from both the "remove" and "push" handling.
    function applyCommentMode() {
        const comments = Array.from(document.querySelectorAll("article")).slice(1);

        if (commentMode === "remove") {
            resetCommentQueue();
            comments.forEach(comment => {
                delete comment.dataset.betterxCommentState;
                commentCell(comment).style.display = isVerified(comment) ? "none" : "";
            });
            return;
        }

        // "push" mode: hide verified replies as they load, then reveal them
        // (moved after every unverified reply already loaded) once loading
        // has settled, instead of shuffling them the instant they appear.
        let queuedNew = false;
        comments.forEach(comment => {
            if (comment.dataset.betterxCommentState) return;
            if (!isVerified(comment)) {
                comment.dataset.betterxCommentState = "visible";
                return;
            }
            const cell = commentCell(comment);
            cell.style.display = "none";
            comment.dataset.betterxCommentState = "queued";
            pushQueue.push({ article: comment, cell });
            queuedNew = true;
        });

        if (queuedNew) scheduleSettle();
    }

    function refresh() {
        const path = window.location.pathname;
        if (path !== lastPath) {
            resetCommentQueue();
            lastPath = path;
        }

        if (isHomeTimeline()) {
            if (enabled) {
                hideVerifiedPosts();
            } else {
                showAllPosts();
            }
        } else if (isPostPage()) {
            applyCommentMode();
        } else {
            showAllPosts();
        }
    }

    function startObserving() {
        if (observer) return;
        observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        if (node.matches && node.matches("article")) {
                            refresh();
                        } else if (node.querySelector) {
                            const nestedArticles = node.querySelectorAll("article");
                            if (nestedArticles.length) refresh();
                        }
                    }
                });
            });
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // X is a single-page app: navigating between the home timeline, a post,
    // and a profile doesn't reload the page, so pushState/replaceState
    // (which don't fire popstate) need to be patched to detect route changes.
    ["pushState", "replaceState"].forEach(method => {
        const original = history[method];
        history[method] = function (...args) {
            const result = original.apply(this, args);
            window.dispatchEvent(new Event("betterx:navigation"));
            return result;
        };
    });
    window.addEventListener("popstate", () => window.dispatchEvent(new Event("betterx:navigation")));
    window.addEventListener("betterx:navigation", refresh);

    chrome.storage.local.get({ enabled: true, commentMode: "push" }, result => {
        enabled = result.enabled;
        commentMode = result.commentMode;
        refresh();
        startObserving();
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "local") return;
        if (changes.enabled) enabled = changes.enabled.newValue;
        if (changes.commentMode) commentMode = changes.commentMode.newValue;
        if (changes.enabled || changes.commentMode) refresh();
    });
})();
