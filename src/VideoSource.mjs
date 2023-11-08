import { Monitor } from "./custom_elements/Monitor.mjs";

export class VideoSource {
    #sourceElement;
    #hiddenCanvas;
    #eventListeners;

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
        
        // === A hidden canvas to get the pixel data from the video source ===
        this.#hiddenCanvas = document.createElement("canvas");
        this.#hiddenCanvas.width = this.#sourceElement.scrollWidth;
        this.#hiddenCanvas.height = this.#sourceElement.scrollHeight;

        this.#eventListeners = {
            "frame": {}
        }

        requestAnimationFrame(() => this.readSourcePixels());
    }

    readSourcePixels() {
        const hiddenCtx = this.#hiddenCanvas.getContext("2d", { colorSpace: this.colorSpace });
        hiddenCtx.drawImage(this.#sourceElement, 0, 0, this.#sourceElement.scrollWidth, this.#sourceElement.scrollHeight);
        const imgData = hiddenCtx.getImageData(0, 0, this.#sourceElement.scrollWidth, this.#sourceElement.scrollHeight);

        this.callEventListeners("frame", [imgData]);

        requestAnimationFrame(() => this.readSourcePixels());
    }

    callEventListeners(eventName, args) {
        for (const listenerKey of Object.getOwnPropertySymbols(this.#eventListeners[eventName])) {
            const listener = this.#eventListeners[eventName][listenerKey];
            listener(eventName, ...args);
        }
    }

    addEventListener(eventName, callback) {
        const listenerHandle = Symbol();
        this.#eventListeners[eventName][listenerHandle] = callback;

        return listenerHandle;
    }

    removeEventListener(eventName, listenerHandle) {
        delete this.#eventListeners[eventName][listenerHandle];
    }
}