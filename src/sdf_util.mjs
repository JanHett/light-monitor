export const SD_SHAPES = `
float sdCircle(vec2 p, float r)
{
    return length(p) - r;
}
`;

export const SD_OPS = `
float opOnion(in float sd, in float r)
{
    return abs(sd) - r;
}
`;

export const DRAW_ANTIALIASED = `
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