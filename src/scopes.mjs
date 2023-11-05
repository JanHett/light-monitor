import { getPixel } from "./util.mjs"

class AbstractScope extends HTMLElement {
    constructor(videoSource) {
        super();

        if (!(
            videoSource instanceof HTMLVideoElement
            || videoSource instanceof HTMLCanvasElement
        )) {
            throw TypeError("`videoSource` must be a <video> or <canvas> element");
        }
        this.videoSource = videoSource;
    }
}

class AbstractWaveformScope extends AbstractScope {
    constructor(videoSource, guidelines = [0.1, 0.8]) {
        super(videoSource);
        this.guidelines = guidelines;
    }

    drawWaveform() {
        this.canvas.width = this.clientWidth;
        this.canvas.height = this.clientHeight;

        this.hiddenCtx.drawImage(this.videoSource, 0, 0, this.videoSource.scrollWidth, this.videoSource.scrollHeight);
        const imgData = this.hiddenCtx.getImageData(0, 0, this.videoSource.scrollWidth, this.videoSource.scrollHeight);
        
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
    
        requestAnimationFrame(() => { if (this.keepDrawing) this.drawWaveform() });
    }

    connectedCallback() {
        const shadow = this.attachShadow({mode: "open"});

        // === The canvas to draw on ===
        this.canvas = document.createElement("canvas");
        this.canvas.classList.add("scope-canvas");

        // === A hidden canvas to get the pixel data from the video source ===
        this.hiddenCanvas = document.createElement("canvas");
        this.hiddenCanvas.width = this.videoSource.scrollWidth;
        this.hiddenCanvas.height = this.videoSource.scrollHeight;
        this.hiddenCtx = this.hiddenCanvas.getContext("2d", { colorSpace: "display-p3" });

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

        this.keepDrawing = true;
        this.drawWaveform();
    }

    disconnectedCallback() {
        this.keepDrawing = false;
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

export class ScopeStack extends HTMLElement {
    static definition = ["scope-stack", ScopeStack];

    constructor(availableScopes = [RGBWaveformScope, LumaWaveformScope]) {
        super();

        this.availableScopes = availableScopes;
    }

    connectedCallback() {
        const shadow = this.attachShadow({ mode: "open" });

        // === Video source ===
        const videoSourceId = this.getAttribute("video-source");
        if (!videoSourceId) throw TypeError("`video-source` must be specified");

        const videoSource = document.getElementById(videoSourceId);
        if (!(
            videoSource instanceof HTMLVideoElement
            || videoSource instanceof HTMLCanvasElement
        )) {
            throw TypeError("`video-source` must refer to a <video> or <canvas> element");
        }
        this.videoSource = videoSource;

        // === The control box ===
        const controls = document.createElement("div");
        controls.classList.add("scope-stack-controls");

        // --- Stack Direction ---
        const stackDirection = document.createElement("select");
        [
            {label: "Horizontal", value: "horizontal"},
            {label: "Vertical", value: "vertical"},
        ].map(option => {
            const optEl = document.createElement("option");
            optEl.textContent = option.label;
            optEl.setAttribute("value", option.value);

            return optEl;
        }).forEach(optEl => {
            stackDirection.options.add(optEl);
        });
        controls.appendChild(stackDirection);

        // --- Add-Scope Buttons ---
        const scopeButtons = document.createElement("div");
        scopeButtons.classList.add("scope-button-container")
        for (const Scope of this.availableScopes) {
            const button = document.createElement("button");
            button.textContent = Scope.scopeName;
            button.addEventListener("click", ev => this.addScopeClicked(ev, Scope));
            scopeButtons.appendChild(button);
        }
        controls.appendChild(scopeButtons);

        // === Container for added scopes ===
        this.scopeContainer = document.createElement("div");
        this.scopeContainer.classList.add("scope-stack-container");

        // === Style ===
        const style = document.createElement("style");
        style.textContent = `
        :host {
            display: flex;
        }

        .scope-stack-controls {
            display: flex;
            flex-direction: column;
            margin-right: 8px;
        }

        .scope-button-container {
            display: flex;
            flex-direction: column;
        }

        .scope-stack-container {
            display: flex;
        }

        .scope-wrapper {
            position: relative;
        }

        .scope-wrapper:not(:last-child) {
            margin-right: 16px;
        }

        .remove-scope {
            position: absolute;
            top: 8px;
            left: 8px;

            background-color: #aa122bcc;
            border: none;
            border-radius: 4px;
            padding: 8px 4px;
        }
        `;

        // === Final Assembly ===
        shadow.appendChild(style);
        shadow.appendChild(controls);
        shadow.appendChild(this.scopeContainer);
    }

    addScopeClicked(event, Scope) {
        const scopeWrapper = document.createElement("div");

        const scope = new Scope(this.videoSource);
        scopeWrapper.classList.add("scope-wrapper");
        scopeWrapper.appendChild(scope);

        const removeScopeBtn = document.createElement("button");
        removeScopeBtn.textContent = "🗑️";
        removeScopeBtn.classList.add("remove-scope");
        removeScopeBtn.addEventListener("click", ev => {
            this.scopeContainer.removeChild(scopeWrapper);
        });
        scopeWrapper.appendChild(removeScopeBtn);

        this.scopeContainer.appendChild(scopeWrapper);

    }
}
