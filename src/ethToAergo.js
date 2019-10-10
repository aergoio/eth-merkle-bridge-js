import { Contract } from '@herajs/client';
import { keccak256 } from 'web3-utils';
import { BigNumber } from "bignumber.js";


/**
 * Increase approval so the bridge contract can pull assets
 * @param {object} web3 Provider (metamask or other web3 compatible)
 * @param {string} spender 0x Address able to spend on behalf of asset owner
 * @param {string} amount Spendeable amount by spender
 * @param {string} erc20Addr 0x Address of asset 
 * @param {object} erc20Abi Erc20 ABI array
 * @return {Promise} Promise from web3js send transaction
 */
export function increaseApproval(
    web3, 
    spender, 
    amount, 
    erc20Addr, 
    erc20Abi
) {
    let contract = new web3.eth.Contract(erc20Abi, erc20Addr)
    let promise;
    try {
        promise = contract.methods.increaseAllowance(spender, amount).send(
            {from: web3.eth.defaultAccount, gas: 300000}
        );
        return promise;
    } catch(error) {
        if (!error instanceof TypeError) {
            return promise;
        }
    }
    console.log("increaseAllowance() not in abi, trying increaseApproval()")
    return contract.methods.increaseApproval(spender, amount).send(
        {from: web3.eth.defaultAccount, gas: 300000}
    );
}

/**
 * Lock assets in the Ethereum bridge contract
 * @param {object} web3 Provider (metamask or other web3 compatible)
 * @param {string} receiverAergoAddr Aergo address that receive minted/unfeezed tokens
 * @param {string} erc20Addr 0x Address of asset
 * @param {string} amount Amount to lock
 * @param {string} bridgeEthAddr 0x Address of bridge contrat
 * @param {object} bridgeAbi Bridge ABI array
 * @return {Promise} Promise from web3js send transaction
 */
export function lock(
    web3, 
    receiverAergoAddr, 
    erc20Addr, 
    amount, 
    bridgeEthAddr, 
    bridgeAbi
) {
    let contract = new web3.eth.Contract(bridgeAbi, bridgeEthAddr)
    return contract.methods.lock(erc20Addr, amount, receiverAergoAddr).send(
        {from: web3.eth.defaultAccount, gas: 300000}
    );
}

/**
 * 
 * @param {object} web3 Provider (metamask or other web3 compatible)
 * @param {object} hera Herajs client
 * @param {string} receiverAergoAddr Aergo address that receive minted/unfeezed tokens
 * @param {string} erc20Addr 0x Address of asset
 * @param {string} bridgeEthAddr 0x Address of bridge contrat
 * @param {string} bridgeAergoAddr Aergo address of bridge contract
 * @return {Promise} Promise from eth_getProof
 */
export async function buildLockProof(
    web3, 
    hera, 
    receiverAergoAddr, 
    erc20Addr, 
    bridgeEthAddr, 
    bridgeAergoAddr
) {
    // build lock proof in last merged height 
    // user should have waited and checked withdrawable amount
    // UI should monitor new anchor so that minting doesnt fail just after a new anchor
    let position = Buffer.concat([Buffer.alloc(31), Buffer.from("03", 'hex')]);
    let accountRef = Buffer.concat([
        Buffer.from(receiverAergoAddr, 'utf-8'), 
        Buffer.from(erc20Addr.slice(2), 'hex')
    ]);
    let trieKey = keccak256(Buffer.concat([accountRef, position]));
    return buildDepositProof(
        web3, hera, bridgeEthAddr, 
        bridgeAergoAddr, trieKey
    );
}
export function mint() {}

/**
 * Build hera tx object to be send to Aergo Connect for signing and broadcasting
 * @param {object} web3 Provider (metamask or other web3 compatible)
 * @param {object} hera Herajs client
 * @param {string} txSender Aergo address of account signing the transaction
 * @param {string} bridgeAergoAddr Aergo address of bridge contract
 * @param {string} receiverAergoAddr Aergo address that receive minted/unfeezed tokens
 * @param {proof} proof Result of eth_getProof 
 * @return {object} Herajs tx object
 */
export async function buildUnfreezeTx(
    web3,
    hera, 
    txSender,
    bridgeEthAddr,
    bridgeAergoAddr, 
    receiverAergoAddr, 
    aergoErc20Addr,
) {
    let proof = await buildLockProof(
        web3, hera, receiverAergoAddr, aergoErc20Addr, bridgeEthAddr, 
        bridgeAergoAddr
    );
    let ap = proof.storageProof[0].proof;
    let balance = {_bignum:proof.storageProof[0].value};
    let args = [receiverAergoAddr, balance, ap];
    let abi = await hera.getABI(bridgeAergoAddr);
    let contract = Contract.atAddress(bridgeAergoAddr);
    contract.loadAbi(abi);
    let builtTx = await contract.unfreeze(...args).asTransaction({
        from: txSender,
    });
    return builtTx
}

