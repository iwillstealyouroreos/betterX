if (window.location.pathname.startsWith("/home")) {
    let enabled = true;
    let observer = null;

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

    function startObserving() {
        if (observer) return;
        observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        if (node.matches && node.matches("article")) {
                            hideVerifiedPosts();
                        } else if (node.querySelector) {
                            const nestedArticles = node.querySelectorAll("article");
                            if (nestedArticles.length) hideVerifiedPosts();
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

    function stopObserving() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
    }

    function applyState() {
        if (enabled) {
            hideVerifiedPosts();
            startObserving();
        } else {
            stopObserving();
            showAllPosts();
        }
    }

    chrome.storage.local.get({ enabled: true }, result => {
        enabled = result.enabled;
        applyState();
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes.enabled) {
            enabled = changes.enabled.newValue;
            applyState();
        }
    });
}
