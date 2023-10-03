const axios = require('axios');
const PropertiesReader = require('properties-reader');
const properties = PropertiesReader("config/config.properties");

async function savePrivate(public, private) {
    const vaultAddress = properties.get("vaultClientApi");
    console.log("vault address: ", vaultAddress)
    try {
        axios.post(vaultAddress, {
            network: "tron",
            public: public,
            private: private
        });
    } catch (ex) {
        console.log(ex);
    }
}

async function getPrivate(public) {
    const vaultAddress = properties.get("vaultClientApi");
    try {
        privateKey = await axios.get(vaultAddress, {params: {"network": "tron", "public": public}});
        return privateKey.data;
    } catch (ex) {
        console.log(ex);
        return null;
    }
}

module.exports = {
    savePrivate, getPrivate
}
