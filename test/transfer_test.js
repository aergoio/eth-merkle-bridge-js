import * as eta from '../src/ethToAergo';
import * as ate from '../src/aergoToEth';
import { AergoClient } from '@herajs/client';
import { Wallet } from '@herajs/wallet';
import Web3 from 'web3';
import { bridgeEthAbi } from "./fixtures/bridgeEthAbi";
import { erc20Abi } from "./fixtures/erc20Abi";
import { BigNumber } from "bignumber.js";

var assert = require('assert').strict;

let web3;
let aergoWallet;
let hera;
let account;
let bridgeAergoAbi;
const aergoPrivKeyEncrypted = "487xqHTkBLr6N31vRpuepjs8bTgUNUqPQgQtc1GqTCRSLpmAZRkEeV87pXEUsQcZHATC1G6PX";
const ethPrivKey = "0xe4dd7889c679013814dfbda165c6457e18595ab04a5a3b9b1443472fc969e15d";
const aergoAddress = "AmNPWDJMjU4g98Scm4AikW8JwQMGwWMztM7Qy8ggxNTkhgZMJHFp";
const ethAddress = "0xfec3c905bcd3d9a5471452e53f82106844cb1e76";
const amount = new BigNumber(10 * 10**18).toString();

// contract addresses taken from eth-merkle-bridge $ make deploy_test_bridge
const bridgeEthAddr = "0x89eD1D1C145F6bF3A7e62d2B8eB0e1Bf15Cb2374";
const bridgeAergoAddr = "AmhAMtqsrf4akxMy89fhiNuyw7u7ooY9TV6Ke5FFctDYpFVAB44V";
const aergoErc20Addr = "0xd898383A12CDE0eDF7642F7dD4D7006FdE5c433e";
const testErc20Addr = "0x3f79E699eBb125054E425BD2cce38225CB861664";
let peggedTestErc20Addr;
const testArc1Addr = "AmgnNKadR4gv2ELgqgtyGM9ec5EnpHj5ai14z3juNmo6m6LsdtEU";

