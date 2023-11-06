import * as twgl from "../external/twgl/dist/5.x/twgl-full.module.js"

import { getPixel, Vec3 } from "./util.mjs"
import { rgbToYCbCr, YCbCrToRGB, GLSL_COLORSPACE_CONVERSION } from "./color_util.mjs";
import { VideoSource } from "./video_source.mjs";

class AbstractScope extends HTMLElement {
    constructor(videoSource) {
        super();
        this.videoSource = videoSource;

        this.frameListener = this.videoSource.addEventListener("frame", (event, imgData) => {
            this.drawScope(imgData)
        });
    }

    disconnectedCallback() {
        this.videoSource.removeEventListener("frame", this.frameListener);
    }
}

export class Vectorscope extends AbstractScope {
    static definition = ["vector-scope", Vectorscope];
    static scopeId = "vectorscope"
    static scopeName = "Vectorscope"

    static RENDERER = "webgl"
    // static RENDERER = "2d"

    static distribution_vs = `
    ${GLSL_COLORSPACE_CONVERSION}

    // -------------------------------------------------------------------------

    attribute float pixelId;
    uniform sampler2D source_img;
    uniform vec2 resolution;

    void main() {
        vec2 pixel = vec2(mod(pixelId, resolution.x), floor(pixelId / resolution.x));
        vec2 uv = (pixel / resolution);

        vec4 pixel_rgb = texture2D(source_img, uv);
        vec2 pixel_CbCr = rgbToYCbCr(pixel_rgb.rgb).yz;

        gl_Position = vec4(pixel_CbCr, 0., 1.);
    }
    `;
    static distribution_fs = `
    precision mediump float;
    void main() {
        gl_FragColor = vec4(1.);
    }
    `;

    static background_vs = `
    attribute vec4 position;

    void main() {
        gl_Position = position;
    }
    `;

    static background_fs = `
    precision mediump float;

    // -------------------------------------------------------------------------

    float sdCircle(vec2 p, float r)
    {
        return length(p) - r;
    }

    float opOnion(in float sd, in float r)
    {
    return abs(sd) - r;
    }

    ${GLSL_COLORSPACE_CONVERSION}

    // -------------------------------------------------------------------------

    uniform sampler2D source_img;
    uniform vec2 resolution;

    void main() {
        vec2 CbCr = (gl_FragCoord.xy / resolution) - vec2(0.5, 0.5);
        //gl_FragColor = texture2D(source_img, CbCr);

        gl_FragColor = vec4(YCbCrToRGB(vec3(0.5, CbCr)), 1.);
        
        // markers
        vec2 safe_r = rgbToYCbCr(vec3(0.75, 0, 0)).yz;
        vec2 safe_g = rgbToYCbCr(vec3(0, 0.75, 0)).yz;
        vec2 safe_b = rgbToYCbCr(vec3(0, 0, 0.75)).yz;
        vec2 safe_c = rgbToYCbCr(vec3(0, 0.75, 0.75)).yz;
        vec2 safe_m = rgbToYCbCr(vec3(0.75, 0, 0.75)).yz;
        vec2 safe_y = rgbToYCbCr(vec3(0.75, 0.75, 0)).yz;

        if (opOnion(sdCircle(CbCr - safe_r, 0.02), 0.004) < 0.) {
            gl_FragColor = vec4(1.);
        }
        if (opOnion(sdCircle(CbCr - safe_g, 0.02), 0.004) < 0.) {
            gl_FragColor = vec4(1.);
        }
        if (opOnion(sdCircle(CbCr - safe_b, 0.02), 0.004) < 0.) {
            gl_FragColor = vec4(1.);
        }
        if (opOnion(sdCircle(CbCr - safe_c, 0.02), 0.002) < 0.) {
            gl_FragColor = vec4(1.);
        }
        if (opOnion(sdCircle(CbCr - safe_m, 0.02), 0.002) < 0.) {
            gl_FragColor = vec4(1.);
        }
        if (opOnion(sdCircle(CbCr - safe_y, 0.02), 0.002) < 0.) {
            gl_FragColor = vec4(1.);
        }
    }
    `;

