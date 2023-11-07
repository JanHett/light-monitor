import { ScopeStack } from "./scopes/ScopeStack.mjs";
import { Vectorscope } from "./scopes/Vectorscope.mjs";
import { RGBWaveformScope, LumaWaveformScope } from "./scopes/WaveformScope.mjs";

async function getCameraAccess() {
    const monitor = document.getElementById("monitor");

    const videoStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
    });

    monitor.srcObject = videoStream;
    monitor.play();
}

function setupGuiHandlers(inputHandlers) {
    for (const inputId in inputHandlers) {
        const input = document.getElementById(inputId);
        if (input instanceof HTMLElement) {
            input.addEventListener("change", inputHandlers[inputId]);
        }

        inputHandlers[inputId]({target: input});
    }
}

function registerCustomElements() {
    window.customElements.define(...ScopeStack.definition);
    window.customElements.define(...RGBWaveformScope.definition);
    window.customElements.define(...LumaWaveformScope.definition);
    window.customElements.define(...Vectorscope.definition);
}

(async function() {
    registerCustomElements();
    await getCameraAccess();

    new App();
})();

class App {
    constructor() {
        this.waveformWidget = null;
        const inputHandlers = {
            "anamorphic-squeeze" : event => {
                const squeeze = +event.target.value;
                if (squeeze) {
                    document.getElementById("monitor").style.transform = `scaleX(${squeeze})`
                }
            },
            "aspect-ratio" : event => {
                const aspect = event.target.value;
                if (+aspect) {
                    document.getElementById("monitor").style.aspectRatio = aspect
                }
            },
        }
        setupGuiHandlers(inputHandlers);
    }
}
