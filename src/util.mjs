export function getPixel(imageData, x, y) {
    const r = imageData.data[y * imageData.width * 4 + x * 4 + 0];
    const g = imageData.data[y * imageData.width * 4 + x * 4 + 1];
    const b = imageData.data[y * imageData.width * 4 + x * 4 + 2];
    const a = imageData.data[y * imageData.width * 4 + x * 4 + 3];

    return [r, g, b, a];
}

export class Vec3 {
    constructor() {
        this.elements = [0, 0, 0]
    }

    static fromValues(v00, v01, v02) {
        const v = new Vec3();
        v.elements[0] = v00;
        v.elements[1] = v01;
        v.elements[2] = v02;
        return v;
    }

    get(el) { return this.elements[el]; }

    mulVec3(rhs) {
        const res = new Vec3;
        res.elements[0] = this.get(0) * rhs.get(0);
        res.elements[1] = this.get(1) * rhs.get(1);
        res.elements[2] = this.get(2) * rhs.get(2);
    }

    /**
     * @param {Mat3} rhs
     */
    mulMat3(rhs) {
        const res = new Vec3;
        res.elements[0] = this.get(0) * rhs.get(0, 0)
            + this.get(1) * rhs.get(0, 1)
            + this.get(2) * rhs.get(0, 2);
        res.elements[1] = this.get(0) * rhs.get(1, 0)
            + this.get(1) * rhs.get(1, 1)
            + this.get(2) * rhs.get(1, 2);
        res.elements[2] = this.get(0) * rhs.get(2, 0)
            + this.get(1) * rhs.get(2, 1)
            + this.get(2) * rhs.get(2, 2);

        return res;
    }

    mul(rhs) {
        if (rhs instanceof Vec3) return this.mulVec3(rhs);
        if (rhs instanceof Mat3) return this.mulMat3(rhs);
        throw TypeError(`Cannot multiply \`Vec3\` by \`${rhs.constructor.name}\``);
    }
}

export class Mat3 {
    constructor() {
        this.elements = [
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        ]
    }

    static fromValues(
        v00, v01, v02,
        v10, v11, v12,
        v20, v21, v22,
    ) {
        const m = new Mat3();
        m.elements[0] = v00;
        m.elements[1] = v01;
        m.elements[2] = v02;
        m.elements[3] = v10;
        m.elements[4] = v11;
        m.elements[5] = v12;
        m.elements[6] = v20;
        m.elements[7] = v21;
        m.elements[8] = v22;
        return m;
    }

    get(col, row) {
        return this.elements[row * 3 + col];
    }
}