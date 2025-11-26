export type VDPState = {
    x: number,
    y: number
}

function F(x: number, y: number, u: number){
    const result: VDPState = {
        x: y,
        y: -u * (x**2 -1) * y - x
    }
    return result;
}

export function solveVanDerPol(v0: VDPState, tend: number, u:number, h: number = 0.01): VDPState[]{
    let { x, y } = v0;
    let t0 = 0;
    const result = [];
    while (t0 < tend){
        const { x: k1_x, y: k1_y } = F(x, y, u);
        const { x: k2_x, y: k2_y } = F(x + h/2 * k1_x, y + h/2 * k1_y, u);
        const { x: k3_x, y: k3_y } = F(x + h/2 * k2_x, y + h/2 * k2_y, u);
        const { x: k4_x, y: k4_y } = F(x + h * k3_x, y + h * k3_y, u);

        x = x + 1/6 * h * (k1_x + 2 * k2_x + 2 * k3_x + k4_x);
        y = y + 1/6 * h * (k1_y + 2 * k2_y + 2 * k3_y + k4_y);
        result.push({
            x: x,
            y: y
        });
        t0 += h;
    }

    return result;
}
