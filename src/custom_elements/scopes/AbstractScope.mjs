import * as twgl from "../../../external/twgl/dist/5.x/twgl-full.module.js"
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

export class AbstractWebGLScope extends AbstractScope {
    _pixelIdBufferInfo = {length: 0, buffers: {}};
    _ensurePixelIdBuf(gl, sourceImg) {
        const nPixels = sourceImg.width * sourceImg.height;
        if (this._pixelIdBufferInfo.length !== nPixels){
            // create Float32Array with items containing their indeces
            const pixelIds = new Float32Array(nPixels);
            for (let i = 0; i < nPixels; ++i) pixelIds[i] = i;
            this._pixelIdBufferInfo = {
                length: nPixels,
                buffers: twgl.createBufferInfoFromArrays(gl, {
                    pixelId: { size: 1, data: pixelIds },
                })
            };
        }
    }
}