module.exports = {
  networks: {
    development: {
      host: "127.0.0.1", // Localhost (default: none)
      port: 7545,        // Ganache GUI default port
      network_id: "*",   // Match any network id
    },
  },
  compilers: {
    solc: {
      version: "0.8.0", // Specify the Solidity compiler version
    },
  },
};
