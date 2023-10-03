const PropertiesReader = require('properties-reader');
const properties = PropertiesReader("config/config.properties");
const sequelize = require('./sequelize');
const axios = require('axios');
const { async } = require('regenerator-runtime');

const databaseFile = require("./database.js");
const adminFile = require("./admin.js");
const vaultFile = require("./vault.js");

const TronWeb = require('tronweb');
const HttpProvider = TronWeb.providers.HttpProvider;
const fullNode = new HttpProvider(properties.get("fullNode"));
const solidityNode = new HttpProvider(properties.get("solidityNode"));
const eventServer = new HttpProvider(properties.get("eventServer"));
const hotWalletAdderss = properties.get("hotWallet.public");
var hotTronWeb;
vaultFile.getPrivate(hotWalletAdderss).then(response => {
    hotWalletKey = response
    hotTronWeb = new TronWeb(fullNode, solidityNode, eventServer, hotWalletKey);
}
)

const apiLimitParam = properties.get("apiLimitParam");
const sleepTime = properties.get("sleepTime");

async function processTrxTransfers(blockNum) {
    let blockTrxTransfers = await getTrxTransfers(blockNum);
    try {
        for await (trxTransfer of blockTrxTransfers) {
            if (adminFile.getAddresses() && adminFile.getAddresses().has(trxTransfer.toAddress)) {
                console.log(`\n\nFound a deposit event for address: ${trxTransfer.toAddress}\n\n`);

                const accountId = await sequelize.models.Wallet.findOne(
                    { attributes: ['accountId'], where: { address: trxTransfer.toAddress } }
                ).then(wallet => wallet.accountId);

                try {
                    databaseFile.addRowToDepositEvent(accountId, blockNum, trxTransfer.toAddress, "trx", trxTransfer.transactionId, trxTransfer.value)
                    let createdColdWalletWithdraw = await databaseFile.addRowToColdWalletWithdraw(trxTransfer.toAddress, "trx");

                    let minToWithdrawImmediately = await sequelize.models.Setting.findOne(
                        {
                            attributes: ['value'],
                            where: { key: "MIN_NUMBER_FOR_IMMEDIATE_WITHDRAW" }
                        }
                    ).then(setting => setting.value);

                    if (trxTransfer.value >= minToWithdrawImmediately) {
                        if (typeof createdColdWalletWithdraw === 'undefined') {
                            createdColdWalletWithdraw = await sequelize.models.ColdWalletWithdraw.findOne({
                                where: sequelize.and
                                    (
                                        { status: 'WAITING_FOR_WITHDRAWAL' },
                                        { tokenContractAddress: "trx" },
                                        { address: trc20Transfer.toAddress }
                                    )
                            })
                        }

                        singleWalletWithdrawTrxToColdWallet(coldWalletWithdrawId);
                    }
                } catch (e) {
                    console.log(`Error inserting trx transfer deposit to database: ${e}`);
                }
            }
        }
    } catch (e) {
        console.log('An error occurred in processTrxTransfers')
        console.log(e);
    }
}

async function getTrxTransfers(blockNumber) {
    let start = 0;
    let api = properties.get("getTrxTransfersApi");
    let result;
    let response = [];
    try {
        do {
            result = await axios.get(api, { params: { limit: apiLimitParam, start: start, block: blockNumber } })
            if (result.data.data.length !== 0) {
                for (let i = 0; i < result.data.data.length; i++) {
                    if (result.data.data[i].tokenInfo.tokenAbbr === 'trx' && result.data.data[i].transferFromAddress !== hotWalletAdderss) {
                        response.push({
                            transactionId: result.data.data[i].transactionHash,
                            toAddress: result.data.data[i].transferToAddress,
                            value: result.data.data[i].amount,
                        })
                    }
                }
            }
            start += result.data.data.length;
        } while (start < result.data.total)
    } catch (e) {
        console.log('An error occurred in getTrxTransfers')
        console.log(e);
    }
    console.log('Got', start, 'TRX Transfers for block:', blockNumber)
    return response;
}






async function processInternalTransactions(blockNum) {
    let blockTrxTransfers = await getInternalTransactions(blockNum);
    try {
        for await (trxTransfer of blockTrxTransfers) {
            if (adminFile.getAddresses() && adminFile.getAddresses().has(trxTransfer.toAddress)) {
                console.log(`\n\nFound a internal transactions for address: ${trxTransfer.toAddress}\n\n`);

                const accountId = await sequelize.models.Wallet.findOne(
                    { attributes: ['accountId'], where: { address: trxTransfer.toAddress } }
                ).then(wallet => wallet.accountId);

                try {
                    databaseFile.addRowToDepositEvent(accountId, blockNum, trxTransfer.toAddress, "trx", trxTransfer.transactionId, trxTransfer.value);
                    let createdColdWalletWithdraw = await databaseFile.addRowToColdWalletWithdraw(trxTransfer.toAddress, "trx");
                    let coldWalletWithdrawId = createdColdWalletWithdraw.dataValues.id;
                    let minToWithdrawImmediately = await sequelize.models.Setting.findOne(
                        {
                            attributes: ['value'],
                            where: { key: "MIN_NUMBER_FOR_IMMEDIATE_WITHDRAW" }
                        }
                    ).then(setting => setting.value);

                    if (+trxTransfer.value >= +minToWithdrawImmediately) {
                        console.log("TRX value: " + trxTransfer.value + " is greater than min number for withdraw immediately: " + minToWithdrawImmediately);
                        singleWalletWithdrawTrxToColdWallet(coldWalletWithdrawId);
                    }
                } catch (e) {
                    console.log(`Error inserting internal transactions deposit to database: ${e}`);
                }
            }
        }
    } catch (e) {
        console.log('An error occurred in processInternalTransactions')
        console.log(e);
    }
}

