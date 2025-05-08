document.addEventListener('DOMContentLoaded', function() {
  const loggingToggle = document.getElementById('loggingToggle');
  const slider = loggingToggle.nextElementSibling;
  
  // Load the current state
  chrome.storage.local.get(['loggingEnabled'], function(result) {
    // Set the state without animation
    loggingToggle.checked = result.loggingEnabled || false;
    
    // Add transition class after initial render so it doesn't animate on load
    setTimeout(() => {
      slider.classList.add('transition');
    }, 200);
  });

  // Save the state when changed
  loggingToggle.addEventListener('change', function() {
    chrome.storage.local.set({ loggingEnabled: loggingToggle.checked });
  });

  // Logo eyes follow mouse
  // Calculate the radius of the iris movement
  const iris = document.querySelector('.iris');
  const irisX = parseInt(iris.getAttribute('cx'));
  const boundingRect = iris.closest('g').getBBox();
  const radius = (boundingRect.width / 2) - (irisX - boundingRect.x);

  document.addEventListener('mousemove', (e) => {
      document.querySelectorAll('.iris').forEach(iris => {
          const boundingGroup = iris.closest('g');

          const boundingGroupRect = boundingGroup.getBoundingClientRect();
          const centerX = boundingGroupRect.left + (boundingGroupRect.width / 2);
          const centerY = boundingGroupRect.top + (boundingGroupRect.height / 2);

          // Calculate angle between mouse and center
          const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
          
          // Get the group's center and dimensions in SVG coordinates
          const boundingGroupBBox = boundingGroup.getBBox();
          const svgCenterX = boundingGroupBBox.x + (boundingGroupBBox.width / 2);
          const svgCenterY = boundingGroupBBox.y + (boundingGroupBBox.height / 2);
          
          const newX = svgCenterX + Math.cos(angle) * radius;
          const newY = svgCenterY + Math.sin(angle) * radius;
          
          // Update iris position
          iris.setAttribute('cx', newX);
          iris.setAttribute('cy', newY);
      });
  });
}); 