export function burn() {}
export function buildBurnProof() {}
export function unlock() {}


/**
 * Get the unfreezeable and pending amounts transfering through the bridge
 * @param {object} web3 Provider (metamask or other web3 compatible)
 * @param {object} hera Herajs client
 * @param {string} bridgeEthAddr 0x Address of bridge contrat
 * @param {string} bridgeAergoAddr Aergo address of bridge contract
 * @param {*} ethTrieKey 
 * @param {*} aergoStorageKey 
 * @return {string, string} Amount withdrawable now, amount pending new state root anchor
 */
export async function unfreezeable(
    web3,
    hera,
    bridgeEthAddr,
    bridgeAergoAddr,
    receiverAergoAddr, 
    aergoErc20Addr, 
) {
    let position = Buffer.concat([Buffer.alloc(31), Buffer.from("03", 'hex')]);
    let accountRef = Buffer.concat([
        Buffer.from(receiverAergoAddr, 'utf-8'), 
        Buffer.from(aergoErc20Addr.slice(2), 'hex')
    ]);
    let ethTrieKey = keccak256(Buffer.concat([accountRef, position]));
    let aergoStorageKey = Buffer.concat([
        Buffer.from('_sv__unfreezes-'.concat(receiverAergoAddr), 'utf-8'),
        Buffer.from(aergoErc20Addr.slice(2), 'hex')
    ]);
    return withdrawable(web3, hera, bridgeEthAddr, bridgeAergoAddr, ethTrieKey, aergoStorageKey)
}


/**
 * Build a deposit proof from Ethereum (Lock or Burn)
 * @param {object} web3 Provider (metamask or other web3 compatible)
 * @param {object} hera Herajs client
 * @param {string} bridgeEthAddr 0x Address of bridge contrat
 * @param {string} bridgeAergoAddr Aergo address of bridge contract
 * @param {string} trieKey Hash
 * @return {Promise} Promise from eth_getProof
 */
async function buildDepositProof(
    web3, 
    hera, 
    bridgeEthAddr, 
    bridgeAergoAddr, 
    trieKey
) {
    const contract = Contract.atAddress(bridgeAergoAddr);
    // check last merged height
    let query = contract.queryState("_sv__anchorHeight");
    let lastMergedHeightTo = await hera.queryContractState(query);
    let proof = await web3.eth.getProof(bridgeEthAddr, [trieKey], lastMergedHeightTo);
    // TODO proof verification
    return proof
}


/**
 * Get the withdrawable and pending amounts transfering through the bridge
 * @param {object} web3 Provider (metamask or other web3 compatible)
 * @param {object} hera Herajs client
 * @param {string} bridgeEthAddr 0x Address of bridge contrat
 * @param {string} bridgeAergoAddr Aergo address of bridge contract
 * @param {*} ethTrieKey 
 * @param {*} aergoStorageKey 
 * @return {string, string} Amount withdrawable now, amount pending new state root anchor
 */
async function withdrawable(
    web3,
    hera,
    bridgeEthAddr,
    bridgeAergoAddr,
    ethTrieKey,
    aergoStorageKey
) {
    // totalDeposit : total latest deposit including pending
    let storageValue = await web3.eth.getStorageAt(bridgeEthAddr, ethTrieKey, 'latest');
    let totalDeposit = new BigNumber(web3.utils.hexToNumberString(storageValue));

    // get total withdrawn and last anchor height
    const contract = Contract.atAddress(bridgeAergoAddr);
    let query = contract.queryState(["_sv__anchorHeight", aergoStorageKey]);
    let [lastAnchorHeight, totalWithdrawn] = await hera.queryContractState(query);
    if (totalWithdrawn === undefined) {
        totalWithdrawn = 0;
    }
    totalWithdrawn = new BigNumber(totalWithdrawn);

    // get anchored deposit : total deposit before the last anchor
    storageValue = await web3.eth.getStorageAt(bridgeEthAddr, ethTrieKey, lastAnchorHeight);
    let anchoredDeposit = new BigNumber(web3.utils.hexToNumberString(storageValue));

    // calculate withdrawable and pending
    let withdrawableBalance = anchoredDeposit.minus(totalWithdrawn).toString(10);
    let pending = totalDeposit.minus(anchoredDeposit).toString(10);
    return [withdrawableBalance, pending]
}