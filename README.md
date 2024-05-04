# Sample Hardhat Project


### TODO:


first, clearly define basic, expected functionality
test basic, expected functionality

unit test all functions

## Ticket

- A TICKET can have 1, 2, 3 or 4 claims.
- All claims are equal. A TICKET with 3 claims is worth exactly three TICKETS with 1 claim. 


## Ticket mint

**_Prerequisites:_**
- User has ETH.
- VendingMachine has opened.
- VendingMachine timer has not ended.

**_Effects:_**
- User sends _ticketPrice_ worth of ETH to VendingMachine.
- VendingMachine sends TICKET to User.
- VendingMachine sends ETH to the Treasury.
- VendingMachine restarts _timer_.
- VendingMachine increases _ticketPrice_.
- (If User overpaid) VendingMachine sends User overpaid amount. 


## Ticket burn

**_Prerequisites:_**
- User owns TICKET.

**_Effects:_**
- User sends TICKET back to VendingMachine, thus burning it.
- VendingMachine mints and sends User a fixed number of TOKENS.
- VendingMachine decreases the total number of claims by the number of claims of the TICKET.
- Reward per claim increases.


### Other


This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a script that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.js
```

## Miscellaneous

Uniswap v2 router address (mainnet, see [here](https://docs.uniswap.org/contracts/v2/reference/smart-contracts/router-02) for others): 
0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D

WETH address (mainnet): 
0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2


Hardhat mainnet [forking](https://hardhat.org/hardhat-network/docs/guides/forking-other-networks)
`npx hardhat node --fork https://eth-mainnet.g.alchemy.com/v2/DPlfUHei9S4mkOk3bhrmbo7KvNgR3YUD`

