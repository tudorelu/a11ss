// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const {ethers: hethers} = require("hardhat");
const ethers = require("ethers");
const { BigNumber } = require("bignumber.js");

let INITIAL_PRICE = BigInt(8) * BigInt(10 ** 15);
let PRICE_MULTI = 10100;
let TOKEN_SUPPLY = BigInt(1_000_000_000) * BigInt(10 ** 18);

async function main() {

  // Deploy the contract

  // Get the contract owner
  const contractOwner = await hethers.getSigners();
  console.log(`Deploying contract from: ${contractOwner[0].address}`);

  // const uniswapRouterAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
  const uniswapRouterAddress = '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24';
  const wethAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
  // 
  // TICKET COUNTER
  // 
  console.log('Deploying VendingMachine...');
  const VendingMachine = await hethers.getContractFactory('VendingMachine');
  const vm = await VendingMachine.deploy(INITIAL_PRICE, PRICE_MULTI, uniswapRouterAddress);
  await vm.waitForDeployment();
  let ticketCounterAddress = await vm.getAddress();
  console.log(`VendingMachine deployed to: ${ticketCounterAddress}`)

  let ticketAddress = await vm.getTicketAddress();
  console.log(`Ticket address deployed to: ${ticketAddress}`)
  let tokenAddress = await vm.getTokenAddress();
  console.log(`Token address deployed to: ${tokenAddress}`)
  let uniswapFunderAddress = await vm.getUniswapFunderAddress();
  console.log(`Uniswap Funder address deployed to: ${uniswapFunderAddress}`)

  await vm.setRules(true);

  //
  // INIT LP With 10 ETH and 1_000_000 TOKENS 
  //
  // const ETH_AMOUNT = (new BigNumber(10).multipliedBy(new BigNumber(10).pow(18))).toString()
  // const TOKEN_AMOUNT = BigInt(1_000_000) * BigInt(10**18)
  // await vm.initializeLP(TOKEN_AMOUNT, {value:ETH_AMOUNT})
  // 
  // TOKEN DEPLOYED ON VENDING MACHINE
  //  
  // await mintTickets(vm, 300);
  
}


const mintTickets = async (vendingMachine, nMints = 1000) => {
    const signers = await hethers.getSigners();
    console.log(`There are ${signers.length} signers`)
    let pmonce = (PRICE_MULTI / 10000);
    let initialPrice = await vendingMachine.getCurrentTicketPrice();
    let expectedLastMinter = null;
    for(let i = 0; i < nMints; i++){
        console.log(`Minting ticket ${i+1}/${nMints}`)
        expectedLastMinter = signers[i%signers.length];
        let mintContract = vendingMachine.connect(expectedLastMinter);
        let mintPrice = Math.round(new BigNumber(initialPrice).multipliedBy(new BigNumber(pmonce).pow(i+1)))
        await mintContract.mint({value:mintPrice.toString()});
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
