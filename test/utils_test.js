import { getEthAnchorStatus, getAergoAnchorStatus, getAergoUnfreezeFee } from '../src/utils';
import { AergoClient } from '@herajs/client';
import Web3 from 'web3';

var assert = require('assert').strict;

let web3;
let hera;
const bridgeAergoAddr = "AmgQqVWX3JADRBEVkVCM4CyWdoeXuumeYGGJJxEeoAukRC26hxmw";
const bridgeEthAddr = "0x89eD1D1C145F6bF3A7e62d2B8eB0e1Bf15Cb2374";

describe('Test util functions', function() {
    before( async () => {
        hera = new AergoClient();
        web3 = new Web3("http://localhost:8545");
    });
    it('Should query Eth anchor status', async function() {
        const status = await getEthAnchorStatus(web3, hera, bridgeAergoAddr);
        assert.deepStrictEqual(status.lastAnchorHeight <= status.bestHeight, true)
        assert.deepStrictEqual(status.tAnchor > 0, true)
        assert.deepStrictEqual(status.tFinal > 0, true)
    });
    it('Should query Aergo anchor status', async function() {
        const status = await getAergoAnchorStatus(web3, hera, bridgeEthAddr);
        assert.deepStrictEqual(status.lastAnchorHeight <= status.bestHeight, true)
        assert.deepStrictEqual(status.tAnchor > 0, true)
        assert.deepStrictEqual(status.tFinal > 0, true)
    });
    it('Should query unfreeze fee', async function() {
        const unfreezeFee = await getAergoUnfreezeFee(hera, bridgeAergoAddr);
        assert.deepStrictEqual(unfreezeFee, "1000")
    });
});
        