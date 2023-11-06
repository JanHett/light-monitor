import { Vec3, Mat3 } from "./util.mjs";

/// As given by https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-rdprfx/b550d1b5-f7d9-4a0c-9141-b3dca9d7f525?redirectedfrom=MSDN
export const rgbToYCbCrMat = Mat3.fromValues(
    0.299, -0.168935,  0.499813,
    0.587, -0.331655, -0.418531,
    0.114,  0.50059,  -0.081282
);

export function rgbToYCbCr(rgb) {
    if (!(rgb instanceof Vec3)) rgb = Vec3.fromValues(...rgb);
    return rgb.mul(rgbToYCbCrMat);
}

/// As  given by https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-rdprfx/2e1618ed-60d6-4a64-aa5d-0608884861bb
export const YCbCrToRGBMat = Mat3.fromValues(
    1,         1,        1,
    0,        -0.343730, 1.769905,
    1.402525, -0.714401, 0.000013
)

export function YCbCrToRGB(YCbCr) {
    if (!(YCbCr instanceof Vec3)) YCbCr = Vec3.fromValues(...YCbCr);
    return YCbCr.mul(YCbCrToRGBMat);
}