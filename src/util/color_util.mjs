import { Vec3, Mat3 } from "./util.mjs";
import { glsl } from "./glsl_util.mjs";

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

export const GLSL_COLORSPACE_CONVERSION = glsl`
/// As given by https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-rdprfx/b550d1b5-f7d9-4a0c-9141-b3dca9d7f525?redirectedfrom=MSDN
mat3 rgbToYCbCrMat = mat3(
    0.299,      0.587,     0.114,
    -0.168935, -0.331655,  0.50059,
    0.499813,  -0.418531, -0.081282

    // 0.299, -0.168935,  0.499813,
    // 0.587, -0.331655, -0.418531,
    // 0.114,  0.50059,  -0.081282
);
/// As  given by https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-rdprfx/2e1618ed-60d6-4a64-aa5d-0608884861bb
mat3 YCbCrToRGBMat = mat3(
    1., 0., 1.402525,
    1., -0.343730, -0.714401,
    1., 1.769905, 0.000013
);

vec3 rgbToYCbCr(in vec3 rgb) {
    return rgb * rgbToYCbCrMat;
}

vec3 YCbCrToRGB(in vec3 YCbCr) {
    return YCbCr * YCbCrToRGBMat;
}

float applysRGBTransferFunc(in float linear_sRGB) {
    if (linear_sRGB <= 0.0031308) {
        return 12.92 * linear_sRGB;
    }
    return 1.055 * pow(linear_sRGB, 1./2.4) - 0.055;
}

mat3 XYZTosRGBMat = mat3(
    +3.2404542, -1.5371385, -0.4985314,
    -0.9692660, +1.8760108, +0.0415560,
    +0.0556434, -0.2040259, +1.0572252
);

vec3 XYZTosRGB(in vec3 XYZ) {
    vec3 v = XYZ * XYZTosRGBMat;
    return vec3(
        applysRGBTransferFunc(v.r),
        applysRGBTransferFunc(v.g),
        applysRGBTransferFunc(v.b)
    );
}
`;