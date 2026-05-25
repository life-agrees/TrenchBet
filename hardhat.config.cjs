require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const getAccounts = () => {
  const pk = process.env.ADMIN_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!pk) return [];
  return [pk.startsWith("0x") ? pk : "0x" + pk];
};

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
       viaIR: true,   
    },
  },
  networks: {
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      accounts: getAccounts(),
      chainId: 84532,
    },
    base: {
      url: process.env.BASE_RPC_URL || "https://mainnet.base.org",
      accounts: getAccounts(),
      chainId: 8453,
    },
    arcTestnet: {
      url: "https://rpc.testnet.arc.network",
      accounts: getAccounts(),
      chainId: 5042002,
    },
    xLayerTestnet: {
      url: "https://testrpc.xlayer.tech",
      accounts: getAccounts(),
      chainId: 1952,
    }
  },
  etherscan: {
    apiKey: process.env.BASESCAN_API_KEY || '',
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org"
        }
      },
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org"
        }
      }
    ]
  }
};