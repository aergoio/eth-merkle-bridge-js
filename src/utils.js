import bs58check from "bs58check";

export function checkEthereumAddress(addr) {
    if (addr.substring(0,2) !== "0x") {
        throw new Error("Invalid Ethereum address");
    }
    if (addr.length !== 42) {
        throw new Error("Invalid Ethereum address");
    }
    const match = addr.slice(2).match('^[a-fA-F0-9]*$')
    if (match === null) {
        throw new Error("Invalid Ethereum address");
    }
}

export function checkAergoAddress(addr) {
    if (addr.substring(0,1) !== "A") {
        throw new Error("Invalid Aergo address");
    }
    if (addr.length !== 52) {
        throw new Error("Invalid Aergo address");
    }
    try {
        bs58check.decode(addr);
    } catch (error) {
        throw new Error("Invalid Aergo address");
    }
}