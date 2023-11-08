import { Monitor } from "./custom_elements/Monitor.mjs";
import { ScopeStack } from "./custom_elements/scopes/ScopeStack.mjs";
import { Vectorscope } from "./custom_elements/scopes/Vectorscope.mjs";
import { RGBWaveformScope, LumaWaveformScope } from "./custom_elements/scopes/WaveformScope.mjs";

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
    window.customElements.define(...Monitor.definition);
    window.customElements.define(...ScopeStack.definition);
    window.customElements.define(...RGBWaveformScope.definition);
    window.customElements.define(...LumaWaveformScope.definition);
    window.customElements.define(...Vectorscope.definition);
}

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

(async function() {
    registerCustomElements();

    new App();
})();
