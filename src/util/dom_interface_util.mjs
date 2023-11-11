/** @param {HTMLImageElement | HTMLVideoElement} element */
export function isLoaded(element) {
    if (element instanceof HTMLVideoElement) {
        return element.readyState === 4
            && element.videoHeight > 0
            && element.videoWidth > 0;
    }
    else if (element instanceof HTMLImageElement) return element.complete;
    else throw TypeError(`Cannot determine if element of type \`${element.constructor.name}\` is loaded`);
}

/**
 * @param {HTMLVideoElement} element
 * @param {() => void} callback
 */
function onVideoLoad(element, callback) {
    let hasfired = false;
    let playing = false;
    let timeupdate = false;
    element.addEventListener("playing", () => {
        playing = true;
        if (timeupdate && !hasfired) callback();
    });
    element.addEventListener("timeupdate", () => {
        timeupdate = true;
        if (playing && !hasfired) callback();
    });
}

/**
 * @param {HTMLImageElement | HTMLVideoElement} element
 * @param {() => void} callback
 */
export function onLoad(element, callback) {
    if      (element instanceof HTMLVideoElement) onVideoLoad(element, callback);
    else if (element instanceof HTMLImageElement) element.addEventListener("load", callback);
    else throw TypeError(`Cannot attach listener to element of unknown type \`${element.constructor.name}\``);
}

/** @param {HTMLImageElement | HTMLVideoElement} element */
export function naturalWidth(element) {
    if (element instanceof HTMLVideoElement) return element.videoWidth;
    else if (element instanceof HTMLImageElement) return element.naturalWidth;
    else throw TypeError(`Cannot determine naturalWidth of element of type \`${element.constructor.name}\``);
}

/** @param {HTMLImageElement | HTMLVideoElement} element */
export function naturalHeight(element) {
    if (element instanceof HTMLVideoElement) return element.videoHeight;
    else if (element instanceof HTMLImageElement) return element.naturalHeight;
    else throw TypeError(`Cannot determine naturalHeight of element of type \`${element.constructor.name}\``);
}