async function getInternalTransactions(blockNum) {
    let api = properties.get("getInternalTransactionsApi");
    let internalTransactionsApiKey = properties.get("internalTransactionsApiKey");
    let response = [];

    const body = JSON.stringify({ num: blockNum });
    try {
        const res = await axios.post(api, body, {
            headers: {
                'TRON-PRO-API-KEY': internalTransactionsApiKey
            }
        }
        )
        for (let i = 0; i < res.data.length; i++) {
            if (res.data[i].internal_transactions) {
                for (let j = 0; j < res.data[i].internal_transactions.length; j++) {
                    if (res.data[i].internal_transactions[j].callValueInfo[0].callValue) {
                        response.push({
                            transactionId: res.data[i].id,
                            toAddress: hotTronWeb.address.fromHex(res.data[i].internal_transactions[j].transferTo_address),
                            value: res.data[i].internal_transactions[j].callValueInfo[0].callValue,
                        })
                    }
                }
            }
        }

    } catch (e) {
        console.log('An error occurred in getInternalTransactions')
        console.log(e);
    }
    console.log('Got', response.length, 'Internal transaction for block:', blockNum)

    return response;
}

async function singleWalletWithdrawTrxToColdWallet(coldWalletWithdrawId) {
    try {
        let coldWalletWithdraw = await sequelize.models.ColdWalletWithdraw.findOne({ where: { id: coldWalletWithdrawId } })
        if (await coldWalletWithdraw['status'] === 'WITHDRAW_IN_PROGRESS') {
            return;
        } else {
            await sequelize.models.ColdWalletWithdraw.update({ status: 'WITHDRAW_IN_PROGRESS' }, { where: { id: coldWalletWithdrawId } });
        }
        let publicKey = coldWalletWithdraw['address'];

        const privateKey = await vaultFile.getPrivate(publicKey);

        let tempTronWeb = new TronWeb(fullNode, solidityNode, eventServer, privateKey);
        let account = await tempTronWeb.trx.getAccount(
            publicKey,
        );

        if (!account.balance) {
            await sequelize.models.ColdWalletWithdraw.destroy({ where: { id: coldWalletWithdrawId } });
        } else {
            let walletBandWidth = await tempTronWeb.trx.getBandwidth(publicKey);
            let minAmountOfTrxForFee = await sequelize.models.Setting.findOne(
                { attributes: ['value'], where: { key: "MIN_AMOUNT_OF_TRX_FOR_FEE" } }
            ).then(setting => setting.value);
            let minBandwidthForFee = await sequelize.models.Setting.findOne(
                { attributes: ['value'], where: { key: "MIN_BANDWIDTH_FOR_FEE" } }
            ).then(setting => setting.value);

            let balance = account.balance;
            let transactionResponse;
            if (walletBandWidth < minBandwidthForFee) {
                balance -= minAmountOfTrxForFee;
            }

            transactionResponse = await tempTronWeb.trx.sendTransaction(adminFile.getColdWalletAddress(), balance);

            await sleep(sleepTime * adminFile.getNumberOfBlockToVerify());
            transactionInfo = await hotTronWeb.trx.getTransactionInfo(transactionResponse.txid);
            if (transactionInfo.id) {
                await databaseFile.updateColdWalletWithdraw('COMPLETED', transactionInfo.id, transactionInfo.blockNumber, balance, coldWalletWithdrawId);
            } else {
                await sequelize.models.ColdWalletWithdraw.update({ status: 'FAILED' }, { where: { id: coldWalletWithdrawId } });
            }
        }
    } catch (e) {
        console.log("Error: ", e);
        await sequelize.models.ColdWalletWithdraw.update({ status: 'FAILED' }, { where: { id: coldWalletWithdrawId } });
    }
}


async function withdrawTrxToUserWallet(toAddress, value) {
    let response = {}
    try {
        let transactionInfo = await hotTronWeb.trx.sendTransaction(toAddress, value);
        await sleep(10000);
        if (transactionInfo.result) {
            let unconfirmedTransactionInfo = await hotTronWeb.trx.getUnconfirmedTransactionInfo(transactionInfo.txid);
            response = {
                transactionId: unconfirmedTransactionInfo.id,
                blockNumber: unconfirmedTransactionInfo.blockNumber
            }
        } else {
            response = { transactionId: "Error", blockNumber: null }
        }
        return JSON.stringify(response);
    } catch (e) {
        response = { transactionId: "Error", blockNumber: null }
        return JSON.stringify(response);
    }
}

module.exports = { processTrxTransfers, processInternalTransactions, withdrawTrxToUserWallet, singleWalletWithdrawTrxToColdWallet }

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}