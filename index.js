const express = require("express");
const asyncHandler = require('express-async-handler');
const sequelize = require('./sequelize');

var app = express();
app.use(express.json());

const { async } = require('regenerator-runtime');



const trxTransactionFile = require("./trxTransaction.js");
const trc20TransactionFile = require("./trc20Transaction.js");
const adminFile = require("./admin.js");
const databaseFile = require("./database.js");


/* Get Transfers */

app.listen(3000, asyncHandler(async (req, res, next) => {

    console.log('App started.');

    console.log('Load all addresses from db');
    adminFile.loadAllAddresses()

    console.log('Load all token addresses from db');
    adminFile.loadAllTokenAddresses()

    console.log('Load number of block to verify');
    adminFile.loadNumberOfBlockToVerify()

    var latestBlockNumber;

    // Get latest block number from db
    latestBlockNumber = await databaseFile.getLatestProccessedBlock()

    // if db block number not available, get current block
    if (latestBlockNumber < 0) {
        latestBlockNumber = await adminFile.getCurrentBlock();
    }

    console.log(`Starting from block number: ${latestBlockNumber}\n\n`);

    // Infinte loop to scan blocks and find transfers
    while (true) {
        console.log(`Start processing block number: ${latestBlockNumber}`);

        try {
            let currentBlockNumber = (await adminFile.getCurrentBlock());
            if (latestBlockNumber > currentBlockNumber - adminFile.getNumberOfBlockToVerify()) {
                console.log(`Block number (${latestBlockNumber}) is greater than current block number (${currentBlockNumber}), wait for 3 seconds...`);
                await sleep(3000);
                continue;
            }
        } catch (e) {
            console.log('Error getting latest block number');
        }
        try {
            console.log("Get trx transfers of block " + latestBlockNumber);
            trxTransactionFile.processTrxTransfers(latestBlockNumber);

            console.log("Get internal transactions of block " + latestBlockNumber);
            trxTransactionFile.processInternalTransactions(latestBlockNumber);

            console.log("Get trc20 transfers of block " + latestBlockNumber);
            trc20TransactionFile.processTrc20Transfers(latestBlockNumber);

        } catch (e) {
            console.log(`Error processing transactions: ${e}`);
        }
        try {
            await sequelize.models.Setting.update(
                { value: latestBlockNumber },
                { where: { key: "LATEST_PROCESSED_BLOCK" } }
            );
            latestBlockNumber++;
        } catch (e) {
            console.log('Error writing latest processed block');
        }
    }
}));


app.get("/get-cold-wallet-address", asyncHandler(async (req, res, next) => {
    res.send(JSON.stringify(adminFile.getColdWalletAddress()))
}));

app.get("/get-trx-balance/:address", asyncHandler(async (req, res, next) => {
    res.send(await adminFile.getTrxBalance(req.params.address));
}));

app.get("/get-token-balance/:tokenContractAddress/:address", asyncHandler(async (req, res, next) => {
    res.send(await adminFile.getTokenBalance(req.params.tokenContractAddress, req.params.address));
}));

app.post("/withdraw-tokens/:tokenContractAddress", asyncHandler(async (req, res, next) => {
    res.send(await trc20TransactionFile.withdrawTrc20ToUserWallet(req.params.tokenContractAddress, req.body.address, req.body.amount))
}));

app.post("/withdraw-trx", asyncHandler(async (req, res, next) => {
    res.send(await trxTransactionFile.withdrawTrxToUserWallet(req.body.address, req.body.amount))

}));

app.get("/get-transaction-status/:transactionId", asyncHandler(async (req, res, next) => {
    res.send(await adminFile.getTransactionStatus(req.params.transactionId))
}));

app.post("/create-wallet", asyncHandler(async (req, res, next) => {
    res.send(await adminFile.createWallet());
}));

app.post("/add-token/:tokenAddress", asyncHandler(async (req, res, next) => {
    adminFile.addToken(req.params.tokenAddress)
    res.sendStatus(200);
}));

app.delete("/delete-token/:tokenAddress", asyncHandler(async (req, res, next) => {
    adminFile.deleteToken(req.params.tokenAddress)
    res.sendStatus(200);
}));

app.put("/update-number-of-block-to-verify/:value", asyncHandler(async (req, res, next) => {
    adminFile.updateNumberOfBlockToVerify(req.params.value);
    res.sendStatus(200);
}));

app.get("/current-block", asyncHandler(async (req, res, next) => {
    res.send(await adminFile.getCurrentBlock())
}));

app.get("/tx-info/:txId", asyncHandler(async (req, res, next) => {
    res.send(await adminFile.getTransactionInfo(req.params.txId));
}));

app.get("/get-token-information/:tokenAddress", asyncHandler(async (req, res, next) => {
    res.send(await adminFile.getTokenInformation(req.params.tokenAddress))

}));

app.post("/change-cold-wallet-address/:coldWalletAddress", asyncHandler(async (req, res, next) => {
    res.send(await adminFile.changeColdWalletAddress(req.params.coldWalletAddress))
}));

app.post("/withdraw-to-cold-wallet", asyncHandler(async (req, res, next) => {
    try {
        const withdrawColdRows = await sequelize.models.ColdWalletWithdraw.findAll(
            { where: sequelize.and({ tokenContractAddress: 'trx' }, sequelize.or({ status: ['WAITING_FOR_WITHDRAWAL', 'FAILED'] })) }
        )
        for (const withdrawColdRow of withdrawColdRows) {
            trxTransactionFile.singleWalletWithdrawTrxToColdWallet(withdrawColdRow['id']);
        }
    } catch (e) {
        console.log("Error: ", e);
    }
    res.sendStatus(200);
}));

app.post("/withdraw-token-to-cold-wallet/:tokenAddress", asyncHandler(async (req, res, next) => {
    let tokenContractAddress = req.params.tokenAddress;

    const withdrawColdRows = await sequelize.models.ColdWalletWithdraw.findAll(
        { where: sequelize.and({ tokenContractAddress: tokenContractAddress }, sequelize.or({ status: ['WAITING_FOR_WITHDRAWAL', 'FAILED'] })) }
    )
    for (const withdrawColdRow of withdrawColdRows) {
        trc20TransactionFile.singleWalletWithdrawTrc20ToColdWallet(withdrawColdRow['id'])
    }
    res.sendStatus(200);
}));

app.get("/get-admin-wallet-address", asyncHandler(async (req, res, ) => {
    res.send(await adminFile.getAdminWalletAddress());
}))

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
