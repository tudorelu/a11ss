require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers")
require('dotenv').config()

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity:{
    compilers: [
      {
        version: "0.6.6",
        settings: {},
      },
    ],
  },
  defaultNetwork: "baseSepolia",
  networks: {
    baseSepolia: {
      url: "https://base-sepolia.g.alchemy.com/v2/xD14N4DjOZG-8mFI5nifyjf3qezGE4L7",
      accounts: [process.env.PK],
    },
    localhost: {
      forking: {
        url: "https://eth-mainnet.g.alchemy.com/v2/DPlfUHei9S4mkOk3bhrmbo7KvNgR3YUD",
      }
    }
  }
};
