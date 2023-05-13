import '@nomiclabs/hardhat-waffle'
import '@nomiclabs/hardhat-etherscan'
import '@openzeppelin/hardhat-upgrades'
import "hardhat-contract-sizer";

export default {
  solidity: {
    compilers: [
      {
        version: '0.8.9',
        settings: {
          evmVersion: 'istanbul',
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ],
  },
  networks: {
    hardhat: {
      forking: {
        url: 'https://ethereum.publicnode.com' // eth
      },
      accounts: {
        mnemonic: 'test test test test test test test test test test test junk',
        initialIndex: 0,
        accountsBalance: '10000000000000000000000000' // 10,000,000 ETH
      },
      gasPrice: 'auto',
      chainId: 1
    },
  },
}
