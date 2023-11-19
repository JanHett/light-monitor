import * as twgl from "../../external/twgl/dist/5.x/twgl-full.module.js"
import { glsl } from "../util/glsl_util.mjs";
import { GLSL_COLORSPACE_CONVERSION } from "../util/color_util.mjs";
import { quadVs, quadPosition } from "../util/glsl_util.mjs";
import { isLoaded, naturalWidth, naturalHeight, onLoad } from "../util/dom_interface_util.mjs";

const monitorFs = glsl`
precision mediump float;

${GLSL_COLORSPACE_CONVERSION}

uniform sampler2D source_img;
uniform vec2 resolution;
uniform float anamorphic_squeeze;
uniform float image_ar;

void main() {
    float frame_ar = resolution.x / resolution.y;
    vec2 uv = (gl_FragCoord.xy / resolution);

    float anamorphic_ar = image_ar * anamorphic_squeeze;
    float ar_ratio = anamorphic_ar / frame_ar;
    vec2 img_uv = vec2(
        uv.x / max(ar_ratio, 1.),
        uv.y * min(ar_ratio, 1.)
    );
    img_uv = vec2(
        img_uv.x + max(0., (anamorphic_ar - frame_ar) / (2. * anamorphic_squeeze)),
        img_uv.y + max(0., (1./anamorphic_ar - 1./frame_ar) / 2.)
    );

    gl_FragColor = texture2D(source_img, img_uv);
}
`;

export class Monitor extends HTMLElement {
    static definition = ["bz-monitor", Monitor];

    /** @type{Array<MediaDeviceInfo>} */
    #mediaDevices = [];
    /** @type{HTMLVideoElement} */
    #video;

    #programInfo;
    #bufferInfo;

    constructor() {
        super();
        this.anamorphicSqueeze = 1;
    }

