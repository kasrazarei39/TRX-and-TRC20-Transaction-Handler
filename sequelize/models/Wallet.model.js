const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    sequelize.define('Wallet', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER
        },
        address: {
            allowNull: false,
            type: DataTypes.STRING,
            unique: true
        },
        accountId: {
            allowNull: true,
            type: DataTypes.INTEGER,
            unique: true
        }
    },
    {
        tableName: 'wallet'
    });
};