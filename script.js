const imageUpload = document.getElementById('imageUpload');
const uploadBtn = document.getElementById('uploadBtn');
const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadBtn');
const originalImage = document.getElementById('originalImage');
const pixelArtCanvas = document.getElementById('pixelArtCanvas');
const ctx = pixelArtCanvas.getContext('2d');

const pixelSize = document.getElementById('pixelSize');
const colorReduction = document.getElementById('colorReduction');
const dithering = document.getElementById('dithering');
const brightness = document.getElementById('brightness');
const contrast = document.getElementById('contrast');

const pixelSizeValue = document.getElementById('pixelSizeValue');
const colorReductionValue = document.getElementById('colorReductionValue');
const brightnessValue = document.getElementById('brightnessValue');
const contrastValue = document.getElementById('contrastValue');

let image = null;

uploadBtn.addEventListener('click', () => {
    imageUpload.click();
});

imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
        image = new Image();
        image.onload = () => {
            originalImage.src = event.target.result;
            generatePixelArt();
        };
        image.src = event.target.result;
    };

    reader.readAsDataURL(file);
});

generateBtn.addEventListener('click', generatePixelArt);

downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'pixel_art.png';
    link.href = pixelArtCanvas.toDataURL();
    link.click();
});

pixelSize.addEventListener('input', updatePixelSizeValue);
colorReduction.addEventListener('input', updateColorReductionValue);
brightness.addEventListener('input', updateBrightnessValue);
contrast.addEventListener('input', updateContrastValue);

function updatePixelSizeValue() {
    pixelSizeValue.textContent = pixelSize.value;
}

function updateColorReductionValue() {
    colorReductionValue.textContent = colorReduction.value;
}

function updateBrightnessValue() {
    brightnessValue.textContent = brightness.value;
}

function updateContrastValue() {
    contrastValue.textContent = contrast.value;
}

function generatePixelArt() {
    if (!image) return;

    const pixelSizeVal = parseInt(pixelSize.value);
    const colorReductionVal = parseInt(colorReduction.value);
    const ditheringVal = dithering.value;
    const brightnessVal = parseInt(brightness.value);
    const contrastVal = parseInt(contrast.value);

    const width = Math.floor(image.width / pixelSizeVal);
    const height = Math.floor(image.height / pixelSizeVal);

    pixelArtCanvas.width = width * pixelSizeVal;
    pixelArtCanvas.height = height * pixelSizeVal;

    ctx.drawImage(image, 0, 0, width, height);
    let imageData = ctx.getImageData(0, 0, width, height);

    // Apply brightness and contrast
    applyBrightnessContrast(imageData, brightnessVal, contrastVal);

    // Apply color reduction
    const palette = generatePalette(colorReductionVal);
    applyColorReduction(imageData, palette, ditheringVal);

    // Scale up the pixel art
    ctx.imageSmoothingEnabled = false;
    ctx.putImageData(imageData, 0, 0);
    ctx.drawImage(pixelArtCanvas, 0, 0, width, height, 0, 0, width * pixelSizeVal, height * pixelSizeVal);
}

function applyBrightnessContrast(imageData, brightness, contrast) {
    const factor = 259 * (contrast + 255) / (255 * (259 - contrast));

    for (let i = 0; i < imageData.data.length; i += 4) {
        for (let j = 0; j < 3; j++) {
            imageData.data[i + j] = truncate(factor * (imageData.data[i + j] - 128 + brightness) + 128);
        }
    }
}

function generatePalette(colorCount) {
    const palette = [];
    for (let r = 0; r < colorCount; r++) {
        for (let g = 0; g < colorCount; g++) {
            for (let b = 0; b < colorCount; b++) {
                palette.push([
                    Math.floor(r * 255 / (colorCount - 1)),
                    Math.floor(g * 255 / (colorCount - 1)),
                    Math.floor(b * 255 / (colorCount - 1))
                ]);
            }
        }
    }
    return palette;
}

function applyColorReduction(imageData, palette, ditheringMethod) {
    const width = imageData.width;
    const height = imageData.height;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const oldColor = [imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]];
            const newColor = findClosestColor(oldColor, palette);

            imageData.data[i] = newColor[0];
            imageData.data[i + 1] = newColor[1];
            imageData.data[i + 2] = newColor[2];

            if (ditheringMethod !== 'none') {
                const error = [
                    oldColor[0] - newColor[0],
                    oldColor[1] - newColor[1],
                    oldColor[2] - newColor[2]
                ];

                if (ditheringMethod === 'floydSteinberg') {
                    applyFloydSteinbergDithering(imageData, x, y, error);
                } else if (ditheringMethod === 'ordered') {
                    applyOrderedDithering(imageData, x, y, error);
                }
            }
        }
    }
}

function findClosestColor(color, palette) {
    let minDistance = Infinity;
    let closestColor = null;

    for (const paletteColor of palette) {
        const distance = colorDistance(color, paletteColor);
        if (distance < minDistance) {
            minDistance = distance;
            closestColor = paletteColor;
        }
    }

    return closestColor;
}

function colorDistance(color1, color2) {
    return Math.sqrt(
        Math.pow(color1[0] - color2[0], 2) +
        Math.pow(color1[1] - color2[1], 2) +
        Math.pow(color1[2] - color2[2], 2)
    );
}

function applyFloydSteinbergDithering(imageData, x, y, error) {
    const width = imageData.width;
    const height = imageData.height;

    const diffuseError = (x, y, factor) => {
        if (x >= 0 && x < width && y >= 0 && y < height) {
            const i = (y * width + x) * 4;
            for (let c = 0; c < 3; c++) {
                imageData.data[i + c] = truncate(imageData.data[i + c] + error[c] * factor);
            }
        }
    };

    diffuseError(x + 1, y, 7 / 16);
    diffuseError(x - 1, y + 1, 3 / 16);
    diffuseError(x, y + 1, 5 / 16);
    diffuseError(x + 1, y + 1, 1 / 16);
}

function applyOrderedDithering(imageData, x, y, error) {
    const matrix = [
        [0, 8, 2, 10],
        [12, 4, 14, 6],
        [3, 11, 1, 9],
        [15, 7, 13, 5]
    ];

    const factor = matrix[y % 4][x % 4] / 16;

    const i = (y * imageData.width + x) * 4;
    for (let c = 0; c < 3; c++) {
        imageData.data[i + c] = truncate(imageData.data[i + c] + error[c] * factor);
    }
}

function truncate(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
}

updatePixelSizeValue();
updateColorReductionValue();
updateBrightnessValue();
updateContrastValue();
