const { BigNumber } = require("bignumber.js");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

// const { setTimeout } = require("timers/promises");

const mintTicket = async (ticketsContract, minter) => {
    let mintContract = ticketsContract.connect(minter);
    let mintPrice = await ticketsContract.getCurrentTicketPrice();
    await mintContract.mint({value:mintPrice.toString()});
    let mintedTokenId = (await mintContract.nextTokenId()) - BigInt(1);
    // console.log('mintedTokenId '+mintedTokenId);
    return mintedTokenId;
}

// Start test block
describe('TicketCounter', function () {
    before(async function () {

        this.WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
        this.UNIV2_ROUTER = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
        this.VendingMachine = await ethers.getContractFactory('VendingMachine');
        this.Ticket = await ethers.getContractFactory('Ticket');
        this.Token = await ethers.getContractFactory('Token');
        
        this.uniswapRouter = await ethers.getContractAt('UniswapV2Router02', this.UNIV2_ROUTER);
        const FACTORY_ADDRESS = await this.uniswapRouter.factory()
        this.uniswapFactory = await ethers.getContractAt('IUniswapV2Factory', FACTORY_ADDRESS);

        // const pairAddress = await this.uniswapFactory.getPair(this.token.target, this.WETH)  
        // const pair = await ethers.getContractAt('IUniswapV2Pair', pairAddress);
        // await this.token.approve(pairAddress, BigInt(1_000_000_000) * BigInt(10 ** 18));
    });

    beforeEach(async function () {
        // deploy the contract
        this.ONE_ETH = BigInt(4) * BigInt(10 ** 16);
        this.TOTAL_SUPPLY = BigInt(1_000_000_000) * BigInt(10**18);
        this.LP_TOKEN_AMOUNT =  this.TOTAL_SUPPLY / BigInt(10);
        this.LP_ETH_AMOUNT = BigInt(2) * BigInt(10**18);

        this.initialPrice = this.ONE_ETH;
        this.priceMultiplier = 10010;

        this.vendingMachine = await this.VendingMachine.deploy(this.initialPrice.toString(), this.priceMultiplier, this.UNIV2_ROUTER);
        await this.vendingMachine.waitForDeployment();

        this.token = await ethers.getContractAt('Token', await this.vendingMachine.tokenContract());
        this.ticket = await ethers.getContractAt('Ticket', await this.vendingMachine.nftContract());

        // Get the contractOwner and collector address
        this.signers = await ethers.getSigners();
        this.contractOwnerSigner = this.signers[0];
        this.contractOwner = this.signers[0].address;
        this.collector = this.signers[1].address;
        await this.vendingMachine.initializeLP(this.LP_TOKEN_AMOUNT, {value: this.LP_ETH_AMOUNT});

        const pairAddress = await this.uniswapFactory.getPair(this.token.target, this.WETH) 
        this.pair = await ethers.getContractAt('IUniswapV2Pair', pairAddress);
    });

    // Test cases
    it('Created TOKEN and TICKET with name and symbol', async function () {
        expect(await this.ticket.name()).to.exist;
        expect(await this.ticket.symbol()).to.exist;
        expect(await this.token.name()).to.exist;
        expect(await this.token.symbol()).to.exist;
    });

    it('Variables are initialised to 0', async function () { 
        expect(await this.vendingMachine.startingPrice()).to.equal(this.initialPrice.toString());
        expect(await this.vendingMachine.priceMultiplier()).to.equal(this.priceMultiplier);
        expect(await this.vendingMachine.getCurrentTicketPrice()).to.approximately(this.initialPrice, 100);

        expect(await this.vendingMachine.mintStarted()).to.equal(false);
        expect(await this.vendingMachine.nextTokenId()).to.equal(0);
        expect(await this.vendingMachine.lastMintTimestamp()).to.equal(0);
        expect(await this.vendingMachine.lastMinter()).to.equal(ethers.ZeroAddress);

    });

    // it('No mint before mintStarted.', async function () { 
    //     await expect(this.vendingMachine.mint()).to.be.revertedWith('VendingMachine: Mint has not started.');
    // });


    it('Mint price after some mints.', async function () { 
        await this.vendingMachine.setRules(true);
        let nMints = 100;
        let pmonce = (this.priceMultiplier / 10000);
        let priceMultiplier = new BigNumber(pmonce).pow(nMints);

        let initialPrice = await this.vendingMachine.getCurrentTicketPrice();
        let expectedFinalPrice = BigInt(Math.round(new BigNumber(initialPrice).multipliedBy(new BigNumber(pmonce).pow(nMints))));

        let expectedLastMinter = null;
        for(let i = 0; i < nMints; i++){
            expectedLastMinter = this.signers[i%this.signers.length];
            let mintContract = this.vendingMachine.connect(expectedLastMinter);
            let mintPrice = Math.round(new BigNumber(initialPrice).multipliedBy(new BigNumber(pmonce).pow(i+1)))
            await mintContract.mint({value:mintPrice.toString()});
        }
        let actualFinalPrice = await this.vendingMachine.getCurrentTicketPrice();
        expect(expectedFinalPrice).to.approximately(actualFinalPrice, 10**13);
        let actualLastMinter = await this.vendingMachine.lastMinter();
        expect(expectedLastMinter.address).to.equal(actualLastMinter);
        expect(await this.vendingMachine.nextTokenId()).to.equal(nMints);
    });


    it('Mint ends after expiry.', async function () { 
        await this.vendingMachine.setRules(true);
        let expectedLastMinter = null;
        let mintPrice = Math.round(new BigNumber(1).multipliedBy(10**18))
        let nMints = 10;
        for(let i = 0; i < nMints; i++){
            expectedLastMinter = this.signers[i%this.signers.length];
            let mintContract = this.vendingMachine.connect(expectedLastMinter);
            await mintContract.mint({value:mintPrice.toString()});
        }
        expect(await this.vendingMachine.nextTokenId()).to.equal(nMints);
        await expect(this.vendingMachine.mint({value:(mintPrice).toString()})).to.be.ok;
        // increase time to 1 day after mint ends
        await time.increase(3600*24*31);
        await expect(this.vendingMachine.mint({value:(mintPrice).toString()})).to.be.revertedWith("VendingMachine: Mint has ended.");
    });
    
    it('adds LP to contract, checks Uniswap Pair reserves increase', async function () {
        await this.vendingMachine.setRules(true);
        let nMints = 20;
        let pmonce = (this.priceMultiplier / 10000);
        let priceMultiplier = new BigNumber(pmonce).pow(nMints);
        let expectedFinalPrice = BigInt(Math.round(new BigNumber(this.initialPrice).multipliedBy(priceMultiplier)));

        let initialPrice = await this.vendingMachine.getCurrentTicketPrice();
        let reserves = await this.pair.getReserves();
        let availableLPAmount = await this.vendingMachine.availableLPAmount();

        let mintsByAddress = {};
        let mintsByTokenId = {};

        for(let i = 0; i < nMints; i++){
            let minter = this.signers[i%this.signers.length];
            if(!Object.keys(mintsByAddress).includes(minter.address))
                mintsByAddress[minter.address] = [];

            let mintedTokenId = await mintTicket(this.vendingMachine, minter);
            mintsByAddress[minter.address].push(mintedTokenId);
            mintsByTokenId[mintedTokenId] = minter;
        
            let newlyAvailableLPAmount = await this.vendingMachine.availableLPAmount();
            expect(newlyAvailableLPAmount).to.be.above(availableLPAmount);
            availableLPAmount = newlyAvailableLPAmount;

            await this.vendingMachine.fundUniswapLP();

            let newReserves = await this.pair.getReserves();
            expect(newReserves[1] > reserves[1] || newReserves[0] > reserves[0] ).to.be.true;
            reserves = newReserves;

        }
        let actualFinalPrice = await this.vendingMachine.getCurrentTicketPrice();
        expect(expectedFinalPrice).to.approximately(actualFinalPrice, 10**13);

        let minter1 = mintsByTokenId[12];
        let minter2 = mintsByTokenId[14];

        // console.log('mintsByTokenId');
        // console.log(mintsByTokenId);
        // console.log('mintsByAddress');
        // console.log(mintsByAddress);

        // console.log('minter1 '+minter1.address)
        // console.log('minter2 '+minter2.address)

        let preBurn1TokenBalance1 = await this.token.balanceOf(minter1.address);
        let preBurn1TokenBalance2 = await this.token.balanceOf(minter2.address);
        // console.log('preBurn1TokenBalance1 '+preBurn1TokenBalance1)
        // console.log('preBurn1TokenBalance2 '+preBurn1TokenBalance2)
        
        // let tkId1 = mintsByAddress[minter1.address][0];
        // let tkId2 = mintsByAddress[minter2.address][0];
        // console.log('ownerOf  '+tkId1);
        // console.log(await this.ticket.ownerOf(tkId1));
        // console.log('ownerOf  '+tkId2);
        // console.log(await this.ticket.ownerOf(tkId2));

        await this.vendingMachine.connect(minter1).burn(mintsByAddress[minter1.address][0]);
        let postBurn1TokenBalance1 = await this.token.balanceOf(minter1.address);
        let postBurn1TokenBalance2 = await this.token.balanceOf(minter2.address);

        // console.log('postBurn1TokenBalance1 '+postBurn1TokenBalance1)
        // console.log('postBurn1TokenBalance2 '+postBurn1TokenBalance2)

        await this.vendingMachine.connect(minter2).burn(mintsByAddress[minter2.address][0]);
        let postBurn2TokenBalance1 = await this.token.balanceOf(minter1.address);
        let postBurn2TokenBalance2 = await this.token.balanceOf(minter2.address);

        // console.log('postBurn2TokenBalance1 '+postBurn2TokenBalance1)
        // console.log('postBurn2TokenBalance2 '+postBurn2TokenBalance2)

        expect(postBurn1TokenBalance1).to.be.above(preBurn1TokenBalance1);
        expect(postBurn1TokenBalance2).to.be.equal(preBurn1TokenBalance2);

        expect(postBurn2TokenBalance1).to.be.equal(postBurn1TokenBalance1);
        expect(postBurn2TokenBalance2).to.be.above(postBurn1TokenBalance2);
        
    });

    it('Can not burn ticket that does not belong to it', async function () {
        await this.vendingMachine.setRules(true);
        let minter1 = this.signers[0];
        let mintedTokenId = await mintTicket(this.vendingMachine, minter1);
        let minter2 = this.signers[1];
        let vendingMachine2 = this.vendingMachine.connect(minter2);
        await expect(vendingMachine2.burn(mintedTokenId)).to.be.revertedWith("VendingMachine: Sender must own the ticket.");
    });


    it('Can not burn ticket the same ticket twice', async function () {
        await this.vendingMachine.setRules(true);
        let minter = this.signers[0];
        let mintedTokenId = await mintTicket(this.vendingMachine, minter);
        let vendingMachine = this.vendingMachine.connect(minter);
        await vendingMachine.burn(mintedTokenId);
        await expect(vendingMachine.burn(mintedTokenId)).to.be.revertedWith("ERC721: owner query for nonexistent token");
    });
});