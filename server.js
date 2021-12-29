const {Blockchain, Transaction} = require('./src/Blockchain');
const {performance} = require('perf_hooks');

const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

const myKey = ec.keyFromPrivate(
  '1e880d8e129043100d45022e0a4213bcf72962e337ad22516100a1fdbe6c48f5',
);
const address = myKey.getPublic('hex');

const express = require('express')
const app = express()
const port = process.env.PORT || 5000
const path = require('path')

app.use(express.static(path.join(__dirname, 'build')))

//all your api code goes here
app.get('/api', (req, res) => {
  let blockchain = new Blockchain();
  let nTransactions = 200;
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
  res.json({
    message: `Mining process took ${min} minute(s), ${sec} second(s)`
  })
})

app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'))
})

app.listen(port, _ => {
  console.log(`server started on port ${port}`)
})