describe('Test erc20 token transfers', function() {
    this.timeout(100000);
    before( async () => {
        // Provider used by sdk to gather chain state information for building transaction before callin aergo connect
        hera = new AergoClient();
        bridgeAergoAbi = await hera.getABI(bridgeAergoAddr);

        // Ethereum provider (simulates metamask connection)
        web3 = new Web3("http://localhost:8545");
        web3.eth.accounts.wallet.add(ethPrivKey);
        web3.eth.defaultAccount = web3.eth.accounts.wallet['0'].address;

        // Aergo wallet replaces aergo connect for testing
        aergoWallet = new Wallet();
        const chainId = await hera.getChainIdHash('base58');
        //console.log(chainId)
        aergoWallet.useChain({
            chainId: chainId,
            nodeUrl: '127.0.0.1:7845'
        });
        account = await aergoWallet.accountManager.addAccount(
            { chainId: chainId, address: aergoAddress });
        await aergoWallet.keyManager.importKey({
            account: account,
            b58encrypted: aergoPrivKeyEncrypted,
            password: '1234'
        });
    });
    describe('Check exceptions', function() {
        it('no exception raised when query withdrawable', async function() {
            const receiverEthAddr = ethAddress;
            const receiverAergoAddr = aergoAddress;
            let unlockable, unfreezable, mintable, pending;

            [unlockable, pending] = await ate.unlockable(
                web3, hera, bridgeEthAddr, bridgeAergoAddr, receiverEthAddr,
                aergoErc20Addr
            );
            assert.deepStrictEqual(unlockable, "0");
            assert.deepStrictEqual(pending, "0");

            [unfreezable, pending] = await eta.unfreezable(
                web3, hera, bridgeEthAddr, bridgeAergoAddr, receiverAergoAddr,
                aergoErc20Addr
            );
            assert.deepStrictEqual(unfreezable, "0");
            assert.deepStrictEqual(pending, "0");

            [mintable, pending] = await eta.mintable(
                web3, hera, bridgeEthAddr, bridgeAergoAddr, receiverAergoAddr,
                testErc20Addr
            );
            assert.deepStrictEqual(mintable, "0");
            assert.deepStrictEqual(pending, "0");
        });
    });
    describe('Aergo Erc20 transfer', function() {
        describe('Ethereum => Aergo', function() {
            it('Should increase approval', async function() {
                const receipt = await eta.increaseApproval(
                    web3, bridgeEthAddr, amount, aergoErc20Addr, erc20Abi);
                assert.deepStrictEqual(receipt.status, true);
            });
            it('Should lock tokens', async function() {
                const receiverAergoAddr = aergoAddress;
                const receipt = await eta.lock(
                    web3, receiverAergoAddr, aergoErc20Addr, amount, bridgeEthAddr,
                    bridgeEthAbi
                );
                assert.deepStrictEqual(receipt.status, true);
            });
            it('Should become unfreezable after anchor', async function() {
                const receiverAergoAddr = aergoAddress;
                let unfreezable = "0";
                let pending;
                while (unfreezable === "0") {
                    [unfreezable, pending] = await eta.unfreezable(
                        web3, hera, bridgeEthAddr, bridgeAergoAddr, receiverAergoAddr,
                        aergoErc20Addr
                    );
                }
                assert.deepStrictEqual(unfreezable, amount);
                assert.deepStrictEqual(pending, "0");
            });
            it('Should build lock proof', async function() {
                const receiverAergoAddr = aergoAddress;
                let proof = await eta.buildLockProof(
                    web3, hera, receiverAergoAddr, aergoErc20Addr, bridgeEthAddr, 
                    bridgeAergoAddr
                );
                assert.notStrictEqual(proof.accountProof.length, 0);
                assert.notStrictEqual(proof.storageProof.length, 0);
            });
            it('Should unfreeze tokens', async function() {
                const receiverAergoAddr = aergoAddress;
                const txSender = aergoAddress;
                const builtTx = await eta.buildUnfreezeTx(
                    web3, hera, txSender, bridgeEthAddr, bridgeAergoAddr, bridgeAergoAbi,
                    receiverAergoAddr, aergoErc20Addr
                );
                const txTracker = await aergoWallet.sendTransaction(account, builtTx);
                const receipt = await txTracker.getReceipt();
                assert.deepStrictEqual(receipt.status, 'SUCCESS');
                assert.deepStrictEqual(receipt.result, `{"_bignum":"${amount}"}`);
            });
        });
        describe('Aergo => Ethereum', function() {
            it('Should freeze tokens', async function() {
                const receiverEthAddr = ethAddress;
                const txSender = aergoAddress;
                const builtTx = await ate.buildFreezeTx(
                    txSender, amount, bridgeAergoAddr, bridgeAergoAbi, receiverEthAddr);
                const txTracker = await aergoWallet.sendTransaction(account, builtTx);
                const receipt = await txTracker.getReceipt();
                assert.deepStrictEqual(receipt.status, 'SUCCESS');
            });
            it('Should become unlockable after anchor', async function() {
                const receiverEthAddr = ethAddress;
                let unlockable = "0";
                let pending;
                while (unlockable === "0") {
                    [unlockable, pending] = await ate.unlockable(
                        web3, hera, bridgeEthAddr, bridgeAergoAddr, receiverEthAddr,
                        aergoErc20Addr
                    );
                }
                assert.deepStrictEqual(unlockable, amount);
                assert.deepStrictEqual(pending, "0");
            });
            it('Should build freeze proof', async function() {
                const receiverEthAddr = ethAddress;
                const proof = await ate.buildFreezeProof(
                    web3, hera, bridgeEthAddr, bridgeAergoAddr, receiverEthAddr,
                    aergoErc20Addr
                );
                assert.notStrictEqual(proof.contractProof.auditPath.length, 0);
                assert.notStrictEqual(proof.varProofs.length, 0);
                assert.deepStrictEqual(proof.contractProof.inclusion, true)
                assert.deepStrictEqual(proof.varProofs[0].inclusion, true)
            });
            it('Should unlock tokens', async function() {
                const receiverEthAddr = ethAddress;
                const receipt = await ate.unlock(
                    web3, hera, bridgeEthAddr, bridgeEthAbi, bridgeAergoAddr, receiverEthAddr,
                    aergoErc20Addr
                );
                assert.deepStrictEqual(receipt.status, true);
            });
        });
    });
    describe('Other Erc20 transfer', function() {
        describe('Ethereum => Aergo', function() {
            it('Should increase approval', async function() {
                const receipt = await eta.increaseApproval(
                    web3, bridgeEthAddr, amount, testErc20Addr, erc20Abi);
                assert.deepStrictEqual(receipt.status, true);
            });
            it('Should lock tokens', async function() {
                const receiverAergoAddr = aergoAddress;
                const receipt = await eta.lock(
                    web3, receiverAergoAddr, testErc20Addr, amount, bridgeEthAddr,
                    bridgeEthAbi
                );
                assert.deepStrictEqual(receipt.status, true);
            });
            it('Should become mintable after anchor', async function() {
                const receiverAergoAddr = aergoAddress;
                let mintable = "0";
                let pending;
                while (mintable === "0") {
                    [mintable, pending] = await eta.mintable(
                        web3, hera, bridgeEthAddr, bridgeAergoAddr, receiverAergoAddr,
                        testErc20Addr
                    );
                }
                assert.deepStrictEqual(mintable, amount);
                assert.deepStrictEqual(pending, "0");
            });
            it('Should build lock proof', async function() {
                const receiverAergoAddr = aergoAddress;
                let proof = await eta.buildLockProof(
                    web3, hera, receiverAergoAddr, testErc20Addr, bridgeEthAddr, 
                    bridgeAergoAddr
                );
                assert.notStrictEqual(proof.accountProof.length, 0);
                assert.notStrictEqual(proof.storageProof.length, 0);
            });
            it('Should mint tokens', async function() {
                const receiverAergoAddr = aergoAddress;
                const txSender = aergoAddress;
                const builtTx = await eta.buildMintTx(
                    web3, hera, txSender, bridgeEthAddr, bridgeAergoAddr, bridgeAergoAbi,
                    receiverAergoAddr, testErc20Addr
                );
                const txTracker = await aergoWallet.sendTransaction(account, builtTx);
                const receipt = await txTracker.getReceipt();
                // the minted token address is returned by the mint transaction
                peggedTestErc20Addr = JSON.parse(receipt.result)[0]
                assert.deepStrictEqual(receipt.status, 'SUCCESS');
                assert.deepStrictEqual(receipt.result, `["${peggedTestErc20Addr}",{"_bignum":"${amount}"}]`);
            });
        });
        describe('Aergo => Ethereum', function() {
            it('Should burn tokens', async function() {
                const receiverEthAddr = ethAddress;
                const txSender = aergoAddress;
                const builtTx = await ate.buildBurnTx(
                    txSender, amount, peggedTestErc20Addr, bridgeAergoAddr, bridgeAergoAbi, 
                    receiverEthAddr
                );
                const txTracker = await aergoWallet.sendTransaction(account, builtTx);
                const receipt = await txTracker.getReceipt();
                assert.deepStrictEqual(receipt.status, 'SUCCESS');
            });
            it('Should become unlockable after anchor', async function() {
                const receiverEthAddr = ethAddress;
                let unlockable = "0";
                let pending;
                while (unlockable === "0") {
                    [unlockable, pending] = await ate.unlockable(
                        web3, hera, bridgeEthAddr, bridgeAergoAddr, receiverEthAddr,
                        testErc20Addr
                    );
                }
                assert.deepStrictEqual(unlockable, amount);
                assert.deepStrictEqual(pending, "0");
            });
            it('Should build burn proof', async function() {
                const receiverEthAddr = ethAddress;
                const proof = await ate.buildBurnProof(
                    web3, hera, bridgeEthAddr, bridgeAergoAddr, receiverEthAddr, 
                    testErc20Addr
                );
                assert.notStrictEqual(proof.contractProof.auditPath.length, 0);
                assert.notStrictEqual(proof.varProofs.length, 0);
                assert.deepStrictEqual(proof.contractProof.inclusion, true)
                assert.deepStrictEqual(proof.varProofs[0].inclusion, true)
            });
            it('Should unlock tokens', async function() {
                const receiverEthAddr = ethAddress;
                const receipt = await ate.unlock(
                    web3, hera, bridgeEthAddr, bridgeEthAbi, bridgeAergoAddr, receiverEthAddr,
                    testErc20Addr
                );
                assert.deepStrictEqual(receipt.status, true);
            });
        });
    });
});