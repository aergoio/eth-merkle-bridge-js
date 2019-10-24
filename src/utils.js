import bs58check from "bs58check";
import { Contract } from '@herajs/client';
import BigNumber from "bignumber.js";

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


/**
 * Get the anchoring status of Ethereum to Aergo
 * @param {object} web3 Provider (metamask or other web3 compatible)
 * @param {object} hera Herajs client
 * @param {string} bridgeAergoAddr Aergo address of bridge contract
 * @return {number, number, number} last anchor height on aergo, anchoring periode, eth longest chain height
 */
export async function getEthAnchorStatus(
    web3, 
    hera,
    bridgeAergoAddr
) {
    checkAergoAddress(bridgeAergoAddr);
    const aergoBridge = Contract.atAddress(bridgeAergoAddr);
    const query = aergoBridge.queryState(
        ["_sv__anchorHeight", "_sv__tAnchor", "_sv__tFinal"]);
    const [lastAnchorHeight, tAnchor, tFinal] = await hera.queryContractState(query);
    const bestHeight = await web3.eth.getBlockNumber()
    return {
        lastAnchorHeight: lastAnchorHeight,
        tAnchor: tAnchor,
        tFinal: tFinal,
        bestHeight: bestHeight
    }
}


/**
 * Get the anchoring status of Aergo to Ethereum
 * @param {object} web3 Provider (metamask or other web3 compatible)
 * @param {object} hera Herajs client
 * @param {string} bridgeEthAddr Ethereum address of bridge contract
 * @return {number, number, number} last anchor height on eth, anchoring periode, aergo longest chain height
 */
export async function getAergoAnchorStatus(
    web3, 
    hera,
    bridgeEthAddr
) {
    checkEthereumAddress(bridgeEthAddr);
    const lastAnchorHeightStorage = await web3.eth.getStorageAt(
        bridgeEthAddr, 1, 'latest');
    const lastAnchorHeight = new BigNumber(lastAnchorHeightStorage).toNumber()
    const tAnchorStorage = await web3.eth.getStorageAt(
        bridgeEthAddr, 9, 'latest');
    const tAnchor = new BigNumber(tAnchorStorage).toNumber()
    const tFinalStorage = await web3.eth.getStorageAt(
        bridgeEthAddr, 10, 'latest');
    const tFinal = new BigNumber(tFinalStorage).toNumber()
    const head = await hera.blockchain()
    const bestHeight = head.bestHeight
    return {
        lastAnchorHeight: lastAnchorHeight,
        tAnchor: tAnchor,
        tFinal: tFinal,
        bestHeight: bestHeight
    }
}