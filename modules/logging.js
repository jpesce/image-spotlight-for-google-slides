// Function to log messages only if logging is enabled
function log(...args) {
  if (options.loggingEnabled) {
    console.log("🟠 Google Slides Image Zoom |", ...args);
  }
}