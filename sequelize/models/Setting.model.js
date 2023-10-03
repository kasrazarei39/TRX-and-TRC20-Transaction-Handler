const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    sequelize.define('Setting', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER
        },
        key: {
            allowNull: false,
            type: DataTypes.ENUM("NUMBER_OF_BLOCKS_PASSED_TO_VERIFY", "PERIODIC_WITHDRAWAL_TIME_FROM_ACCOUNTS",
                "AMOUNT_OF_TRX_SEND_TO_USER_FOR_PAY_FEE", "MINIMUM_HOT_WALLET_BALANCE", "LATEST_PROCESSED_BLOCK"),
            unique: true
        },
        value: {
            allowNull: false,
            type: DataTypes.INTEGER
        }
    },
    {
        tableName: 'setting'
    });
};