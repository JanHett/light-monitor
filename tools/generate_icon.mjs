import { glsl, quadPosition, quadVs } from "../src/util/glsl_util.mjs";
import * as twgl from "../external/twgl/dist/5.x/twgl-full.module.js";
import { DRAW_ANTIALIASED, SD_OPS, SD_SHAPES } from "../src/util/sdf_util.mjs";
import { CIE_xyz_1931_2deg } from "../data/ColorMatchingFunction.mjs";
import { GLSL_COLORSPACE_CONVERSION } from "../src/util/color_util.mjs";

// === SHADERS ===

const vs = quadVs;
const fs = glsl`
precision highp float;

${SD_OPS}
${SD_SHAPES}
${DRAW_ANTIALIASED}
${GLSL_COLORSPACE_CONVERSION}

uniform sampler2D color_matching_function;
uniform float color_matching_min_wavelen;
uniform float color_matching_max_wavelen;
uniform float color_matching_wavelength_increment;
uniform vec2 resolution;

#define AVG_SAMPLES 240
#define AVG_DELTA 0.001

void main() {
    vec2 uv = (gl_FragCoord.xy / resolution);
    // float u = uv.x / 1.8 + 0.1;
    float u = uv.x / 1.35 - 0.1;
    vec3 spectral = vec3(0.);
    for (int i = 0; i < AVG_SAMPLES; ++i) {
        spectral += texture2D(color_matching_function,
            vec2(u + float(i) * AVG_DELTA, 0.5)).rgb / float(AVG_SAMPLES);
    }
    spectral = XYZTosRGB(spectral);

    vec3 background = vec3(0.12) * (1. - sdCircle(uv - vec2(0.5), 0.7));

    vec3 col;
    if (uv.y < 0.33 || uv.y > 0.66) {
        col = background;
    } else {
        col = spectral;
    }

    float silhouetteSd = sdRoundSquare(uv - vec2(0.5), 0.495, 0.17578125);
    float a = mix(1., 0., smoothstep(0., 0.005, silhouetteSd));

    gl_FragColor = vec4(col, a);
}
`;

// === SHADER EXECUTION ===

const canvas = document.getElementById("icon");
canvas.width = 512;
canvas.height = 512;

const gl = canvas.getContext("webgl", { colorSpace: "srgb" });
const ext = gl.getExtension("OES_texture_float");
console.log(`OES_texture_float available: ${!!ext}`);
gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

const programInfo = twgl.createProgramInfo(gl, [vs, fs]);
const bufferInfo = twgl.createBufferInfoFromArrays(gl, {
    position: quadPosition,
});

gl.useProgram(programInfo.program);
twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);

const colorMatchingFunc = new Float32Array(
    CIE_xyz_1931_2deg.data()
    .map(e => [...e, 1.]).flat()
);

const colorMatchingFunctionTex = twgl.createTexture(gl, {
    src: colorMatchingFunc,
    width: CIE_xyz_1931_2deg.nSupports(),
    height: 1,
    type: gl.FLOAT,
    auto: false,
    minMag: gl.NEAREST,
    wrap: gl.CLAMP_TO_EDGE,
});

twgl.setUniforms(programInfo, {
    resolution: [gl.canvas.width, gl.canvas.height],
    color_matching_min_wavelen: CIE_xyz_1931_2deg.min(),
    color_matching_max_wavelen: CIE_xyz_1931_2deg.max(),
    color_matching_wavelength_increment: CIE_xyz_1931_2deg.wavelength_increment(),
    color_matching_function: colorMatchingFunctionTex
});
twgl.drawBufferInfo(gl, bufferInfo);
