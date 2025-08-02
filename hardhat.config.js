require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.7.6", // For V3 core contracts compatibility
        settings: {
          optimizer: {
            enabled: true,
            runs: 800,
          },
        },
      }
    ],
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
      helios: "dummy_api_key",
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