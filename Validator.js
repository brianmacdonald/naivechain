import Block from './Block';
import Genesis from './Genesis';

class Validator {

    static isValidNewBlock(newBlock, previousBlock, manager) {
        if (previousBlock.index + 1 !== newBlock.index) {
            console.log('invalid index');
            return false;
        } else if (previousBlock.hash !== newBlock.previousHash) {
            console.log('invalid previoushash');
            return false;
        } else if (manager.calculateHashForBlock(newBlock) !== newBlock.hash) {
            console.log(typeof (newBlock.hash) + ' ' + typeof manager.calculateHashForBlock(newBlock));
            console.log('invalid hash: ' + manager.calculateHashForBlock(newBlock) + ' ' + newBlock.hash);
            return false;
        }
        return true;
    }

    static isValidChain(blockchainToValidate, genesisBlock) {
        if (JSON.stringify(blockchainToValidate[0]) !== JSON.stringify(genesisBlock)) {
            return false;
        }
        var tempBlocks = [blockchainToValidate[0]];
        for (var i = 1; i < blockchainToValidate.length; i++) {
            if (Validator.isValidNewBlock(blockchainToValidate[i], tempBlocks[i - 1])) {
                tempBlocks.push(blockchainToValidate[i]);
            } else {
                return false;
            }
        }
        return true;
    }

}

module.exports = Validator;