    setupShader() {
        const gl = this.canvas.getContext("webgl", {colorSpace: "display-p3"});

        this.#programInfo = twgl.createProgramInfo(gl,
            [quadVs, monitorFs]);
        this.#bufferInfo = twgl.createBufferInfoFromArrays(gl, {
            position: quadPosition,
        });
    }

    connectedCallback() {
        const shadow = this.attachShadow({mode: "open"});
        
        // === Internal elements ===
        
        this.#video = document.createElement("video");
        this.#video.playsInline = true;
        
        // === Build constant GUI ===
        
        this.canvas = document.createElement("canvas");
        this.canvas.id = "display-canvas"
        this.canvas.width = window.innerWidth;
        
        this.colorBars = document.createElement("img");
        this.colorBars.src = "assets/SMPTE_Color_Bars_16x9.png";
        
        this.overlay = document.createElement("div");
        this.overlay.id = "overlay";

        const settings = document.createElement("div");
        settings.id = "settings";
        // anamorphic squeeze
        const anamorphicSqueeze = document.createElement("input");
        anamorphicSqueeze.id = "anamorphic-squeeze";
        const anamorphicSqueezeLabel = document.createElement("label");
        anamorphicSqueezeLabel.setAttribute("for", "anamorphic-squeeze");
        anamorphicSqueezeLabel.textContent = "Anamorphic Squeeze";
        anamorphicSqueeze.setAttribute("type", "number");
        anamorphicSqueeze.setAttribute("step", "0.1");
        anamorphicSqueeze.value = 1;
        anamorphicSqueeze.addEventListener("change", () => {
            this.anamorphicSqueeze = anamorphicSqueeze.value;
        });
        settings.appendChild(anamorphicSqueezeLabel);
        settings.appendChild(anamorphicSqueeze);
        // aspect ratio
        const aspectRatio = document.createElement("input");
        aspectRatio.id = "aspect-ratio";
        const aspectRatioLabel = document.createElement("label");
        aspectRatioLabel.setAttribute("for", "aspect-ratio");
        aspectRatioLabel.textContent = "Aspect Ratio";
        aspectRatio.setAttribute("type", "number");
        aspectRatio.setAttribute("step", "0.1");
        aspectRatio.addEventListener("change", () => {
            this.setCanvasAspect(+aspectRatio.value);
        });
        aspectRatio.value = 1.75;
        this.setCanvasAspect(+aspectRatio.value);
        settings.appendChild(aspectRatioLabel);
        settings.appendChild(aspectRatio);

        // === Set up WebGL ===

        this.setupShader();

        // === Style ===

        const style = document.createElement("style");
        style.textContent = `
        :host {
            display: block;
            overflow: hidden;
            position: relative;
        }

        #settings {
            color: #fff;
            padding: 0.5em 0.7em;
        }

        #settings :not(:last-child) {
            margin-right: 1em;
        }

        #display-canvas {
            width: 100%;
        }

        #overlay.shade {
            display: block;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;

            background-color: rgba(0, 0, 0, 0.5);
            color: #fff;
        }

        #overlay {
            display: none;
        }

        .placative {
            text-align: center;
        }
        `;

        // === Assembly ===
        
        shadow.appendChild(style);
        shadow.appendChild(settings);
        shadow.appendChild(this.canvas);
        shadow.appendChild(this.overlay);

        this.setGUIState("no-signal");

        // === Request list of devices ===

        navigator.mediaDevices.enumerateDevices()
        .then(mediaDevices => {
            this.updateDevices(mediaDevices);
            this.setGUIState("select-device");
        })
        .catch(err => {
            // TODO: handle failure to get camera access
            console.error(err);
        });
    }

    /** @param {"no-signal" | "select-device" | "active"} state */
    setGUIState(state) {
        this.overlay.innerHTML = "";

        if (state !== "active") {
            this.displayImage(this.colorBars);
            this.overlay.classList.add("shade");
        } else {
            this.overlay.classList.remove("shade");
        }

        if (state === "no-signal") {
            const noSignal = document.createElement("h1");
            noSignal.textContent = "No Signal";
            noSignal.classList.add("placative");

            this.overlay.appendChild(noSignal);
        }

        if (state === "select-device") {
            const prompt = document.createElement("h1");
            prompt.textContent = "Select Camera";
            prompt.classList.add("placative");
            this.overlay.appendChild(prompt);

            const deviceForm = document.createElement("div");
            deviceForm.classList.add("placative");
            const deviceSelector = document.createElement("select");

            const buildDeviceList = () => {
                while (deviceSelector.options.length) deviceSelector.options.remove(0);
                for (const device of this.#mediaDevices) {
                    if (device.kind === "videoinput" && device.deviceId) {
                        const deviceOption = document.createElement("option");
                        deviceOption.value = device.deviceId;
                        deviceOption.textContent = device.label || device.deviceId;
                        deviceSelector.options.add(deviceOption);
                    }
                }
            }

            buildDeviceList();

            deviceSelector.addEventListener("change", ev => {
                if (deviceSelector.value) {
                    this.requestCameraImage(deviceSelector.value);
                }
            });
            if (deviceSelector.value) {
                this.requestCameraImage(deviceSelector.value);
            }
            deviceForm.appendChild(deviceSelector);
            
            const selectCamera = document.createElement("button");
            selectCamera.innerText = "Select Camera";
            selectCamera.addEventListener("click", ev => this.setGUIState("active"))
            deviceForm.appendChild(selectCamera);

            const refreshDevices = document.createElement("button");
            refreshDevices.innerText = "Refresh Device List";
            refreshDevices.addEventListener("click", ev => {
                navigator.mediaDevices.enumerateDevices()
                .then(mediaDevices => {
                    this.updateDevices(mediaDevices);
                    // this.setGUIState("select-device");
                    buildDeviceList();
                })
                .catch(err => {
                    // TODO: handle failure to get camera access
                    console.error(err);
                });
            });
            deviceForm.appendChild(refreshDevices);

            this.overlay.appendChild(deviceForm);
        }
    }

    /** @param {number} aspectRatio */
    setCanvasAspect(aspectRatio) {
        this.canvas.style.aspectRatio = aspectRatio;
        this.canvas.height = this.canvas.width / (+aspectRatio);
    }

    /** @param {HTMLImageElement | HTMLVideoElement} image */
    displayImage(image) {
        const gl = this.canvas.getContext("webgl", {colorSpace: "display-p3"});
        
        const texOpts = {
            src: image,
            auto: false,
            minMag: gl.LINEAR,
            wrap: gl.CLAMP_TO_EDGE,
            flipY: true,
        };
        const imgTex = twgl.createTexture(gl, texOpts);

        const renderFrame = () => {
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            const width = naturalWidth(image);
            const height = naturalHeight(image);
            const image_ar = `${width / height}`;
            gl.useProgram(this.#programInfo.program);
            twgl.setBuffersAndAttributes(gl, this.#programInfo,
                this.#bufferInfo);
            twgl.setTextureFromElement(gl, imgTex, image, texOpts);
            twgl.setUniforms(this.#programInfo, {
                source_img: imgTex,
                resolution: [gl.canvas.width, gl.canvas.height],
                anamorphic_squeeze: this.anamorphicSqueeze,
                image_ar,
            });
            twgl.drawBufferInfo(gl, this.#bufferInfo);

            if (image instanceof HTMLVideoElement) {
                requestAnimationFrame(renderFrame);
            };
        }

        if (isLoaded(image)) requestAnimationFrame(renderFrame);
        else onLoad(image, () => requestAnimationFrame(renderFrame));

    }

    /** @param {Array<MediaDeviceInfo>} mediaDevices */
    updateDevices(mediaDevices) {
        this.#mediaDevices = mediaDevices;
    }

    /** @param {string} deviceId */
    requestCameraImage(deviceId) {
        navigator.mediaDevices.getUserMedia({
            video: { deviceId: deviceId },
            audio: false
        })
        .then(videoStream => this.cameraAvailable(videoStream))
        .catch(err => {
            // TODO: handle failure to get camera access
            console.error(err);
        });
    }

    /** @param {MediaStream} videoStream */
    cameraAvailable(videoStream) {
        this.#video.srcObject = videoStream;
        this.#video.play();
        this.displayImage(this.#video);
    }
}