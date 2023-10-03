const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    sequelize.define('DepositEvent', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER
        },
        accountId: {
            allowNull: false,
            type: DataTypes.INTEGER
        },
        toAddress: {
            allowNull: false,
            type: DataTypes.STRING
        },
        value: {
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
        walletNotificationStatus: {
            allowNull: true,
            type: DataTypes.STRING
        },
        tokenContractAddress: {
            allowNull: false,
            type: DataTypes.STRING
        },
        transactionHash: {
            allowNull: true,
            type: DataTypes.STRING
        }
    },
    {
        tableName: 'deposit_event'
    });
};