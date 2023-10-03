module.exports = {
    HOST: "localhost",
    PORT: 5443,
    USER: "kiosk",
    PASSWORD: "kiosk",
    DB: "kiosk",
    SCHEMA: "tron",
    dialect: "postgres",
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
};
