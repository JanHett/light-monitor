/// Identity function to allow tagging glsl shader strings for editor tooling
export const glsl = (strings, ...values) => String.raw({ raw: strings }, ...values);

export const quadPosition = [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0];
export const quadVs = glsl`
attribute vec4 position;

void main() {
    gl_Position = position;
}
`;
