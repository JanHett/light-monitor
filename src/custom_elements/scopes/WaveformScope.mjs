import { getPixel } from "../../util/util.mjs"

import { AbstractScope } from "./AbstractScope.mjs";

class AbstractWaveformScope extends AbstractScope {
    constructor(videoSource, guidelines = [0.1, 0.8]) {
        super(videoSource);
        this.guidelines = guidelines;
    }

    drawScope(imgData) {
        this.canvas.width = this.clientWidth;
        this.canvas.height = this.clientHeight;

        const ctx = this.canvas.getContext("2d", { colorSpace: "display-p3" });
        
        ctx.fillStyle = "#000"
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        for (let x = 0; x < this.canvas.width; ++x) {
            const relativeX = x / this.canvas.width
            const imgX = Math.round(relativeX * imgData.width);
            for (let y = 0; y < imgData.height; ++y) {
                const [r, g, b] = getPixel(imgData, imgX, y);
                this.drawWaveformDot(x, r, g, b, ctx);
            }
        }

        ctx.fillStyle = "#fffc";
        for (const guideline of this.guidelines) {
            ctx.fillRect(0, (1 - guideline) * this.canvas.height, this.canvas.width, 1);
        }
    }

    connectedCallback() {
        const shadow = this.attachShadow({mode: "open"});

        // === The canvas to draw on ===
        this.canvas = document.createElement("canvas");
        this.canvas.classList.add("scope-canvas");

        // === Style ===
        const style = document.createElement("style");
        style.textContent = `
        :host {
            height: 100%;
            aspect-ratio: 4/3;
            display: block;
            /* border: 1px solid #fff; */
            border-radius: 8px;
            overflow: hidden;
        }
        .scope-canvas {
        }
        `;

        shadow.appendChild(this.canvas);
        shadow.appendChild(style);

        this.canvas.width = this.clientWidth;
        this.canvas.height = this.clientHeight;
    }
}

export class RGBWaveformScope extends AbstractWaveformScope {
    static definition = ["rgb-waveform-scope", RGBWaveformScope];
    static scopeId = "rgb-waveform"
    static scopeName = "RGB Waveform"

    drawWaveformDot(x, r, g, b, waveformCtx) {
        const height = this.canvas.height;
        waveformCtx.fillStyle = "rgba(255, 0, 0, 0.1)";
        waveformCtx.fillRect(x, height - r / 255 * height, 1, 1);
        waveformCtx.fillStyle = "rgba(0, 255, 0, 0.1)";
        waveformCtx.fillRect(x, height - g / 255 * height, 1, 1);
        waveformCtx.fillStyle = "rgba(0, 0, 255, 0.1)";
        waveformCtx.fillRect(x, height - b / 255 * height, 1, 1);
    }
}

export class LumaWaveformScope extends AbstractWaveformScope {
    static definition = ["luma-waveform-scope", LumaWaveformScope];
    static scopeId = "luma-waveform"
    static scopeName = "Luma Waveform"

    drawWaveformDot(x, r, g, b, waveformCtx) {
        const height = this.canvas.height;
        const luma = (r + g + b) / 3 / 255;
        waveformCtx.fillStyle = "rgba(255,255,255, 0.1)";
        waveformCtx.fillRect(x, height - luma * height, 1, 1);
    
    }
}