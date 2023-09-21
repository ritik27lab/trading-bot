/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {},
    bsc: {
      url: "https://data-seed-prebsc-2-s3.binance.org:8545",
      accounts: ["fae2ddea57dcfbee1de959b19dd9b9d7d90ab544ae7f838b89f118f9d96ee9df"],
    },
    mainnet: {
      url: "https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID",
      accounts: ["YOUR_PRIVATE_KEY"],
    },
  },
};
