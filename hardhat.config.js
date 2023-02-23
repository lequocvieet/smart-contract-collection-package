require("@nomicfoundation/hardhat-toolbox");
require('@openzeppelin/hardhat-upgrades');
require("@b10k.io/hardhat-uniswap-v2-deploy-plugin");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.17",
      },
      {
        version: "0.5.16",
        settings: {},
      },
      {
        version: "0.8.9",
        settings: {},
      },

      {
        version: "0.6.6",
        settings: {},
      },
      {
        version: "0.5.10",
        settings: {},
      },
      {
        version: "0.4.0",
        settings: {},
      },
      {
        version: "0.4.23",
        settings: {},
      },
      {
        version: "0.6.12",
        settings: {},
      },
      {
        version: "0.5.12",
        settings: {},
      },
      {
        version: "0.8.0",
        settings: {},
      },
      {
        version: "0.6.4",
        settings: {},
      },
    ],

  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true
    }
  }

};