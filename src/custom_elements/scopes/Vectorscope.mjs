import * as twgl from "../../../external/twgl/dist/5.x/twgl-full.module.js"
import { glsl, quadVs, quadPosition } from "../../util/glsl_util.mjs";
import { GLSL_COLORSPACE_CONVERSION } from "../../util/color_util.mjs";
import { DRAW_ANTIALIASED, SD_OPS, SD_SHAPES } from "../../util/sdf_util.mjs";

import { AbstractWebGLScope } from "./AbstractScope.mjs";

const distribution_vs = glsl`
${GLSL_COLORSPACE_CONVERSION}

// -------------------------------------------------------------------------

attribute float pixelId;
uniform sampler2D source_img;
uniform vec2 resolution;

void main() {
    vec2 pixel = vec2(mod(pixelId, resolution.x), floor(pixelId / resolution.x));
    vec2 uv = (pixel / resolution);

    vec4 pixel_rgb = texture2D(source_img, uv);
    vec2 pixel_CbCr = rgbToYCbCr(pixel_rgb.rgb).yz * 2.;

    gl_Position = vec4(pixel_CbCr, 0., 1.);
}
`;
const distribution_fs = glsl`
precision mediump float;
void main() {
    gl_FragColor = vec4(vec3(1.), 0.1);
}
`;

const background_fs = glsl`
precision mediump float;

${SD_OPS}
${SD_SHAPES}
${DRAW_ANTIALIASED}
${GLSL_COLORSPACE_CONVERSION}

uniform vec2 resolution;

void main() {
    vec2 CbCr = (gl_FragCoord.xy / resolution) - vec2(0.5, 0.5);

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

export class Vectorscope extends AbstractWebGLScope {
    static definition = ["bz-vectorscope", Vectorscope];
    static scopeId = "vectorscope"
    static scopeName = "Vectorscope"

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

        const gl = this.canvas.getContext("webgl", { colorSpace: "display-p3" });
        this.backgroundProgramInfo = twgl.createProgramInfo(gl,
            [quadVs, background_fs]);
        this.backgroundBufferInfo = twgl.createBufferInfoFromArrays(gl, {
            position: quadPosition,
        });
        
        this.distributionProgramInfo = twgl.createProgramInfo(gl,
            [distribution_vs, distribution_fs]);

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

    drawScope() {
        this.canvas.width = this.clientWidth;
        this.canvas.height = this.clientHeight;

        const gl = this.canvas.getContext("webgl", { colorSpace: "display-p3" });

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        // --- draw the background ---

        const sourceImg = this.videoSource.textureSource;

        gl.useProgram(this.backgroundProgramInfo.program);
        twgl.setBuffersAndAttributes(gl, this.backgroundProgramInfo, this.backgroundBufferInfo);
        twgl.setTextureFromElement(gl, this._imgTex, sourceImg, this._texOpts);
        twgl.setUniforms(this.backgroundProgramInfo, {
            source_img: this._imgTex,
            resolution: [gl.canvas.width, gl.canvas.height],
        });
        twgl.drawBufferInfo(gl, this.backgroundBufferInfo);

        // --- draw the vectorscope distribution ---

        gl.useProgram(this.distributionProgramInfo.program);
        this._ensurePixelIdBuf(gl, sourceImg);

        twgl.setBuffersAndAttributes(gl, this.distributionProgramInfo,
            this._pixelIdBufferInfo.buffers);
        twgl.setUniforms(this.distributionProgramInfo, {
            source_img: this._imgTex,
            resolution: [sourceImg.width, sourceImg.height],
        });

        twgl.drawBufferInfo(gl, this._pixelIdBufferInfo.buffers, gl.POINTS);
    }
}
