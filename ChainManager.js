import CryptoJS from 'crypto-js';

import Block from './Block';
import Genesis from './Genesis';
import Validator from './Validator';

class ChainManager {

    constructor () {
        this.genesisBlock = Genesis.create();
        this.blockchain = [this.genesisBlock];
    }

    addBlock(newBlock) {
        if (Validator.isValidNewBlock(newBlock, this.getLatestBlock(), ChainManager)) {
            this.blockchain.push(newBlock);
        }
    }

    getLatestBlock() {
        return this.blockchain[this.blockchain.length - 1];
    }

    generateNextBlock(blockData) {
        let previousBlock = this.getLatestBlock(),
            nextIndex = previousBlock.index + 1,
            nextTimestamp = ChainManager.createNextTimeStamp(),
            nextHash = ChainManager.calculateHash(nextIndex, previousBlock.hash, nextTimestamp, blockData);
        return new Block(nextIndex, previousBlock.hash, nextTimestamp, blockData, nextHash);
    }

    replaceChain(newBlocks, message) {
        if (Validator.isValidChain(newBlocks, this.genesisBlock) && newBlocks.length > this.blockchain.length) {
            console.log('Received blockchain is valid. Replacing current blockchain with received blockchain');
            this.blockchain = newBlocks;
            this.broadcast(message);
        } else {
            console.log('Received blockchain invalid');
        }
    };

    static createNextTimeStamp() {
        return new Date().getTime() / 1000;
    }

    static calculateHashForBlock(block) {
        // This should called using `this`
        return ChainManager.calculateHash(block.index, block.previousHash, block.timestamp, block.data);
    }

    static calculateHash(index, previousHash, timestamp, data) {
        return CryptoJS.SHA256(index + previousHash + timestamp + data).toString();
    }


}

module.exports = new ChainManager();
