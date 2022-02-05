const APP_ID = 'yY0c6bOSUnJ3Ws8e8isqWyYlupqwZx5HB2YAR2X4';
const JAVASCRIPT_KEY = "9UjsOmCJOXDofoWydBV473DEkawUXwYpsFc2fpU4";
Parse.serverURL = 'https://parseapi.back4app.com/'

console.info("Initializing Application", APP_ID);
Parse.initialize(APP_ID, JAVASCRIPT_KEY);

const {performance} = require('perf_hooks');

const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

const myKey = ec.keyFromPrivate(
  '1e880d8e129043100d45022e0a4213bcf72962e337ad22516100a1fdbe6c48f5',
);

const address = myKey.getPublic('hex');

class Transaction {
  constructor(fromAddress, toAddress, amount) {
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.amount = amount;
  }

  calculateHash() {
    var CryptoJS = require('crypto-js');

    return CryptoJS.SHA256(
      this.fromAddress + this.toAddress + this.amount,
    ).toString();
  }

  signTransaction(signingKey) {
    if (signingKey.getPublic('hex') !== this.fromAddress) {
      throw new Error('You cannot sign transactions!');
    }

    const hashTx = this.calculateHash();
    const sig = signingKey.sign(hashTx, 'base64');
    this.signature = sig.toDER('hex');
  }

  isValid() {
    if (this.fromAddress === null) {
      return true;
    }

    if (!this.signature || this.signature.length === 0) {
      throw new Error('No signature in the transaction');
    }

    const EC = require('elliptic').ec;
    const ec = new EC('secp256k1');

    const publicKey = ec.keyFromPublic(this.fromAddress, 'hex');
    return publicKey.verify(this.calculateHash(), this.signature);
  }
}

class Block {
  constructor(timestamp, transactions, previousHash = '') {
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.hash = this.calculateHash();
    this.nonce = 0;
  }

  calculateHash() {
    const content =
      this.previousHash +
      this.timestamp +
      JSON.stringify(this.transactions) +
      this.nonce;

    var CryptoJS = require('crypto-js');

    return CryptoJS.SHA256(content).toString();
  }

  mineBlock(difficulty) {
    while (
      this.hash.substring(0, difficulty) !== Array(difficulty + 1).join('0')
    ) {
      this.nonce++;
      this.hash = this.calculateHash();
    }

    console.log('Block mined:' + this.hash);
  }

  hasValidTransactions() {
    for (const tx of this.transactions) {
      if (!tx.isValid()) {
        return false;
      }
    }

    return true;
  }
}

class Blockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.difficulty = 2;
    this.pendingTransactions = [];
    this.miningReward = 100;
  }

  createGenesisBlock() {
    return new Block(Date.now(), 'Genesis Block', '0');
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  addBlock(newBlock) {
    newBlock.previousHash = this.getLatestBlock().hash;
    newBlock.mineBlock(this.difficulty);
    this.chain.push(newBlock);
  }

  minePendingTransactions(miningRewardAddress, difficulty = this.difficulty) {
    const rewardTx = new Transaction(
      null,
      miningRewardAddress,
      this.miningReward,
    );
    this.pendingTransactions.push(rewardTx);

    let block = new Block(
      Date.now(),
      this.pendingTransactions,
      this.getLatestBlock().hash,
    );
    block.mineBlock(difficulty);

    console.log('Block successfully mined');
    this.chain.push(block);

    this.pendingTransactions = [
      new Transaction(null, miningRewardAddress, this.miningReward),
    ];
  }

  addTransaction(transaction) {
    if (!transaction.fromAddress || !transaction.toAddress) {
      throw new Error('Transaction must include from and to address');
    }

    if (!transaction.isValid()) {
      throw new Error('Cannot add invalida transaction to chain');
    }

    this.pendingTransactions.push(transaction);
  }

  getBalanceOfAddress(address) {
    let balance = 0;

    for (const block of this.chain) {
      for (const trans of block.transactions) {
        if (trans.fromAddress === address) {
          balance -= trans.amount;
        }

        if (trans.toAddress === address) {
          balance += trans.amount;
        }
      }
    }

    return balance;
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (!currentBlock.hasValidTransactions()) {
        return false;
      }

      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }

      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
    }
    return true;
  }
}

Parse.Cloud.define("blockchain", async (request) => {
  let blockchain = new Blockchain();
  let nTransactions = 10;
  let difficulty = 2;

  for (let x = 0; x < nTransactions; x++) {
    let transaction = new Transaction(address, 'public key goes here', 10);
    transaction.signTransaction(myKey);
    blockchain.addTransaction(transaction);
  }

  console.log('\n Starting the miner...');
  var startTime = performance.now();
  blockchain.minePendingTransactions(address, difficulty);
  var endTime = performance.now();

  var totalTime = endTime - startTime;

  var min = Math.floor((totalTime / 1000 / 60) << 0);
  var sec = Math.floor((totalTime / 1000) % 60);

  console.log(totalTime + ' milliseconds');
  console.log(`Call to doSomething took ${min} minute(s), ${sec} second(s)`);

  console.log(
    'Balance of xavier is',
    blockchain.getBalanceOfAddress(address),
  );

  console.log('Is chain valid?', blockchain.isChainValid());
  return `Mining process took ${min} minute(s), ${sec} second(s)`;
});

