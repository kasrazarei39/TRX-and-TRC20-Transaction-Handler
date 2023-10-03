const PropertiesReader = require('properties-reader');
const { async } = require('regenerator-runtime');
const properties = PropertiesReader("config/config.properties");

const vaultFile = require("./vault.js");

const TronWeb = require('tronweb');
const HttpProvider = TronWeb.providers.HttpProvider;
const fullNode = new HttpProvider(properties.get("fullNode"));
const solidityNode = new HttpProvider(properties.get("solidityNode"));
const eventServer = new HttpProvider(properties.get("eventServer"));
var hotTronWeb;
vaultFile.getPrivate(properties.get("hotWallet.public")).then(response => {
    hotWalletKey = response
    hotTronWeb = new TronWeb(fullNode, solidityNode, eventServer, hotWalletKey);
}
)
const sequelize = require('./sequelize');

var coldWalletAddress = properties.get("coldWalletAddress");
var addresses = new Set();
var tokenAddresses = new Set();
var numberOfBlockToVerify;

function getAddresses() {
    return addresses;
}

function getTokenAddresses() {
    return tokenAddresses;
}

function getNumberOfBlockToVerify() {
    return numberOfBlockToVerify;
}

async function loadAllAddresses() {
    return await sequelize.models.Wallet.findAll({
        attributes: ['address'],
        raw: true
    }).then(wallets => wallets.forEach(wallet => {
        addresses.add(wallet.address)
    }));
}

async function loadAllTokenAddresses() {
    return await sequelize.models.TokenSetting.findAll({
        attributes: ['contractAddress'],
        raw: true
    }).then(tokenSettings => tokenSettings.forEach(tokenSetting => {
        tokenAddresses.add(tokenSetting.contractAddress)
    }));
}

async function loadNumberOfBlockToVerify() {
    numberOfBlockToVerify = await sequelize.models.Setting.findOne(
        { attributes: ['value'], where: { key: "NUMBER_OF_BLOCKS_PASSED_TO_VERIFY" } }
    ).then(setting => setting.value);
}

async function createWallet() {
    console.log("Enter to create wallet")
    let result = await hotTronWeb.createAccount();
    try {
        await sequelize.models.Wallet.create(
            { address: result.address.base58 }
        );
        console.log("Before save private")
        await vaultFile.savePrivate(result.address.base58, result.privateKey);
        addresses.add(result.address.base58);
    } catch (e) {
        console.log(`Error inserting wallet to database: ${e.message}`);
    }
    return JSON.stringify(result.address.base58);
}

function getColdWalletAddress() {
    return coldWalletAddress;
}

async function getTrxBalance(address) {
    let response;
    try {
        response = await hotTronWeb.trx.getAccount(
            address,
        );
    } catch (e) {
        return JSON.stringify(`Error: ${e.message}`);
    }
    return JSON.stringify(response.balance);
}

async function getTokenBalance(tokenContractAddress, address) {
    let response;
    try {
        let tokenContract = await hotTronWeb.contract().at(tokenContractAddress);
        response = await tokenContract.balanceOf(address).call();
    } catch (e) {
        return JSON.stringify(`Error: ${e.message}`);
    }
    return JSON.stringify(response.toString());
}

async function getTransactionStatus(transactionId) {
    let transactionInfo = await hotTronWeb.trx.getTransactionInfo(transactionId);
    if (transactionInfo.id) {
        return true;
    } else {
        return false;
    }
}

function addToken(tokenAddress) {
    tokenAddresses.add(tokenAddress);
}

function deleteToken(tokenAddress) {
    tokenAddresses.delete(tokenAddress);
}

function updateNumberOfBlockToVerify(value) {
    numberOfBlockToVerify = parseInt(value);
}

async function getCurrentBlock() {
    let currentBlock = await hotTronWeb.trx.getCurrentBlock();
    return JSON.stringify(currentBlock.block_header.raw_data.number);
}

async function getTransactionInfo(transactionId) {
    let txInfo = await hotTronWeb.trx.getTransactionInfo(transactionId);

    let response = {
        id: txInfo.id,
        blockNumber: txInfo.blockNumber,
        blockTimeStamp: txInfo.blockTimeStamp,
        contract_address: txInfo.contract_address
    }

    return response;
}

async function getTokenInformation(tokenAddress) {
    let tokenName;
    let tokenSymbol;
    let tokenDecimal;

    console.log('Get information for token: ', tokenAddress)

    try {
        tokenContract = await hotTronWeb.contract().at(tokenAddress);
        tokenName = await tokenContract.name().call();
        tokenSymbol = await tokenContract.symbol().call();
        tokenDecimal = await tokenContract.decimals().call();
        if (tokenDecimal._isBigNumber) {
            tokenDecimal = parseInt(tokenDecimal._hex, 16);
        }
    } catch (e) {
        return JSON.stringify(`Error: ${e.message}`);
    }
    let response = {
        name: tokenName,
        symbol: tokenSymbol,
        decimal: tokenDecimal,
    }

    console.log('token information: ', response)
    return JSON.stringify(response);
}

async function changeColdWalletAddress(newColdWalletAddress) {
    let result = await hotTronWeb.trx.getAccount(coldWalletAddress);
    if (result.create_time) {
        coldWalletAddress = newColdWalletAddress;
        return true;
    } else {
        return JSON.stringify("Not Registered");
    }
}

async function getAdminWalletAddress() {
    return JSON.stringify(coldWalletAddress)
}

module.exports = {
    getAddresses, getTokenAddresses, getNumberOfBlockToVerify, loadNumberOfBlockToVerify,
    createWallet, getColdWalletAddress, getTrxBalance, getTransactionStatus, addToken,
    deleteToken, updateNumberOfBlockToVerify, getCurrentBlock, getTransactionInfo,
    getTokenInformation, changeColdWalletAddress,
    loadAllAddresses, loadAllTokenAddresses, getTokenBalance, getAdminWalletAddress
}
