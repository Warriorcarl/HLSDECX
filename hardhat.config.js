require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20", // Use a single version to avoid download issues
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    helios: {
      url: "https://testnet1.helioschainlabs.org/",
      chainId: 42000,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto",
    },
  },
  etherscan: {
    apiKey: {
      helios: "dummy_api_key", // Helios explorer might not require API key
    },
    customChains: [
      {
        network: "helios",
        chainId: 42000,
        urls: {
          apiURL: "https://explorer.helioschainlabs.org/api",
          browserURL: "https://explorer.helioschainlabs.org/"
        }
      }
    ]
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
};
