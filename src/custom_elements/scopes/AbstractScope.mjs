export class AbstractScope extends HTMLElement {
    constructor(videoSource) {
        super();
        this.videoSource = videoSource;

        this.frameListener = this.videoSource.addEventListener("frame", (event, imgData) => {
            this.drawScope(imgData)
        });
    }

    disconnectedCallback() {
        this.videoSource.removeEventListener("frame", this.frameListener);
    }
}