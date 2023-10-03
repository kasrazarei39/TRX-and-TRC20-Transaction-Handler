const PropertiesReader = require('properties-reader');
const properties = PropertiesReader("config/config.properties");
const sequelize = require('./sequelize');

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

const axios = require('axios');

const { async } = require('regenerator-runtime');

const apiLimitParam = properties.get("apiLimitParam");
const sleepTime = properties.get("sleepTime");



async function processTrc20Transfers(blockNum) {
    let blockTrc20Transfers = await getTrc20Transfers(blockNum);
    try {
        for await (trc20Transfer of blockTrc20Transfers) {
            if (adminFile.getAddresses() && adminFile.getTokenAddresses() && adminFile.getAddresses().has(trc20Transfer.toAddress) && adminFile.getTokenAddresses().has(trc20Transfer.contractAddress)) {
                console.log(`\n\nFound a deposit event for address: ${trc20Transfer.toAddress}\n\n`);

                const accountId = await sequelize.models.Wallet.findOne({
                    attributes: ['accountId'],
                    where: { address: trc20Transfer.toAddress }
                })
                    .then(wallet => wallet.accountId)

                try {
                    await databaseFile.addRowToDepositEvent(accountId, blockNum, trc20Transfer.toAddress, trc20Transfer.token_contract_address, trc20Transfer.transactionId, trc20Transfer.value);
                    let createdColdWalletWithdraw = await databaseFile.addRowToColdWalletWithdraw(trc20Transfer.toAddress, trc20Transfer.token_contract_address);

                    let minToWithdrawImmediately = await sequelize.models.TokenSetting.findOne(
                        {
                            attributes: ['minNumberForImmediateWithdraw'],
                            where: { contractAddress: trc20Transfer.token_contract_address }
                        }
                    ).then(tokenSetting => tokenSetting.minNumberForImmediateWithdraw);
                    if (+trc20Transfer.value >= +minToWithdrawImmediately) {
                        if (typeof createdColdWalletWithdraw === 'undefined') {
                            createdColdWalletWithdraw = await sequelize.models.ColdWalletWithdraw.findOne({
                                where: sequelize.and
                                    (
                                        { status: 'WAITING_FOR_WITHDRAWAL' },
                                        { tokenContractAddress: trc20Transfer.token_contract_address },
                                        { address: trc20Transfer.toAddress }
                                    )
                            })
                        }

                        let coldWalletWithdrawId = createdColdWalletWithdraw.dataValues.id;

                        console.log("Value: " + trc20Transfer.value + " is greater than min number for withdraw immediately: " + minToWithdrawImmediately);
                        singleWalletWithdrawTrc20ToColdWallet(coldWalletWithdrawId);
                    }
                } catch (e) {
                    console.log(`Error inserting trc20 transfers deposit to database: ${e.message}`);
                }
            }
        }
    } catch (e) {
        console.log('An error occurred in processTrc20Transfers')
        console.log(e);
    }
}

async function getTrc20Transfers(blockNumber) {
    let start = 0;
    let api = properties.get("getTrc20TransfersApi");
    let result;
    let response = [];

    try {
        do {
            result = await axios.get(api, { params: { limit: apiLimitParam, start: start, block: blockNumber } })
            if (result.data.token_transfers.length !== 0) {
                for (let i = 0; i < result.data.token_transfers.length; i++) {
                    if (result.data.token_transfers[i].from_address !== hotWalletAdderss) {
                        response.push({
                            transactionId: result.data.token_transfers[i].transaction_id,
                            toAddress: result.data.token_transfers[i].to_address,
                            value: result.data.token_transfers[i].quant,
                            token_contract_address: result.data.token_transfers[i].contract_address,
                            contractAddress: result.data.token_transfers[i].contract_address
                        })
                    }
                }
            }

            start += result.data.token_transfers.length;
        } while (start < result.data.rangeTotal)
    } catch (e) {
        console.log('An error occurred in getTrc20Transfers')
        console.log(e);
    }
    console.log('Got', start, 'TRC20 Transfers for block:', blockNumber)
    return response;
}


