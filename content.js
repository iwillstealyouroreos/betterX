if (window.location.pathname.startsWith("/home")) {

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

    hideVerifiedPosts();

    const observer = new MutationObserver(mutations => {
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