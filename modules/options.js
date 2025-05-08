// Options state
let options = {
  loggingEnabled: false
};

// Promise that resolves when options are loaded
const optionsInitPromise = new Promise((resolve) => {
  chrome.storage.local.get(['loggingEnabled'], function(result) {
    options.loggingEnabled = result.loggingEnabled || false;
    resolve();
  });
});

// Listen for option changes
chrome.storage.onChanged.addListener(function(changes) {
  if (changes.loggingEnabled) {
    options.loggingEnabled = changes.loggingEnabled.newValue;
  }
});