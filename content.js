(function () {
    let enabled = true;
    let commentMode = "push";
    let observer = null;

    function isHomeTimeline() {
        return window.location.pathname === "/home";
    }

    function isPostPage() {
        return /^\/[^/]+\/status\/\d+/.test(window.location.pathname);
    }

    function isVerified(article) {
        return !!article.querySelector('svg[aria-label="Verified account"][data-testid="icon-verified"]');
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

    // On a post page the first article is the tweet being viewed, not a
    // reply, so it's excluded from both the "remove" and "push" handling.
    function applyCommentMode() {
        const comments = Array.from(document.querySelectorAll("article")).slice(1);
        comments.forEach(comment => {
            comment.style.display = "";
        });

        if (commentMode === "remove") {
            comments.forEach(comment => {
                if (isVerified(comment)) {
                    comment.style.display = "none";
                }
            });
            return;
        }

        // "push" mode: leave verified comments visible, but move them after
        // every unverified comment within their shared container.
        const verifiedByParent = new Map();
        comments.forEach(comment => {
            if (!isVerified(comment)) return;
            const cell = comment.closest('div[data-testid="cellInnerDiv"]') || comment.parentElement;
            const parent = cell && cell.parentElement;
            if (!parent) return;
            if (!verifiedByParent.has(parent)) verifiedByParent.set(parent, []);
            verifiedByParent.get(parent).push(cell);
        });

        verifiedByParent.forEach((cells, parent) => {
            // Skip parents where the verified cells are already trailing in
            // the right order, otherwise re-appending them every mutation
            // would itself trigger the observer in an endless loop.
            const tail = Array.from(parent.children).slice(-cells.length);
            const alreadyInPlace = cells.every((cell, i) => tail[i] === cell);
            if (alreadyInPlace) return;
            cells.forEach(cell => parent.appendChild(cell));
        });
    }

    function refresh() {
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
