export class Monitor extends HTMLElement {
    static definition = ["bz-monitor", Monitor];

    /** @type{Array<MediaDeviceInfo>} */
    #mediaDevices = [];
    /** @type{HTMLVideoElement} */
    #video;

    constructor() {
        super();
    }

    connectedCallback() {
        const shadow = this.attachShadow({mode: "open"});

        // === Internal elements ===

        this.#video = document.createElement("video");

        // === Build constant GUI ===

        this.canvas = document.createElement("canvas");
        this.canvas.id = "display-canvas"

        this.colorBars = document.createElement("img");
        this.colorBars.src = "assets/SMPTE_Color_Bars_16x9.png";

        this.overlay = document.createElement("div");
        this.overlay.id = "overlay";

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
                if (device.kind === "videoinput" && device.deviceId && device.label) {
                    const deviceOption = document.createElement("option");
                    deviceOption.value = device.deviceId;
                    deviceOption.textContent = device.label;
                    deviceSelector.options.add(deviceOption);
                }
            }
            deviceSelector.addEventListener("change", ev => {
                console.log(ev);
                this.requestCameraImage(deviceSelector.value);
            });
            this.requestCameraImage(deviceSelector.value);
            deviceForm.appendChild(deviceSelector);
            
            const selectCamera = document.createElement("button");
            selectCamera.innerText = "Select Camera";
            selectCamera.addEventListener("click", ev => this.setGUIState("active"))
            deviceForm.appendChild(selectCamera);

            this.overlay.appendChild(deviceForm);
        }
    }

    /** @param {HTMLImageElement} image */
    displayImage(image) {
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
    displayVideo(video) {
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
        console.log(videoStream);
        this.#video.srcObject = videoStream;
        this.#video.play();
        this.displayVideo(this.#video);
    }
}