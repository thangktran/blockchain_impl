import * as crypto from 'crypto';
import { WSASYSCALLFAILURE } from 'node:constants';

class Transaction {
    constructor(
        public amount: number,
        public senderPubKey: string,
        public receiverPubKey: string
    ){}

    serialize(){
        return JSON.stringify(this);
    }
}

class Block {
    public nonce = Math.round(Math.random() * 999999999);

    constructor(
        public prevHash: string,
        public transaction: Transaction,
        public timestamp = Date.now()
    ){}

    get hash() {
        const str = JSON.stringify(this);
        const hash = crypto.createHash('SHA256');
        hash.update(str).end();
        return hash.digest('hex');
    }
}

class Chain {
    public static instance = new Chain();
    ledger: Block[];

    constructor() {
        this.ledger = [new Block('', new Transaction(100, 'genesis', 'satoshi'))];
    }

    get lastBlock() {
        return this.ledger[this.ledger.length-1];
    }

    addBlock(transaction: Transaction, senderPubKey: string, signature: Buffer) {
        const verifier = crypto.createVerify('SHA512');
        verifier.update(transaction.serialize());

        const isValid = verifier.verify(senderPubKey, signature);

        if (isValid){
            const newBlock = new Block(this.lastBlock.hash, transaction);
            this.mine(newBlock.nonce);
            this.ledger.push(newBlock);
        }
    }

    mine(nonce: number) {
        console.log('mining...');
        let result = 1;

        while (true) {
            const hash = crypto.createHash('MD5');
            // hash.update((nonce + result).toString()).end(); -> cause error. somehow attempt will never change.
            hash.update((nonce + result).toString());

            const attempt = hash.digest('hex');

            if (attempt.substr(0, 4) === '0000') {
                console.log(`mined: ${result}`);
                return result;
            }

            result += 1;
        }
    }
}

class Wallet {
    public pubKey: string;
    private privateKey: string;

    constructor() {
        const keyPair = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {type:'spki', format:'pem'},
            privateKeyEncoding: {type:'pkcs8', format:'pem'}
        })

        this.pubKey = keyPair.publicKey;
        this.privateKey = keyPair.privateKey;
    }

    sendMoney(amount: number, receiverPubKey: string) {
        const transaction = new Transaction(amount, this.pubKey, receiverPubKey);
        const sign = crypto.createSign('SHA512');
        sign.update(transaction.serialize()).end();
        const signature = sign.sign(this.privateKey);
        Chain.instance.addBlock(transaction, this.pubKey, signature);
    }
}


// example
const satoshi = new Wallet();
const bob = new Wallet();
const alice = new Wallet();

satoshi.sendMoney(50, bob.pubKey);
bob.sendMoney(23, alice.pubKey);
alice.sendMoney(5, bob.pubKey);

console.log(Chain.instance);


// let result = 1;
// while (true) {
//     const hash = crypto.createHash('SHA256');
//     hash.update((result).toString()).end();

//     const attempt = hash.digest('hex');

//     if (attempt.substr(0, 4) === '0000') {
//         console.log(`mined: ${result}`);
//     }

//     result += 1;
// }
