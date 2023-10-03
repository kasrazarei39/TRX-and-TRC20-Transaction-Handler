const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    sequelize.define('ColdWalletWithdraw', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER
        },
        address: {
            allowNull: false,
            type: DataTypes.STRING
        },
        amount: {
            allowNull: true,
            type: DataTypes.BIGINT
        },
        blockNumber: {
            allowNull: true,
            type: DataTypes.BIGINT
        },
        eventDateTime: {
            allowNull: true,
            type: DataTypes.DATE
        },
        status: {
            allowNull: true,
            type: DataTypes.ENUM("WAITING_FOR_WITHDRAWAL", "WITHDRAW_IN_PROGRESS", "WAITING_FOR_CONFIRMATION", "FAILED", "COMPLETED")
        },
        tokenContractAddress: {
            allowNull: false,
            type: DataTypes.STRING
        },
        transactionId: {
            allowNull: true,
            type: DataTypes.STRING
        }
    },
    {
        tableName: 'cold_wallet_withdraw'
    });
};