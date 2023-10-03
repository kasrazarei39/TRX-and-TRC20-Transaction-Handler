const dbConfig = require("./config/db.config.js");
const Sequelize = require('sequelize');

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
    host: dbConfig.HOST,
    port: dbConfig.PORT,
    schema: dbConfig.SCHEMA,
    dialect: dbConfig.dialect,
    pool: {
        max: dbConfig.pool.max,
        min: dbConfig.pool.min,
        acquire: dbConfig.pool.acquire,
        idle: dbConfig.pool.idle
    },
    define: {
        timestamps: false,
        freezeTableName: true,
        underscored: true,
        query: { plain: true }
    }
});

const modelDefiners = [
    require('./models/Account.model'),
    require('./models/ColdWalletWithdraw.model'),
    require('./models/DepositEvent.model'),
    require('./models/Setting.model'),
    require('./models/TokenSetting.model'),
    require('./models/Wallet.model'),
];

for (const modelDefiner of modelDefiners) {
    modelDefiner(sequelize);
}

module.exports = sequelize;