import { VideoSource } from "../../VideoSource.mjs";

export class AbstractScope extends HTMLElement {
    /** @param {VideoSource} videoSource */
    constructor(videoSource) {
        super();
        this.videoSource = videoSource;
        this._keepDrawing = true;

        const animationCb = () => {
            this.drawScope();
            if (this._keepDrawing) requestAnimationFrame(animationCb);
        };
        requestAnimationFrame(animationCb);
    }

    disconnectedCallback() {
        this._keepDrawing = false;
    }
}