// import util from "util";

export function dbg<T>(value: T): T {
    console.log(value);
    return value;
}

export function extractEnv(variable: string) {
    const val = process.env[variable];
    if (!val) {
        throw Error(`${variable} variable was not found in environment`);
    }
    return val;
}
