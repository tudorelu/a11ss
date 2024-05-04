// launch ERC20 (Token)
// launch ERC721 (Ticket)
// launch Uniswap pair
// fund initial Uniswap LP
// mint 1000 Tickets
// burn some Tickets
// trade some Tokens
// scripts/interact.js
const { ethers } = require("hardhat");

async function main() {
    console.log('Getting the non fun token contract...\n');
    const contractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
    const pass = await ethers.getContractAt('AllocationPass', contractAddress);
    const signers = await ethers.getSigners();


}