async function singleWalletWithdrawTrc20ToColdWallet(coldWalletWithdrawId) {
    try {
        let coldWalletWithdraw = await sequelize.models.ColdWalletWithdraw.findOne({ where: { id: coldWalletWithdrawId } })
        if (await coldWalletWithdraw['status'] === 'WITHDRAW_IN_PROGRESS') {
            return;
        } else {
            await sequelize.models.ColdWalletWithdraw.update({ status: 'WITHDRAW_IN_PROGRESS' }, { where: { id: coldWalletWithdrawId } });
        }

        const minNumberForWithdraw = await sequelize.models.TokenSetting.findOne(
            { attributes: ['minNumberForWithdraw'], where: { contractAddress: coldWalletWithdraw['tokenContractAddress'] } }
        ).then(tokenSetting => tokenSetting.minNumberForWithdraw);

        let val = await sequelize.models.Setting.findOne(
            { attributes: ['value'], where: { key: "AMOUNT_OF_TRX_SEND_TO_USER_FOR_PAY_FEE" } }
        ).then(setting => setting.value);

        let publicKey = coldWalletWithdraw['address'];

        const privateKey = await vaultFile.getPrivate(publicKey);

        let tokenContract = await loadContract(coldWalletWithdraw['tokenContractAddress'], privateKey);
        balance = await getTokenBalance(tokenContract, publicKey);

        if (+balance >= +minNumberForWithdraw) {
            console.log("Balance: " + balance + " is greater than min number for withdraw: " + minNumberForWithdraw);
            await hotTronWeb.trx.sendTransaction(publicKey, hotTronWeb.toSun(val));
            await sleep(sleepTime * 3);

            let transactionId = await tokenContract.transfer(adminFile.getColdWalletAddress(), balance).send();
            await sleep(sleepTime * adminFile.getNumberOfBlockToVerify());
            transactionInfo = await hotTronWeb.trx.getTransactionInfo(transactionId);
            if (transactionInfo.id) {
                await databaseFile.updateColdWalletWithdraw('COMPLETED', transactionInfo.id, transactionInfo.blockNumber, balance, coldWalletWithdrawId);
            } else {
                await sequelize.models.ColdWalletWithdraw.update({ status: 'FAILED' }, { where: { id: coldWalletWithdrawId } });
            }
        } else {
            await sequelize.models.ColdWalletWithdraw.destroy(
                { where: { id: coldWalletWithdrawId } }
            );
        }
    } catch (e) {
        console.log("Error: ", e);
        await sequelize.models.ColdWalletWithdraw.update({ status: 'FAILED' }, { where: { id: coldWalletWithdrawId } });
    }
}

async function withdrawTrc20ToUserWallet(tokenAddress, toAddress, value) {
    let response = {}

    try {
        let tokenContract = await hotTronWeb.contract().at(tokenAddress);
        let transactionId = await tokenContract.transfer(toAddress, String(value)).send();
        await sleep(10000);

        let transactionInfo = await hotTronWeb.trx.getUnconfirmedTransactionInfo(transactionId);

        if (transactionInfo.receipt.result == "SUCCESS") {
            response = {
                transactionId: transactionInfo.id,
                blockNumber: transactionInfo.blockNumber
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

async function loadContract(contractAddress, privateKey) {
    let tronWeb = new TronWeb(fullNode, solidityNode, eventServer, privateKey);
    let contract = await tronWeb.contract().at(contractAddress);
    return contract;
}

async function getTokenBalance(tokenContract, addr) {
    let balance = await tokenContract.balanceOf(addr).call();
    return balance.toString();
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

module.exports = { processTrc20Transfers, singleWalletWithdrawTrc20ToColdWallet, withdrawTrc20ToUserWallet }
