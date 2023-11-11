import { Monitor } from "./custom_elements/Monitor.mjs";
import { ScopeStack } from "./custom_elements/scopes/ScopeStack.mjs";
import { Vectorscope } from "./custom_elements/scopes/Vectorscope.mjs";
import { RGBWaveformScope, LumaWaveformScope } from "./custom_elements/scopes/WaveformScope.mjs";

function registerCustomElements() {
    window.customElements.define(...Monitor.definition);
    window.customElements.define(...ScopeStack.definition);
    window.customElements.define(...RGBWaveformScope.definition);
    window.customElements.define(...LumaWaveformScope.definition);
    window.customElements.define(...Vectorscope.definition);
}

(async function() {
    registerCustomElements();
})();
