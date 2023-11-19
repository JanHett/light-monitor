import { VideoSource } from "../../VideoSource.mjs";

import { Vectorscope } from "./Vectorscope.mjs";
import { RGBWaveformScope, LumaWaveformScope } from "./WaveformScope.mjs";

export class ScopeStack extends HTMLElement {
    static definition = ["bz-scope-stack", ScopeStack];

    constructor(availableScopes = [RGBWaveformScope, LumaWaveformScope, Vectorscope]) {
        super();

        this.availableScopes = availableScopes;
    }

    connectedCallback() {
        const shadow = this.attachShadow({ mode: "open" });

        // === Video source ===
        const videoSourceId = this.getAttribute("video-source");
        if (!videoSourceId) throw TypeError("`video-source` must be specified");

        const videoSourceElement = document.getElementById(videoSourceId);
        this.videoSource = new VideoSource(videoSourceElement, "display-p3");

        // === The control box ===
        const controls = document.createElement("div");
        controls.classList.add("scope-stack-controls");

        // --- Stack Direction ---
        const stackDirection = document.createElement("select");
        [
            {label: "Horizontal", value: "horizontal"},
            {label: "Vertical", value: "vertical"},
        ].map(option => {
            const optEl = document.createElement("option");
            optEl.textContent = option.label;
            optEl.setAttribute("value", option.value);

            return optEl;
        }).forEach(optEl => {
            stackDirection.options.add(optEl);
        });
        controls.appendChild(stackDirection);

        // --- Add-Scope Buttons ---
        const scopeButtons = document.createElement("div");
        scopeButtons.classList.add("scope-button-container")
        for (const Scope of this.availableScopes) {
            const button = document.createElement("button");
            button.textContent = Scope.scopeName;
            button.addEventListener("click", ev => this.addScopeClicked(ev, Scope));
            scopeButtons.appendChild(button);
        }
        controls.appendChild(scopeButtons);

        // === Container for added scopes ===
        this.scopeContainer = document.createElement("div");
        this.scopeContainer.classList.add("scope-stack-container");

        // === Style ===
        const style = document.createElement("style");
        style.textContent = `
        :host {
            display: flex;
        }

        .scope-stack-controls {
            display: flex;
            flex-direction: column;
            margin-right: 8px;
        }

        .scope-button-container {
            display: flex;
            flex-direction: column;
        }

        .scope-stack-container {
            display: flex;
            overflow: scroll;
        }

        .scope-wrapper {
            position: relative;
        }

        .scope-wrapper:not(:last-child) {
            margin-right: 16px;
        }

        .remove-scope {
            position: absolute;
            top: 8px;
            left: 8px;

            /* background-color: #aa122bcc;
            border: none;
            border-radius: 4px;
            padding: 8px 4px; */
        }
        `;

        // === Final Assembly ===
        shadow.appendChild(style);
        shadow.appendChild(controls);
        shadow.appendChild(this.scopeContainer);
    }

    addScopeClicked(event, Scope) {
        const scopeWrapper = document.createElement("div");

        const scope = new Scope(this.videoSource);
        scopeWrapper.classList.add("scope-wrapper");
        scopeWrapper.appendChild(scope);

        const removeScopeBtn = document.createElement("button");
        removeScopeBtn.textContent = "🗑️";
        removeScopeBtn.classList.add("remove-scope");
        removeScopeBtn.addEventListener("click", ev => {
            this.scopeContainer.removeChild(scopeWrapper);
        });
        scopeWrapper.appendChild(removeScopeBtn);

        this.scopeContainer.appendChild(scopeWrapper);

    }
}
