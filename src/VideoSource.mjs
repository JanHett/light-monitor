import { Monitor } from "./custom_elements/Monitor.mjs";

/**
 * A wrapper around elements that which can deliver an image feed
 */
export class VideoSource {
    #sourceElement;

    /**
     * 
     * @param {HTMLImageElement | HTMLVideoElement | HTMLCanvasElement} sourceElement 
     * @param {"srgb" | "display-p3"} colorSpace 
     */
    constructor(sourceElement, colorSpace) {
        if (sourceElement instanceof Monitor) {
            sourceElement = sourceElement.canvas;
        }
        if (!(
            sourceElement instanceof HTMLVideoElement
            || sourceElement instanceof HTMLCanvasElement
            || sourceElement instanceof HTMLImageElement
        )) {
            throw TypeError("`scourceElement` must be an <img>, <video> or <canvas> element");
        }
        this.#sourceElement = sourceElement;

        if (!["srgb", "display-p3"].includes(colorSpace)) {
            throw TypeError('`colorSpace` must be either "srgb" or "display-p3"');
        }
        this.colorSpace = colorSpace;
    }

    get textureSource() {
        return this.#sourceElement;
    }
}