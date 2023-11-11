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

void main() {
    vec2 uv = (gl_FragCoord.xy / resolution); // - vec2(0.5, 0.5);

    gl_FragColor = texture2D(source_img, uv);
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
        
        this.colorBars = document.createElement("img");
        this.colorBars.src = "assets/SMPTE_Color_Bars_16x9.png";
        
        this.overlay = document.createElement("div");
        this.overlay.id = "overlay";

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

            const deviceForm = document.createElement("form");
            deviceForm.classList.add("placative");
            const deviceSelector = document.createElement("select");
            for (const device of this.#mediaDevices) {
                if (device.kind === "videoinput" && device.deviceId) {
                    const deviceOption = document.createElement("option");
                    deviceOption.value = device.deviceId;
                    deviceOption.textContent = device.label || device.deviceId;
                    deviceSelector.options.add(deviceOption);
                }
            }
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

            this.overlay.appendChild(deviceForm);
        }
    }

    /** @param {HTMLImageElement | HTMLVideoElement} image */
    displayImage(image) {
        const gl = this.canvas.getContext("webgl", {colorSpace: "display-p3"});
        
        const renderFrame = () => {
            const width = naturalWidth(image);
            const height = naturalHeight(image);
            const ar = `${width / height}`; 
            this.canvas.style.aspectRatio = ar;
            gl.useProgram(this.#programInfo.program);
            twgl.setBuffersAndAttributes(gl, this.#programInfo, this.#bufferInfo);
            const imgTex = twgl.createTexture(gl, {
                src: image,
                auto: false,
                minMag: gl.LINEAR,
                wrap: gl.CLAMP_TO_EDGE,
                flipY: true,
            });
            twgl.setUniforms(this.#programInfo, {
                source_img: imgTex,
                resolution: [gl.canvas.width, gl.canvas.height],
            });
            twgl.drawBufferInfo(gl, this.#bufferInfo);

            if (image instanceof HTMLVideoElement) {
                requestAnimationFrame(() => renderFrame());
            };
        }

        if (isLoaded(image)) requestAnimationFrame(() => renderFrame());
        else onLoad(image, () => requestAnimationFrame(() => renderFrame()));

    }

    /** @param {HTMLImageElement} image */
    _displayImage(image) {
        const renderImg = () => {
            const ar = `${image.naturalWidth / image.naturalHeight}`;
            this.canvas.style.aspectRatio = ar;
            const ctx = this.canvas.getContext("2d", {colorSpace: "display-p3"});
            ctx.drawImage(image,
                0, 0,
                this.canvas.width, this.canvas.height
            );
        }
        if (image.complete) renderImg();
        else image.onload = renderImg;
    }

    /** @param {HTMLVideoElement} video */
    _displayVideo(video) {
        const renderFrame = () => {
            const ar = `${video.videoWidth / video.videoHeight}`;
            this.canvas.style.aspectRatio = ar;
            const ctx = this.canvas.getContext("2d", {colorSpace: "display-p3"});
            ctx.drawImage(video,
                0, 0,
                this.canvas.width, this.canvas.height
            );

            requestAnimationFrame(() => renderFrame());
        }
        requestAnimationFrame(() => renderFrame());
    }

    /** @param {Array<MediaDeviceInfo>} mediaDevices */
    updateDevices(mediaDevices) {
        console.log(mediaDevices);
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
        // this.displayVideo(this.#video);
    }
}