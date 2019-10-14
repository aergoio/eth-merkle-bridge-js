import { Contract } from '@herajs/client';
import { keccak256 } from 'web3-utils';
import { BigNumber } from "bignumber.js";


/* Ethereum -> Aergo ERC20 token transfer */
/* ====================================== */


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
    const contract = new web3.eth.Contract(erc20Abi, erc20Addr);
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
    console.log("increaseAllowance() not in abi, trying increaseApproval()");
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
 * @param {object} bridgeEthAbi Bridge ABI array
 * @return {Promise} Promise from web3js send transaction
 */
export function lock(
    web3, 
    receiverAergoAddr, 
    erc20Addr, 
    amount, 
    bridgeEthAddr, 
    bridgeEthAbi
) {
    const contract = new web3.eth.Contract(bridgeEthAbi, bridgeEthAddr);
    return contract.methods.lock(erc20Addr, amount, receiverAergoAddr).send(
        {from: web3.eth.defaultAccount, gas: 300000}
    );
}

/**
 * Get the unfreezeable and pending amounts transfering through the bridge
 * @param {object} web3 Provider (metamask or other web3 compatible)
 * @param {object} hera Herajs client
 * @param {string} bridgeEthAddr 0x Address of bridge contrat
 * @param {string} bridgeAergoAddr Aergo address of bridge contract
 * @param {string} receiverAergoAddr Aergo address of receiver of unfreezed aergo tokens
 * @param {string} aergoErc20Addr 0x Address of aergo erc20
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
    const position = Buffer.concat([Buffer.alloc(31), Buffer.from("03", 'hex')]);
    const accountRef = Buffer.concat([
        Buffer.from(receiverAergoAddr, 'utf-8'), 
        Buffer.from(aergoErc20Addr.slice(2), 'hex')
    ]);
    const ethTrieKey = keccak256(Buffer.concat([accountRef, position]));
    const aergoStorageKey = Buffer.concat([
        Buffer.from('_sv__unfreezes-'.concat(receiverAergoAddr), 'utf-8'),
        Buffer.from(aergoErc20Addr.slice(2), 'hex')
    ]);
    return withdrawable(web3, hera, bridgeEthAddr, bridgeAergoAddr, ethTrieKey,
        aergoStorageKey);
}

export function minteable() {
    throw new Error('Not implemented');
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
    const position = Buffer.concat([Buffer.alloc(31), Buffer.from("03", 'hex')]);
    const accountRef = Buffer.concat([
        Buffer.from(receiverAergoAddr, 'utf-8'), 
        Buffer.from(erc20Addr.slice(2), 'hex')
    ]);
    const ethTrieKey = keccak256(Buffer.concat([accountRef, position]));
    return buildDepositProof(
        web3, hera, bridgeEthAddr, 
        bridgeAergoAddr, ethTrieKey
    );
}

export function mint() {
    throw new Error('Not implemented');
}

/**
 * Build hera tx object to be send to Aergo Connect for signing and broadcasting
 * @param {object} web3 Provider (metamask or other web3 compatible)
 * @param {object} hera Herajs client
 * @param {string} txSender Aergo address of account signing the transaction
 * @param {string} bridgeAergoAddr Aergo address of bridge contract
 * @param {json} bridgeAergoAbi Abi of Aergo bridge contract
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
    bridgeAergoAbi,
    receiverAergoAddr, 
    aergoErc20Addr,
) {
    const proof = await buildLockProof(
        web3, hera, receiverAergoAddr, aergoErc20Addr, bridgeEthAddr, 
        bridgeAergoAddr
    );
    const ap = proof.storageProof[0].proof;
    const balance = {_bignum:proof.storageProof[0].value};
    const args = [receiverAergoAddr, balance, ap];
    const contract = Contract.atAddress(bridgeAergoAddr);
    contract.loadAbi(bridgeAergoAbi);
    const builtTx = await contract.unfreeze(...args).asTransaction({
        from: txSender,
    });
    return builtTx;
}


/* Ethereum -> Aergo pegged ARC1 token transfer */
/* ============================================ */

export function burn() {
    throw new Error('Not implemented');
}
export function unlockeable() {
    throw new Error('Not implemented');
}
export function buildBurnProof() {
    throw new Error('Not implemented');
}
export function unlock() {
    throw new Error('Not implemented');
}



/* Ethereum -> Aergo helpers */
/* ========================= */

/**
 * Build a deposit proof from Ethereum (Lock or Burn)
 * @param {object} web3 Provider (metamask or other web3 compatible)
 * @param {object} hera Herajs client
 * @param {string} bridgeEthAddr 0x Address of bridge contrat
 * @param {string} bridgeAergoAddr Aergo address of bridge contract
 * @param {string} ethTrieKey 0x Hash
 * @return {Promise} Promise from eth_getProof
 */
async function buildDepositProof(
    web3, 
    hera, 
    bridgeEthAddr, 
    bridgeAergoAddr, 
    ethTrieKey
) {
    const contract = Contract.atAddress(bridgeAergoAddr);
    // check last merged height
    let query = contract.queryState("_sv__anchorHeight");
    const lastMergedHeight = await hera.queryContractState(query);
    const proof = await web3.eth.getProof(
        bridgeEthAddr, [ethTrieKey], lastMergedHeight);
    // TODO proof verification
    return proof;
}


/**
 * Get the withdrawable and pending amounts transfering through the bridge
 * @param {object} web3 Provider (metamask or other web3 compatible)
 * @param {object} hera Herajs client
 * @param {string} bridgeEthAddr 0x Address of bridge contrat
 * @param {string} bridgeAergoAddr Aergo address of bridge contract
 * @param {string} ethTrieKey 0x Hash
 * @param {Buffer} aergoStorageKey  key storage bytes (before hashing)
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
    let storageValue = await web3.eth.getStorageAt(
        bridgeEthAddr, ethTrieKey, 'latest');
    const totalDeposit = new BigNumber(storageValue);

    // get total withdrawn and last anchor height
    const aergoBridge = Contract.atAddress(bridgeAergoAddr);
    const query = aergoBridge.queryState(
        ["_sv__anchorHeight", aergoStorageKey]);
    let [lastAnchorHeight, totalWithdrawn] = await hera.queryContractState(query);
    if (totalWithdrawn === undefined) {
        totalWithdrawn = 0;
    }
    totalWithdrawn = new BigNumber(totalWithdrawn);

    // get anchored deposit : total deposit before the last anchor
    storageValue = await web3.eth.getStorageAt(
        bridgeEthAddr, ethTrieKey, lastAnchorHeight);
    const anchoredDeposit = new BigNumber(storageValue);

    // calculate withdrawable and pending
    const withdrawableBalance = anchoredDeposit.minus(totalWithdrawn).toString(10);
    const pending = totalDeposit.minus(anchoredDeposit).toString(10);
    return [withdrawableBalance, pending];
}