# eth-merkle-bridge-js  
## JS SDK for Ethereum <-> Aergo Merkle bridge.

### Quick start
```console
npm i eth-merkle-bridge-js
```

Send Aergo ERC20 tokens by locking on Ethereum and Unfreezing on Aergo.
```js
import {ethToAergo as eta} from 'eth-merkle-bridge-js';
import Web3 from 'web3';
import { AergoClient } from '@herajs/client';

// get providers to connect with networks
let web3 = new Web3(window.ethereum);
let accountId = await ethereum.enable();
web3.eth.defaultAccount = accountId[0];
let hera = new AergoClient(); // connect to localhost:7845 by default

// arguments
const bridgeEthAddr = "0x89eD1D1C145F6bF3A7e62d2B8eB0e1Bf15Cb2374";
const bridgeAergoAddr = "AmgQqVWX3JADRBEVkVCM4CyWdoeXuumeYGGJJxEeoAukRC26hxmw";
const aergoErc20Addr = "0xd898383A12CDE0eDF7642F7dD4D7006FdE5c433e";
const receiverAergoAddr = "AmNMFbiVsqy6vg4njsTjgy7bKPFHFYhLV4rzQyrENUS9AM1e3tw5";
const amount = "10000000000000000000" // 10 aergoErc20 with 18 decimals
let bridgeAergoAbi 
(async () => { bridgeAergoAbi = await hera.getABI(bridgeAergoAddr) })();


// LOCK TOKENS
// send any ERC20 from Ethereum to Aergo
const receipt = await eta.increaseApproval(
    web3, bridgeEthAddr, amount, aergoErc20Addr, erc20Abi);
const receipt = await eta.lock(
    web3, receiverAergoAddr, aergoErc20Addr, amount, bridgeEthAddr, 
    bridgeEthAbi
);

// Check unfreezeable and pending balances
let [unfreezeable, pending] = await eta.unfreezeable(
    web3, hera, bridgeEthAddr, bridgeAergoAddr,
    receiverAergoAddr, aergoErc20Addr
);

// UNFREEZE TOKENS
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

// send built tx with aergo connect
const tx = await aergoConnectCall(
    'SEND_TX', 'AERGO_SEND_TX_RESULT', builtTx);
// then get tx receipt with tx.hash
```

### Documentation
#### Aergo ERC20
##### Send aergo ERC20 from Ethereum to Aergo
- ethToAergo.increaseApproval()
- ethToAergo.lock()
- ethToAergo.unfreezeable()
- ethToAergo.buildUnfreezeTx()

##### Send native(unfreezed) aergo from Aergo back to Ethereum (Erc20 form)
- aergoToEth.buildFreezeTx()
- aergoToEth.unlockeable()
- aergoToEth.unlock()

#### Other ERC20 tokens
##### Send ERC20 from Ethereum to Aergo
- ethToAergo.increaseApproval()
- ethToAergo.lock()
- ethToAergo.minteable()
- ethToAergo.buildMintTx()

##### Send minted token from Aergo back to Ethereum (Erc20 form)
- aergoToEth.buildBurnTx()
- aergoToEth.unlockeable()
- aergoToEth.unlock()

#### ARC1 Aergo native tokens
- TODO

#### Utils
- utils.getEthAnchorStatus()
- utils.getAergoAnchorStatus()

### Contribute

#### Setup
```console
npm install
```
#### Test
```console
npm test
```
