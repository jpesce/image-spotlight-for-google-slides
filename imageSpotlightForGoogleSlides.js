// ===== iframe Observer =====
let iframeAlreadyDetected = false;


const iframeObserver = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (node.tagName === 'IFRAME' && node.className.includes('docs-texteventtarget-iframe')) {
                if(iframeAlreadyDetected) {
                    return;
                }
                log('Target iframe detected');
                iframeAlreadyDetected = true;

                const targetIframe = node;
                log('└─ iframe:', targetIframe);
                
                setupEventListeners(targetIframe);
                
                // Stop observing after attaching listeners
                iframeObserver.disconnect();
                log('Stopped observing for iframes after attatching listeners');
            }
        });
    });
});

// ===== Event Handlers =====
// Add event listeners to the document and the iframe content window, we need to add them both so the keypresses are always detected, even if the iframe is not focused
function setupEventListeners(targetIframe) {
    document.addEventListener('keydown', (event) => handleKeypresses(event, "document"));
    targetIframe?.contentWindow?.addEventListener('keydown', (event) => handleKeypresses(event, "iframe content window"));
}

// The actual keypress handler
let lastKeypressTime = 0;
const DEBOUNCE_DELAY = 250; // 0.25 seconds in milliseconds

function handleKeypresses(event, source) {
    const currentTime = Date.now();
    if (currentTime - lastKeypressTime < DEBOUNCE_DELAY) {
        log("Ignoring rapid keypress");
        return;
    }
    lastKeypressTime = currentTime;

    log("Key pressed");
    log("├─ Event:", event);
    log("└─ Source:", source);

    // Spacebar toggles zoom
    if (event.key === ' ') {
        const workspace = document.querySelector('#workspace');
        if (!workspace) return;

        // Find path with specific stroke color
        const selectedPath = workspace.querySelector('path[stroke="#8ab4f8"]');
        if (!selectedPath) return;

        // Traverse up until we find an element with id starting with 'editor-'
        let currentElement = selectedPath.parentElement;
        while (currentElement && !currentElement.id?.startsWith('editor-')) {
            currentElement = currentElement.parentElement;
        }

        if (!currentElement) return;

        // Find image element within the editor element
        const imageElement = currentElement.querySelector('image');

        // If an image is found, zoom it
        if (imageElement) {
            imageZoom.imageElement = imageElement;
            imageZoom.toggleZoom();
        }
    } 
    // Escape unzooms
    else if (event.key === 'Escape' && imageZoom.isZoomed) {
        imageZoom.unzoom();
    }
}

// ===== Initialization =====
function initializeZoomFeature() {
    // If the target iframe is found immediately, setup the keyboard listener
    const targetIframe = document.querySelector('iframe.docs-texteventtarget-iframe');
    if (targetIframe) {
        log('Found target iframe immediately');
        setupEventListeners(targetIframe);
    } 
    // Otherwise, observe the document for the target iframe
    else {
        iframeObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
}

// Wait for options to be loaded before starting
optionsInitPromise.then(() => {
    // Initialize the zoom feature
    initializeZoomFeature();
}); 