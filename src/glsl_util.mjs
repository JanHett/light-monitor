/// Identity function to allow tagging glsl shader strings for editor tooling
export const glsl = (strings, ...values) => String.raw({ raw: strings }, ...values);