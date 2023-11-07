import * as twgl from "../../../external/twgl/dist/5.x/twgl-full.module.js"

import { getPixel, Vec3 } from "../../util/util.mjs"
import { glsl } from "../../util/glsl_util.mjs";
import { rgbToYCbCr, YCbCrToRGB, GLSL_COLORSPACE_CONVERSION } from "../../util/color_util.mjs";
import { DRAW_ANTIALIASED, SD_OPS, SD_SHAPES } from "../../util/sdf_util.mjs";

import { AbstractScope } from "./AbstractScope.mjs";

export class Vectorscope extends AbstractScope {
    static definition = ["vector-scope", Vectorscope];
    static scopeId = "vectorscope"
    static scopeName = "Vectorscope"

    static RENDERER = "webgl"
    // static RENDERER = "2d"

    static distribution_vs = glsl`
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
    static distribution_fs = glsl`
    precision mediump float;
    void main() {
        gl_FragColor = vec4(1.);
    }
    `;

    static background_vs = glsl`
    attribute vec4 position;

    void main() {
        gl_Position = position;
    }
    `;

    static background_fs = glsl`
    precision mediump float;

    ${SD_OPS}
    ${SD_SHAPES}
    ${DRAW_ANTIALIASED}
    ${GLSL_COLORSPACE_CONVERSION}

    uniform sampler2D source_img;
    uniform vec2 resolution;

    void main() {
        vec2 CbCr = (gl_FragCoord.xy / resolution) - vec2(0.5, 0.5);
        //gl_FragColor = texture2D(source_img, CbCr);

        vec3 col = YCbCrToRGB(vec3(0.5, CbCr));
        
        // markers
        vec2 safe_r = rgbToYCbCr(vec3(0.75, 0, 0)).yz;
        vec2 safe_g = rgbToYCbCr(vec3(0, 0.75, 0)).yz;
        vec2 safe_b = rgbToYCbCr(vec3(0, 0, 0.75)).yz;
        vec2 safe_c = rgbToYCbCr(vec3(0, 0.75, 0.75)).yz;
        vec2 safe_m = rgbToYCbCr(vec3(0.75, 0, 0.75)).yz;
        vec2 safe_y = rgbToYCbCr(vec3(0.75, 0.75, 0)).yz;

        float aa_smoothing = 1.5 / resolution.x;
        col = draw_aa(vec3(1.), col, aa_smoothing,
            opOnion(sdCircle(CbCr - safe_r, 0.02), 0.002));
        col = draw_aa(vec3(1.), col, aa_smoothing,
            opOnion(sdCircle(CbCr - safe_g, 0.02), 0.002));
        col = draw_aa(vec3(1.), col, aa_smoothing,
            opOnion(sdCircle(CbCr - safe_b, 0.02), 0.002));
        col = draw_aa(vec3(1.), col, aa_smoothing,
            opOnion(sdCircle(CbCr - safe_c, 0.02), 0.0002));
        col = draw_aa(vec3(1.), col, aa_smoothing,
            opOnion(sdCircle(CbCr - safe_m, 0.02), 0.0002));
        col = draw_aa(vec3(1.), col, aa_smoothing,
            opOnion(sdCircle(CbCr - safe_y, 0.02), 0.0002));

        gl_FragColor = vec4(col, 1.);
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
