// ===== Image Zoom component =====
function createCroppedSvg(imageElement) {
    // Find the SVG
    const svgElement = imageElement.closest('svg');
    if (!svgElement) {
        log('Error: No SVG element found');
        return null;
    }

    // Clone the SVG
    const clonedSvg = svgElement.cloneNode(true);

    // Find the closest parent element with ID starting with "editor-"
    // This is the element that contains the relevant object
    const parentEditorGroup = imageElement.closest('[id^="editor-"]');
    if (!parentEditorGroup) {
        log('Error: No parent editor group found');
        return null;
    }
    
    // Find the first group that Google Slides transforms are applied to
    const firstGroup = clonedSvg.querySelector('g');
    if (!firstGroup) {
        log('Error: No first group found in SVG');
        return null;
    }
    
    // Leave only the parent editor group inside the first group
    firstGroup.innerHTML = '';
    firstGroup.appendChild(parentEditorGroup.cloneNode(true));

    // Create an outer SVG to crop the relevant area
    const outerSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const originalWidth = parseFloat(clonedSvg.getAttribute('width'));
    const originalHeight = parseFloat(clonedSvg.getAttribute('height'));
    
    if (isNaN(originalWidth) || isNaN(originalHeight)) {
        log('Error: Invalid outer SVG dimensions:', { width: originalWidth, height: originalHeight });
        return null;
    }
    
    outerSvg.setAttribute('width', originalWidth + 'px');
    outerSvg.setAttribute('height', originalHeight + 'px');
    outerSvg.setAttribute('viewBox', `0 0 ${originalWidth} ${originalHeight}`);
    outerSvg.setAttribute('xmlns', "http://www.w3.org/2000/svg");
    outerSvg.setAttribute('xmlns:xlink', "http://www.w3.org/1999/xlink");
    outerSvg.classList.add('slides-image-zoom-img');

    // Add the cloned SVG to the outer SVG
    outerSvg.appendChild(clonedSvg);

    // Append the resulting SVG to document to ensure we can get the correct dimensions
    document.body.appendChild(outerSvg);
    
    // Extract the scale value for the first group, where Google Slides transforms are applied
    const currentTransform = firstGroup.getAttribute('transform');
    const scaleMatch = currentTransform.match(/scale\(([^)]+)\)/);
    const scale = scaleMatch ? scaleMatch[1] : '1';

    if (!scaleMatch) {
        log('Warning: No scale found in transform, using default scale of 1');
    }

    // Set new transform with only scale, removing the translation used for positioning the canvas
    firstGroup.setAttribute('transform', `scale(${scale})`);

    // Get the blue path that indicates the selected object
    const clonedBluePath = clonedSvg.querySelector('path[stroke="#8ab4f8"]');
    if (!clonedBluePath) {
        log('Error: No blue selection path found');
        return null;
    }

    // Get the bounding box of the selected object
    const relevantAreaBBox = clonedBluePath.getBBox();
    if (relevantAreaBBox.width === 0 || relevantAreaBBox.height === 0) {
        log('Error: Invalid bounding box dimensions:', relevantAreaBBox);
        return null;
    }

    // Remove the visual selection
    clonedBluePath.remove();

    // Update first group transform with a translation to position the object in the top left corner of the SVG
    firstGroup.setAttribute('transform', `scale(${scale}) translate(${-relevantAreaBBox.x} ${-relevantAreaBBox.y})`);

    // Get cloned SVG viewBox dimensions
    const clonedSvgViewBox = clonedSvg.getAttribute('viewBox');
    let clonedSvgViewBoxWidth = 0;
    let clonedSvgViewBoxHeight = 0;
    if (clonedSvgViewBox) {
        const [x, y, width, height] = clonedSvgViewBox.split(' ').map(Number);
        clonedSvgViewBoxWidth = width;
        clonedSvgViewBoxHeight = height;
    } else {
        log('Warning: No viewBox found in SVG');
    }

    // Update outer SVG width, height and viewBox to crop cloned SVG to the relevant area
    const newWidth = (relevantAreaBBox.width / clonedSvgViewBoxWidth) * parseFloat(scale) * parseFloat(clonedSvg.getAttribute('width'));
    const newHeight = (relevantAreaBBox.height / clonedSvgViewBoxHeight) * parseFloat(scale) * parseFloat(clonedSvg.getAttribute('height'));

    if (isNaN(newWidth) || isNaN(newHeight) || newWidth <= 0 || newHeight <= 0) {
        log('Error: Invalid calculated dimensions:', { width: newWidth, height: newHeight });
        return null;
    }

    outerSvg.setAttribute('width', newWidth + 'px');
    outerSvg.setAttribute('height', newHeight + 'px');
    outerSvg.setAttribute('viewBox', `0 0 ${newWidth} ${newHeight}`);
    
    return outerSvg;
}

class ImageZoom {
    constructor() {
        this.imageElement = null;
        this.isZoomed = false;
    }

    zoom() {
        if(this.imageElement) {
            // Create overlay div
            const zoomContainer = document.createElement('div');
            zoomContainer.className = 'image-zoom-overlay zoom-out-cursor';
            zoomContainer.id = 'image-zoom-overlay';
            
            // Add click listener to unzoom
            zoomContainer.addEventListener('click', () => this.unzoom());

            // Create image element (in case we want to show the original image instead of the cropped SVG)
            // const zoomedImage = document.createElement('img');
            // zoomedImage.src = this.imageElement.href.baseVal;
            // zoomContainer.appendChild(zoomedImage);

            // Add image to overlay
            zoomContainer.appendChild(createCroppedSvg(this.imageElement));
            document.body.appendChild(zoomContainer);
            
            // Trigger reflow to ensure transition works
            zoomContainer.offsetHeight;
            
            // Add visible class to trigger fade in
            zoomContainer.classList.add('visible');
            
            this.isZoomed = true;
            document.addEventListener('keydown', handleKeypresses);
        }
    }

    unzoom() {
        const zoomContainer = document.getElementById('image-zoom-overlay');
        if (zoomContainer) {
            // Remove visible class to trigger fade out
            zoomContainer.classList.remove('visible');
            
            // Wait for transition to complete before removing element
            setTimeout(() => {
                zoomContainer.remove();
                this.isZoomed = false;
                document.removeEventListener('keydown', this.keyboardListener);
            }, 200); // Match the transition duration from CSS
        }
    }

    toggleZoom() {
        if (this.isZoomed) {
            this.unzoom();
        } else {
            this.zoom();
        }
    }
}

// Create a global instance
const imageZoom = new ImageZoom(); 