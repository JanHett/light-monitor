import { Vec3, Mat3 } from "./util.mjs";

export const rgbToYCbCrMat = Mat3.fromValues(
    0.299, -0.168935,  0.499813,
    0.587, -0.331655, -0.418531,
    0.114,  0.50059,  -0.081282
);

export function rgbToYCbCr(rgb) {
    if (!(rgb instanceof Vec3)) rgb = Vec3.fromValues(...rgb);
    return rgb.mul(rgbToYCbCrMat);
}

export const YCbCrToRGBMat = Mat3.fromValues(
    1,         1,        1,
    0,        -0.343730, 1.769905,
    1.402525, -0.714401, 0.000013
)

export function YCbCrToRGB(YCbCr) {
    if (!(YCbCr instanceof Vec3)) YCbCr = Vec3.fromValues(...YCbCr);
    return YCbCr.mul(YCbCrToRGBMat);
}