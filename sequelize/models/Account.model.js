const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    sequelize.define('Wallet', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER
        },
        userId: {
            allowNull: true,
            type: DataTypes.INTEGER,
            unique: true
        },
        accountType: {
            allowNull: false,
            type: DataTypes.ENUM("USER", "ADMIN"),
            unique: true
        },
        walletId: {
            allowNull: false,
            type: DataTypes.INTEGER,
            unique: true
        }
    },
    {
        tableName: 'account'
    });
};