    static backgroundArrays = {
        position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0],
    };

    constructor(videoSource, markers = [0.75, 1.0]) {
        super(videoSource);
        this.markers = markers;
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
            aspect-ratio: 1;
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

        if (Vectorscope.RENDERER === "webgl") {
            const gl = this.canvas.getContext("webgl", { colorSpace: "display-p3" });
            this.backgroundProgramInfo = twgl.createProgramInfo(gl,
                [Vectorscope.background_vs, Vectorscope.background_fs]);
            this.backgroundBufferInfo = twgl.createBufferInfoFromArrays(gl, Vectorscope.backgroundArrays);
            
            this.distributionProgramInfo = twgl.createProgramInfo(gl,
                [Vectorscope.distribution_vs, Vectorscope.distribution_fs]);
        }
    }

    drawScope(imgData) {
        if (Vectorscope.RENDERER === "webgl") return this.drawScopeGL(imgData);
        else return this.drawScope2d(imgData);
    }

    drawScopeGL(imgData) {
        this.canvas.width = this.clientWidth;
        this.canvas.height = this.clientHeight;

        const gl = this.canvas.getContext("webgl", { colorSpace: "display-p3" });

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        // --- draw the background ---

        gl.useProgram(this.backgroundProgramInfo.program);
        twgl.setBuffersAndAttributes(gl, this.backgroundProgramInfo, this.backgroundBufferInfo);
        const imgTex = twgl.createTexture(gl, {
            src: imgData // TODO: get iamge data directly off the video
        });
        twgl.setUniforms(this.backgroundProgramInfo, {
            source_img: imgTex,
            resolution: [gl.canvas.width, gl.canvas.height],
        });
        twgl.drawBufferInfo(gl, this.backgroundBufferInfo);

        // --- draw the vectorscope distribution ---

        gl.useProgram(this.distributionProgramInfo.program);
        // create Float32Array with items containing their indeces
        const nPixels = imgData.width * imgData.height;
        const pixelIds = new Float32Array(nPixels);
        for (let i = 0; i < nPixels; ++i) pixelIds[i] = i;
        const pixelIdBufferInfo = twgl.createBufferInfoFromArrays(gl, {
            pixelId: { size: 1, data: pixelIds },
        });

        twgl.setBuffersAndAttributes(gl, this.distributionProgramInfo, pixelIdBufferInfo);
        twgl.setUniforms(this.distributionProgramInfo, {
            source_img: imgTex,
            resolution: [imgData.width, imgData.height],
        });

        twgl.drawBufferInfo(gl, pixelIdBufferInfo);
    }
    
    drawScope2d(imgData) {
        this.canvas.width = this.clientWidth;
        this.canvas.height = this.clientHeight;

        const ctx = this.canvas.getContext("2d", { colorSpace: "display-p3" });
        
        ctx.fillStyle = "#000"
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // === colour in the background ===
        for (let scaleCr = 0; scaleCr < this.canvas.height; ++scaleCr) {
            const Cr = (scaleCr / this.canvas.height - 0.5) * 255;
            for (let scaleCb = 0; scaleCb < this.canvas.width; ++scaleCb) {
                const Cb = (scaleCb / this.canvas.width - 0.5) * 255;

                const [r, g, b] = YCbCrToRGB(Vec3.fromValues(128, Cb, Cr)).elements;

                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
                ctx.fillRect(scaleCb, scaleCr, 1, 1);
            }
        }

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // === draw R/G/B and C/M/Y saturation markers
        ctx.fillStyle = "rgb(64, 64, 64)";
        const markerSize = 11;
        for (const axis of [
            Vec3.fromValues(255, 0, 0),
            Vec3.fromValues(0, 255, 0),
            Vec3.fromValues(0, 0, 255),
            Vec3.fromValues(255, 255, 0),
            Vec3.fromValues(0, 255, 255),
            Vec3.fromValues(255, 0, 255),
        ]) {
            for (const marker of this.markers) {
                const YCbCr = rgbToYCbCr(axis).mul(marker);
                const [Y, Cb, Cr] = YCbCr.elements;

                ctx.fillRect(
                    Math.floor(Cb / 255 * this.canvas.width) + centerX - Math.floor(markerSize / 2),
                    Math.floor(Cr / 255 * this.canvas.height) + centerY - 1,
                    markerSize, 3
                );
                ctx.fillRect(
                    Math.floor(Cb / 255 * this.canvas.width) + centerX - 1,
                    Math.floor(Cr / 255 * this.canvas.height) + centerY - Math.floor(markerSize / 2),
                    3, markerSize
                );
            }
        }

        // === draw the sample dots ===
        ctx.fillStyle = "rgba(255,255,255, 0.1)";
        const stride = Math.ceil(imgData.width / 360);
        for (let y = 0; y < imgData.height; y += stride) {
            for (let x = 0; x < imgData.width; x += stride) {
                const [r, g, b] = getPixel(imgData, x, y);

                const [Y, Cb, Cr] = rgbToYCbCr(Vec3.fromValues(r, g, b)).elements;

                ctx.fillRect(
                    Cb / 255 * this.canvas.width + centerX,
                    Cr / 255 * this.canvas.height + centerY,
                    1, 1
                );
            }
        }
    }
}

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

export class ScopeStack extends HTMLElement {
    static definition = ["scope-stack", ScopeStack];

    constructor(availableScopes = [RGBWaveformScope, LumaWaveformScope, Vectorscope]) {
        super();

        this.availableScopes = availableScopes;
    }

    connectedCallback() {
        const shadow = this.attachShadow({ mode: "open" });

        // === Video source ===
        const videoSourceId = this.getAttribute("video-source");
        if (!videoSourceId) throw TypeError("`video-source` must be specified");

        const videoSourceElement = document.getElementById(videoSourceId);
        if (!(
            videoSourceElement instanceof HTMLVideoElement
            || videoSourceElement instanceof HTMLCanvasElement
        )) {
            throw TypeError("`video-source` must refer to a <video> or <canvas> element");
        }
        this.videoSource = new VideoSource(videoSourceElement, "display-p3");

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

            /* background-color: #aa122bcc;
            border: none;
            border-radius: 4px;
            padding: 8px 4px; */
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
