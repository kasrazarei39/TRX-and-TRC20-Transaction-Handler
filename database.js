const sequelize = require('./sequelize');

async function addRowToDepositEvent(accountId, blockNum, toAddress, token, transactionId, value) {
    await sequelize.models.DepositEvent.create(
        {
            accountId: accountId,
            blockNumber: blockNum,
            eventDateTime: new Date(),
            toAddress: toAddress,
            tokenContractAddress: token,
            transactionHash: transactionId,
            walletNotificationStatus: "PENDING",
            value: value
        }
    );
}

async function addRowToColdWalletWithdraw(walletAddress, tokenAddress) {
    const result = await sequelize.models.ColdWalletWithdraw.findAll({
        where: sequelize.and({ address: walletAddress },
            { tokenContractAddress: tokenAddress }, sequelize.or({ status: ['WAITING_FOR_WITHDRAWAL', 'FAILED'] }))
    });

    if (result.length === 0) {
        return await sequelize.models.ColdWalletWithdraw.create(
            { address: walletAddress, status: "WAITING_FOR_WITHDRAWAL", tokenContractAddress: tokenAddress }
        );
    }
}

async function updateColdWalletWithdraw(status, transactionId, blockNumber, amount, withdrawColdRowId) {
    await sequelize.models.ColdWalletWithdraw.update(
        {
            status: status,
            transactionId: transactionId,
            blockNumber: blockNumber,
            eventDateTime: new Date(),
            amount: amount
        },
        { where: { id: withdrawColdRowId } }
    );
}

async function getLatestProccessedBlock() {
    try {
        return await sequelize.models.Setting.findOne(
            { attributes: ['value'], where: { key: "LATEST_PROCESSED_BLOCK" } }
        ).then(setting => setting.value);
    } catch (error) {
        console.log('Error occured in get latest proccessed block')
    }
}

module.exports = {
    addRowToDepositEvent, addRowToColdWalletWithdraw, updateColdWalletWithdraw,
    getLatestProccessedBlock
}