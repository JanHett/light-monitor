export function getPixel(imageData, x, y) {
    const r = imageData.data[y * imageData.width * 4 + x * 4 + 0];
    const g = imageData.data[y * imageData.width * 4 + x * 4 + 1];
    const b = imageData.data[y * imageData.width * 4 + x * 4 + 2];
    const a = imageData.data[y * imageData.width * 4 + x * 4 + 3];

    return [r, g, b, a];
}