import { glsl } from "./glsl_util.mjs";

export const SD_SHAPES = glsl`
float sdCircle(vec2 p, float r)
{
    return length(p) - r;
}
`;

export const SD_OPS = glsl`
float opOnion(in float sd, in float r)
{
    return abs(sd) - r;
}
`;

export const DRAW_ANTIALIASED = glsl`
vec3 draw_aa(
    in vec3 foreground,
    in vec3 background,
    in float smoothing,
    in float distance
) {
    return mix(
        foreground, background,
        smoothstep(
            0., smoothing,
            distance
        )
    );
}
`;