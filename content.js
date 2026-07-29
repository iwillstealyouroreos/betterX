(function () {
    let enabled = true;
    let observer = null;

    function isHomeTimeline() {
        return window.location.pathname === "/home";
    }

    function hideVerifiedPosts() {
        const posts = document.querySelectorAll("article");
        posts.forEach(post => {
            if (post.dataset.betterxChecked) return;
            const verifiedBadge = post.querySelector('svg[aria-label="Verified account"][data-testid="icon-verified"]');
            if (verifiedBadge) {
                post.style.display = "none";
            }
            post.dataset.betterxChecked = "true";
        });
    }

    function showAllPosts() {
        document.querySelectorAll("article").forEach(post => {
            post.style.display = "";
            delete post.dataset.betterxChecked;
        });
    }

    function refresh() {
        if (enabled && isHomeTimeline()) {
            hideVerifiedPosts();
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

    // X is a single-page app: navigating between the home timeline and a
    // profile doesn't reload the page, so pushState/replaceState (which
    // don't fire popstate) need to be patched to detect the route change.
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

    chrome.storage.local.get({ enabled: true }, result => {
        enabled = result.enabled;
        refresh();
        startObserving();
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes.enabled) {
            enabled = changes.enabled.newValue;
            refresh();
        }
    });
})();
