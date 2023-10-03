const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    sequelize.define('TokenSetting', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER
        },
        contractAddress: {
            allowNull: false,
            type: DataTypes.STRING,
            unique: true
        },
        decimals: {
            allowNull: false,
            type: DataTypes.STRING
        },
        minNumberForWithdraw: {
            allowNull: false,
            type: DataTypes.INTEGER
        },
        name: {
            allowNull: false,
            type: DataTypes.STRING
        },
        symbol: {
            allowNull: false,
            type: DataTypes.STRING
        },
        maxBinanceBalance: {
            allowNull: false,
            type: DataTypes.INTEGER
        },
        minBinanceBalance: {
            allowNull: false,
            type: DataTypes.INTEGER
        },
        minNumberForImmediateWithdraw: {
            allowNull: false,
            type: DataTypes.INTEGER
        }
    },
    {
        tableName: 'token_setting'
    });
};