// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

// import "hardhat/console.sol";

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import { UniswapFunder } from "../contracts/UniswapFunder.sol";
import { Ticket } from "../contracts/Ticket.sol";
import { Token } from "../contracts/Token.sol";

/**
 * @title VendingMachine
 * @author flu7e
 * @notice This contract is the main contract of the project. 
 * It is responsible for Ticket and Token emissions and handling the accounting of the Tokens.
 */
contract VendingMachine is Ownable {
    
    event Mint(address indexed to, uint256 indexed tokenId);

    uint256 public startingPrice;
    uint256 public priceMultiplier;
    uint256 _currentPrice;

    bool public mintStarted;

    uint256 public nextTokenId;
    uint256 public lastMintTimestamp;
    address public lastMinter;
    uint256 public MINT_EXPIRES_AFTER = 3600 * 24 * 30;
    uint256 public TOKEN_MINT_AMOUNT = 10_000 ether;


    uint256 public noTickets;
    uint256 public noTicketsSub10;        // sub 10 tickets have 4 claims
    uint256 public noTicketsSub100;       // sub 100 tickets have 3 claims
    uint256 public noTicketsSub1000;      // sub 1000 tickets have 2 claims
    uint256 public remainingClaims;

    uint256 public lastTokenId;

    uint256 public immutable lpRatio = 20;
    uint256 public immutable finalMinterRatio = 50;
    uint256 public immutable allMintersRatio = 20;
    uint256 public immutable teamRatio = 10;

    uint256 public usedLPAmount;
    uint256 public availableLPAmount;
    uint256 public finalMinterAmount;
    uint256 public allMintersAmount;
    uint256 public teamAmount;

    Ticket public nftContract;
    Token public tokenContract;
    // UniswapFunder public uniswapFunder;

    modifier whileMintIsOngoing() {
        // require(mintStarted, "VendingMachine: Mint has not started.");
        require(lastTokenId == 0 || !mintEnded(), "VendingMachine: Mint has ended.");
        _;
    }

    modifier afterMintEnded() {
        require(mintEnded(), "VendingMachine: Mint has not ended.");
        _;
    }

    constructor(uint256 _startingPrice, uint256 _priceMultiplier, address _uniswapRouter) public {
        startingPrice = _startingPrice;
        priceMultiplier = _priceMultiplier;
        _currentPrice = (_startingPrice * 10000) / _priceMultiplier;
        nftContract = new Ticket('TIXXX', 'TIX');
        tokenContract = new Token('TOKEN', 'TKZ');
        // uniswapFunder = new UniswapFunder(address(tokenContract), _uniswapRouter);
        // console.log("nftContract address %o ", address(nftContract));
        // console.log("tokenContract address %o ", address(tokenContract));
        // console.log("uniswapFunder address %o ", address(uniswapFunder));
    }

    function initializeLP(uint256 tokenAmount) public payable onlyOwner() {
        // console.log("initializeLP(): tokenAmount %o", tokenAmount);
        // tokenContract.mint(address(uniswapFunder), tokenAmount);
        // uniswapFunder.initializeLP{value:msg.value}(tokenAmount);
    }

    function setRules(bool _mintStarted) public onlyOwner() {
        if(!mintStarted){
            mintStarted = _mintStarted;
        }
    }

    
    function getTicketAddress() public view returns(address) {
        return address(nftContract);
    }


    function getTokenAddress() public view returns(address) {
        return address(tokenContract);
    }


    // function getUniswapFunderAddress() public view returns(address) {
    //     return address(uniswapFunder);
    // }


    /**
     * Calculates the multiplier of the given tokenId. 
     * The multiplier determines the amount of reward a ticket holder 
     * gets when holding onto his ticket until after the mint ends.
     * @param tokenId tokenId whose multiplier is calculated
     */
    function getTicketMultiplier(uint256 tokenId) public view returns(uint256) {
        if(tokenId > lastTokenId || nftContract.ownerOf(tokenId) == address(0))
            return 0;
        if(tokenId <= 10) 
            return 4;
        if(tokenId <= 100) 
            return 3;
        if(tokenId <= 1000) 
            return 2;
        return 1;
    }

    /**
     * Returns the reward that the holder of tokenId is entitled to.
     * @param tokenId the id of the ticket whose reward is being checked.
     */
    function getTicketReward(uint256 tokenId) public view returns(uint256) {
        return getTicketMultiplier(tokenId) * allMintersAmount / remainingClaims;
    }

    function mintEnded() public view returns(bool) {
        return timeUntilEnd() <= 0;
    }

    function getCurrentTicketPrice() public view returns (uint256) {
        uint256 newPrice = (_currentPrice * priceMultiplier) / 10000;
        return newPrice;
    }
        
    function timeUntilEnd() public view returns (uint256) {
        require(mintStarted, "Ticket: Mint has not started.");
        uint256 withdrawalTime = lastMintTimestamp + MINT_EXPIRES_AFTER;
        if (withdrawalTime < block.timestamp) return 0;
        return withdrawalTime - block.timestamp;
    }

    struct TicketInfo {
        uint256 timeUntilEnd;
        uint256 ticketPrice;
        bool mintStarted;
        uint256 nextTokenId;
        uint256 lastMintTimestamp;
        uint256 mintEndTimestamp;
        address lastMinter;
        uint256 lastTokenId;
        uint256 noTickets;
        uint256 noTicketsSub10;
        uint256 noTicketsSub100;
        uint256 noTicketsSub1000;
        uint256 remainingClaims;
        uint256 usedLPAmount;
        uint256 availableLPAmount;
        uint256 finalMinterAmount;
        uint256 allMintersAmount;
        uint256 teamAmount;
        address ticketAddress;
        address tokenAddress;
        address uniswapFunderAddress;
        address uniswapPairAddress;
        uint112 reserve0;
        uint112 reserve1;
        uint112 price;
        uint112 inverted_price;
    }

    function getInfo() public view returns (TicketInfo memory) {
        // (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast) = uniswapFunder.uniswapPair().getReserves();
        // uint112 price = reserve1 / reserve0;
        // uint112 adjusted_price = price / (10 ** (18 - 18));
        // uint112 inverted_price = 1 / adjusted_price;
        // uniswapFunder.
        TicketInfo memory toReturn = TicketInfo(
            mintStarted?timeUntilEnd():0, 
            getCurrentTicketPrice(), 
            mintStarted, 
            nextTokenId, 
            lastMintTimestamp, 
            lastMintTimestamp+MINT_EXPIRES_AFTER,
            lastMinter, lastTokenId, 
            noTickets, noTicketsSub10, 
            noTicketsSub100, noTicketsSub1000, 
            remainingClaims, 
            usedLPAmount, availableLPAmount, 
            finalMinterAmount, 
            allMintersAmount, teamAmount,
            address(nftContract), 
            address(tokenContract), 
            address(nftContract),
            address(nftContract),
            1, 
            1,
            1,
            1
            // address(uniswapFunder),
            // address(uniswapFunder.uniswapPair()),
            // reserve0, 
            // reserve1,
            // price,
            // inverted_price
        );
        return toReturn;
    }

    /**
     * Allows users to buy Tickets. Each Ticket has a claim to either the final reward,
     * if mint ended, or a fixed amount of Token, if mint is still ongoing. 
     * 
     * There is no other way to mint Tickets than to buy them from the VendingMachine.
     * There is no other way to mint Token than to cash in a Ticket, before mint ends.
     */
    function mint() public payable whileMintIsOngoing() {

        uint256 newPrice = getCurrentTicketPrice();

        require(msg.value >= newPrice, "VendingMachine: Mint price is higher.");
        // console.log("VendingMachine mint(): newPrice %o and msg.value is %o", newPrice, msg.value);

        lastMinter = _msgSender();
        nftContract.mint(lastMinter, nextTokenId);

        lastTokenId = nextTokenId;
        _mintTicketAccounting(nextTokenId, newPrice);
        remainingClaims += getTicketMultiplier(nextTokenId);

        nextTokenId = nextTokenId + 1;
        _currentPrice = newPrice;

        if (msg.value > newPrice) {
            bool success2 = payable(lastMinter).send(msg.value - newPrice);
            require(success2, "VendingMachine: Overpay transfer failed.");
        }
        lastMintTimestamp = block.timestamp;

        emit Mint(lastMinter, lastTokenId);
    }


    /** 
     * Allows User to cash their Ticket in return for either the a small portion of the 
     * final reward pot if mint ended, or a fixed amount of Token, if mint is still ongoing.
     * 
     * There is no other way to mint Token than to cash in a Ticket, before mint ends.
     */
    function burn(uint256 tokenId) public {
        // console.log("burnTicket: tokenId %o", tokenId);
        require(nftContract.ownerOf(tokenId) == _msgSender(), "VendingMachine: Sender must own the ticket.");
        if(mintEnded()){
            _cashTicketAfterEnd(tokenId);
        } else {
            _cashTicketBeforeEnd(tokenId);
        }
    }

    /**
     * Withdraws the reward of the last ticket minted, into the account of the winner.
     * Callable once mint was ended.
     */
    function withdrawReward(address receiver) public {
        address sender = _msgSender();
        require(mintEnded(), "VendingMachine: Mint has to end first, before claiming reward.");
        require(nftContract.ownerOf(lastTokenId) == sender, "VendingMachine: Sender must own the last ticket.");
        nftContract.burn(lastTokenId);
        payable(receiver).transfer(finalMinterAmount);
        finalMinterAmount = 0;
    }

    /**
     * Uses the availableLPAmount to fund the Uniswap LP.
     * 
     * Callable by anyone.
     */
    function fundUniswapLP() public {
        // console.log("fundUniswapLP(): availableLPAmount %o", availableLPAmount);
        // uniswapFunder.fundLP{value:availableLPAmount}();
        usedLPAmount += availableLPAmount;
        availableLPAmount = 0;
    }


    /**
     * Handles the accounting of claims and rewards post Ticket burning.
     * @param tokenId id of Ticket that was burned
     * @param paidAmount Amount of ETH that was paid as reward
     */
    function _burnTicketAccounting(uint256 tokenId, uint256 paidAmount) internal {
        noTickets--;
        if(tokenId <= 1000) 
            noTicketsSub1000--;
        if(tokenId <= 100)
            noTicketsSub100--;
        if(tokenId <= 10)
            noTicketsSub10--;
        allMintersAmount -= paidAmount;
    }

    /**
     * Handles the accounting of claims and rewards post Ticket minting.
     * @param tokenId id of Ticket that was minted
     * @param receivedAmount amount of ETH that was received for the mint
     */
    function _mintTicketAccounting(uint256 tokenId, uint256 receivedAmount) internal {
        noTickets++;
        if(tokenId <= 1000)
            noTicketsSub1000++;
        if(tokenId <= 100)
            noTicketsSub100++;
        if(tokenId <= 10)
            noTicketsSub10++;

        // console.log("lpRatio %o", lpRatio);
        // console.log("(lpRatio / 100) %o", (lpRatio / 100));
        availableLPAmount += receivedAmount * lpRatio / 100;
        finalMinterAmount += receivedAmount * finalMinterRatio / 100;
        allMintersAmount += receivedAmount * allMintersRatio / 100;
        teamAmount += receivedAmount * teamRatio / 100;
        // console.log("received %o team %o finalMinter %o allMinters %o availableLP is %o", receivedAmount / 10**12, teamAmount / 10**12, finalMinterAmount / 10**12, allMintersAmount / 10**12, availableLPAmount / 10**12);
        // console.log("team %o allMinters %o finalMinter %o", teamAmount / 10**12, allMintersAmount / 10**12,  finalMinterAmount / 10**12);
    }


    function _cashTicketAfterEnd(uint256 tokenId) internal afterMintEnded() {
        // Sends User an ETH reward equivalent to their claim
        // that is one fifth of the total pot, divided bt the number of unburned tickets

        // means if you burn your ticket you forfeit final reward (others will get it)
        // how many tix have been burned?

        uint256 rewardAmount = getTicketReward(tokenId);

        remainingClaims -= getTicketMultiplier(tokenId);
        nftContract.burn(tokenId);

        payable(_msgSender()).transfer(rewardAmount);
        _burnTicketAccounting(tokenId, rewardAmount);
    }


    function _cashTicketBeforeEnd(uint256 tokenId) internal whileMintIsOngoing() {
        // Sends User a token reward equivalent of TOKEN_MINT_AMOUNT, 
        // but they forfeit their final ETH reward

        remainingClaims -= getTicketMultiplier(tokenId);
        nftContract.burn(tokenId);

        tokenContract.mint(_msgSender(), TOKEN_MINT_AMOUNT);
        _burnTicketAccounting(tokenId, 0);
    }

    receive() payable external {}

}
