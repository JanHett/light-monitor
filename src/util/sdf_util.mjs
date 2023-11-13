import { glsl } from "./glsl_util.mjs";

export const SD_SHAPES = glsl`
float sdCircle(vec2 p, float r)
{
    return length(p) - r;
}

float sdBox(in vec2 p, in vec2 b)
{
    vec2 d = abs(p)-b;
    return length(max(d,0.0)) + min(max(d.x,d.y),0.0);
}

// s = side length
// r = corner radius
float sdRoundSquare(in vec2 p, in float s, in float r) 
{
    vec2 q = abs(p)-s+r;
    return min(max(q.x,q.y),0.0) + length(max(q,0.0)) - r;
}
`;

export const SD_OPS = glsl`
float opRound(in float sd, in float r)
{
  return sd - r;
}

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