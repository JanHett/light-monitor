import * as twgl from "../../../external/twgl/dist/5.x/twgl-full.module.js"
import { glsl, quadVs, quadPosition, identityVs } from "../../util/glsl_util.mjs";

import { AbstractWebGLScope } from "./AbstractScope.mjs";

const distribution_vs = glsl`
attribute float pixelId;
uniform sampler2D source_img;
uniform vec2 resolution;
uniform int color_idx;

float getVectorComponent(vec4 vec, int idx) {
    if (idx == 0) return vec.x;
    if (idx == 1) return vec.y;
    if (idx == 2) return vec.z;
    return vec.w;
}

float getColorComponent(vec4 vec, int idx) {
    if (idx < 0) return (vec.r + vec.g + vec.b) / 3.;
    return getVectorComponent(vec, idx);
}

void main() {
    vec2 pixel = vec2(
        mod(pixelId, resolution.x),
        floor(pixelId / resolution.x)
    );
    vec2 uv = (pixel / resolution);

    vec4 pixel_rgb = texture2D(source_img, uv);

    gl_Position = vec4(vec2(
        uv.x * 2. - 1.,
        getColorComponent(pixel_rgb, color_idx) * 2. - 1.
    ), 0., 1.);
}
`;

const tint_fs = opacity => glsl`
precision mediump float;
uniform vec3 color;
void main() {
    gl_FragColor = vec4(color, ${opacity});
}
`;

const distribution_fs = tint_fs(0.1);
const guideline_fs = tint_fs(1);

const background_fs = glsl`
void main() {
    gl_FragColor = vec4(vec3(0.), 1.);
}
`;

class AbstractWaveformScope extends AbstractWebGLScope {
    constructor(videoSource, guidelines = [0.1, 0.5, 0.8]) {
        super(videoSource);
        this.guidelines = guidelines;
    }

    drawScope() {
        this.canvas.width = this.clientWidth;
        this.canvas.height = this.clientHeight;

        const gl = this.canvas.getContext("webgl", { colorSpace: "display-p3" });
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        // --- draw the background ---

        const sourceImg = this.videoSource.textureSource;

        gl.useProgram(this.backgroundProgramInfo.program);
        twgl.setBuffersAndAttributes(gl, this.backgroundProgramInfo, this.backgroundBufferInfo);
        twgl.setTextureFromElement(gl, this._imgTex, sourceImg, this._texOpts)
        twgl.setUniforms(this.backgroundProgramInfo, {
            source_img: this._imgTex,
            resolution: [gl.canvas.width, gl.canvas.height],
        });
        twgl.drawBufferInfo(gl, this.backgroundBufferInfo);

        // --- draw the vectorscope distribution ---
        gl.enable(gl.BLEND);

        this._ensurePixelIdBuf(gl, sourceImg);
        this.drawDistribution(gl, {
            source_img: this._imgTex,
            resolution: [sourceImg.width, sourceImg.height],
        });

        // --- draw the guidelines ---
        gl.disable(gl.BLEND);

        gl.useProgram(this.guidelineProgramInfo.program);
        twgl.setBuffersAndAttributes(gl, this.guidelineProgramInfo, this.guidelineBufferInfo);
        twgl.setUniforms(this.guidelineProgramInfo, {
            color: [1,1,1]
        })
        twgl.drawBufferInfo(gl, this.guidelineBufferInfo, gl.LINES);
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

        const gl = this.canvas.getContext("webgl", { colorSpace: "display-p3" });

        // --- build background program ---

        this.backgroundProgramInfo = twgl.createProgramInfo(gl,
            [quadVs, background_fs]);
        this.backgroundBufferInfo = twgl.createBufferInfoFromArrays(gl, {
            position: quadPosition
        });
        
        // --- build distribution program ---

        this.distributionProgramInfo = twgl.createProgramInfo(gl,
            [distribution_vs, distribution_fs]);

        // --- build guideline program ---

        this.guidelineProgramInfo = twgl.createProgramInfo(gl,
            [identityVs, guideline_fs]);

        const guideVertices = [];
        for (const guide of this.guidelines) {
            const guideY = guide * 2 - 1;
            guideVertices.push(
                1.1, guideY, 0, 1,
                -1, guideY, 0, 1,
                1.1, guideY, 0, 1,
            );
        }

        this.guidelineBufferInfo = twgl.createBufferInfoFromArrays(gl, {
            position: { numComponents: 4, data: guideVertices}
        });

        // --- set rendering flags ---

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);

        const sourceImg = this.videoSource.textureSource;
        this._texOpts = {
            src: sourceImg,
            auto: false,
            minMag: gl.LINEAR,
            wrap: gl.CLAMP_TO_EDGE,
        };
        this._imgTex = twgl.createTexture(gl, this._texOpts);
    }
}

export class RGBWaveformScope extends AbstractWaveformScope {
    static definition = ["bz-rgb-waveform-scope", RGBWaveformScope];
    static scopeId = "rgb-waveform"
    static scopeName = "RGB Waveform"

    drawDistribution(gl, imgUniforms) {
        gl.useProgram(this.distributionProgramInfo.program);

        twgl.setBuffersAndAttributes(gl, this.distributionProgramInfo,
            this._pixelIdBufferInfo.buffers);
        
        for (const [color_idx, color] of [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1]
        ].entries()) {
            twgl.setUniforms(this.distributionProgramInfo, {
                ...imgUniforms,
                color,
                color_idx
            });
            twgl.drawBufferInfo(gl, this._pixelIdBufferInfo.buffers, gl.POINTS);
        }
    }
}

export class LumaWaveformScope extends AbstractWaveformScope {
    static definition = ["bz-luma-waveform-scope", LumaWaveformScope];
    static scopeId = "luma-waveform"
    static scopeName = "Luma Waveform"

    drawDistribution(gl, imgUniforms) {
        gl.useProgram(this.distributionProgramInfo.program);

        twgl.setBuffersAndAttributes(gl, this.distributionProgramInfo,
            this._pixelIdBufferInfo.buffers);
        
        twgl.setUniforms(this.distributionProgramInfo, {
            ...imgUniforms,
            color: [1,1,1],
            color_idx: -1
        });
        twgl.drawBufferInfo(gl, this._pixelIdBufferInfo.buffers, gl.POINTS);
    }
}