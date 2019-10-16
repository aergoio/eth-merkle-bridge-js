import Web3 from 'web3';
import { AergoClient } from '@herajs/client';
import {ethToAergo as eta} from 'eth-merkle-bridge-js';
import { bridgeEthAbi } from "../test/fixtures/bridgeEthAbi";
import { erc20Abi } from "../test/fixtures/erc20Abi";
import { BigNumber } from "bignumber.js";

// aergo-connect helper
function aergoConnectCall(action, responseType, data) {
    return new Promise((resolve) => {
        window.addEventListener(responseType, function(event) {
            resolve(event.detail);
        }, { once: true });
        window.postMessage({
            type: 'AERGO_REQUEST',
            action: action,
            data: data,
        });
    });
}

// metamask helper -> reconnect for each tx so the default account can be updated
// probably a better way to take into account the user changing account
async function getWeb3Provider() {
    let web3 = new Web3(window.ethereum);
    let accountId = await ethereum.enable();
    console.log("WEB3 Accounts:", accountId)
    web3.eth.defaultAccount = accountId[0];
    return web3
}

// connect to localhost:7845 by default
let hera = new AergoClient();
console.log(hera)

// contract addresses taken from eth-merkle-bridge $ make deploy_test_bridge
const bridgeEthAddr = "0x89eD1D1C145F6bF3A7e62d2B8eB0e1Bf15Cb2374";
const bridgeAergoAddr = "AmgQqVWX3JADRBEVkVCM4CyWdoeXuumeYGGJJxEeoAukRC26hxmw";
const aergoErc20Addr = "0xd898383A12CDE0eDF7642F7dD4D7006FdE5c433e";
let bridgeAergoAbi 
(async () => { bridgeAergoAbi = await hera.getABI(bridgeAergoAddr) })();


document.getElementById("approval").onclick = async () => {
    document.getElementById('info').innerHTML = "";
    let amount = document.getElementById("amount").value;
    amount = BigNumber(amount).times(10**18).toString(10);
    let web3 = await getWeb3Provider();
    const receipt = await eta.increaseApproval(
        web3, bridgeEthAddr, amount, aergoErc20Addr, erc20Abi);
    console.log("INCREASE APPROVAL RECEIPT:", receipt);
    let info = document.createElement('div');
    info.innerHTML += "Increase approval status: " + receipt.status;
    document.getElementById('info').appendChild(info);
}

document.getElementById("lock").onclick = async () => {
    let amount = document.getElementById("amount").value;
    amount = BigNumber(amount).times(10**18).toString(10);
    let web3 = await getWeb3Provider();
    const receiverAergoAddr = document.getElementById("receiver").value;
    const receipt = await eta.lock(
        web3, receiverAergoAddr, aergoErc20Addr, amount, bridgeEthAddr, 
        bridgeEthAbi
    );
    console.log("LOCK RECEIPT:", receipt);
    let info = document.createElement('div');
    info.innerHTML += "Lock status: " + receipt.status;
    document.getElementById('info').appendChild(info);
}
document.getElementById("unfreeze").onclick = async () => {
    const receiverAergoAddr = document.getElementById("receiver").value;

    // get aergo connect signer
    const signer = await aergoConnectCall(
        'ACTIVE_ACCOUNT', 'AERGO_ACTIVE_ACCOUNT', {});
    const txSender = signer.account.address;

    // build unfreeze tx params
    // metamask web3.eth provider doesn't implement getProof so use custom provider to query
    let blockoWeb3 = new Web3("http://localhost:8545");
    let builtTx = await eta.buildUnfreezeTx(
        blockoWeb3, hera, txSender, bridgeEthAddr, bridgeAergoAddr,
        bridgeAergoAbi, receiverAergoAddr, aergoErc20Addr
    );
    builtTx.to = bridgeAergoAddr;
    builtTx.payload_json = JSON.parse(builtTx.payload);
    delete builtTx.payload

    //builtTx = JSON.parse(JSON.stringify(builtTx))
    //builtTx.nonce = state.nonce + 1
    //const chainId = await hera.getChainIdHash('base58');
    //builtTx.chainIdHash = chainId
    //const signature = await aergoConnectCall('SIGN_TX', 'AERGO_SIGN_TX_RESULT', builtTx);
    //console.log('AERGO_SIGN_TX_RESULT', signature);


    // send built tx with aergo connect
    const tx = await aergoConnectCall(
        'SEND_TX', 'AERGO_SEND_TX_RESULT', builtTx);
    console.log('AERGO_SEND_TX_RESULT', tx);

    setTimeout(async () => {
        const receipt = await hera.getTransactionReceipt(tx.hash)
        console.log("UNFREEZE RECEIPT:", receipt);
        let info = document.createElement('div');
        info.innerHTML += "Unfreeze status: " + receipt.status;
        document.getElementById('info').appendChild(info);
    }, 2000)
}

document.getElementById("unfreezeable").onclick = async () => {
    const receiverAergoAddr = document.getElementById("receiver").value;
    let blockoWeb3 = new Web3("http://localhost:8545");
    let status = await eta.unfreezeable(
        blockoWeb3, hera, bridgeEthAddr, bridgeAergoAddr,
        receiverAergoAddr, aergoErc20Addr
    );
    console.log(status);
    let withdrawable = document.createElement('div');
    let pending = document.createElement('div');
    withdrawable.innerHTML += "Unfreezeable now: " + BigNumber(status[0]).dividedBy(10**18).toString();
    pending.innerHTML += "Pending new bridge anchor: " + BigNumber(status[1]).dividedBy(10**18).toString();
    document.getElementById('info').appendChild(withdrawable);
    document.getElementById('info').appendChild(pending);
}