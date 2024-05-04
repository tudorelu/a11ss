// SPDX-License-Identifier: MIT
pragma solidity ^0.6;

// import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
// import "@uniswap/v2-periphery/contracts/interfaces/IWETH.sol";
import { UniswapV2Router02 } from "@uniswap/v2-periphery/contracts/UniswapV2Router02.sol";
import { IUniswapV2Pair } from '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import { IUniswapV2Factory } from '@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol';

import { Token } from "./Token.sol";

/* This contract is used to fund the uniswap LP */ 
contract UniswapFunder is Ownable {
    /* feed dead deaf fee deed deaf beef beaf bea7 daf7 fade fafa dabafe dafade */
    address public wethAddress;
    Token public tokenContract;
    UniswapV2Router02 public uniswapRouter;
    IUniswapV2Pair public uniswapPair;

    constructor(address _tokenAddress, address _uniswapRouter) public {
        tokenContract = Token(_tokenAddress);
        uniswapRouter = UniswapV2Router02(payable(_uniswapRouter));
        wethAddress = uniswapRouter.WETH();
    }

    function initializeLP(uint256 receivedTokenAmount) public payable onlyOwner() {
        // create the pair if it doesn't exist
        IUniswapV2Factory factory = IUniswapV2Factory(uniswapRouter.factory());
        uniswapPair = IUniswapV2Pair(factory.createPair(wethAddress, address(tokenContract)));
        // address s = address(uniswapPair);
        // approve the router to spend the token
        require(tokenContract.approve(address(uniswapRouter), 2**256-1), 'Approve Failed.');
        uniswapRouter.addLiquidityETH{value:msg.value}(
            address(tokenContract),
            receivedTokenAmount,
            1,
            1,
            address(this),
            block.timestamp
        );
    }

    function fundLP() public payable {
        // console.log("fundLP(): msg.value %o", msg.value);
        _fundLP(msg.value);
    }

    /**
     * 
     * @param ethAmount amount with which to fund the LP
     *  
     * buys the token using half ethAmount, and then use the token + other half to fund the LP.
     * 'burn' the LP token in such a way that the liquidity can't be withdrawn, but the fees can be collected.
     * 
     * TODO: figure out what to do with the trading fees
     */
    function _fundLP(uint256 ethAmount) private {
        uint256 amountIn = ethAmount / 2;

        // buy Token with half of ethAmount
        address[] memory path = new address[](2);
        path[0] = wethAddress;
        path[1] = address(tokenContract);

        // console.log("_fundLP(): pre swapping amounts msg.value %o", msg.value);
        // https://docs.uniswap.org/contracts/v2/reference/smart-contracts/router-02#swapexactethfortokens
        uint[] memory swapAmounts = uniswapRouter.swapExactETHForTokens{value:amountIn}(
            1, path, address(this), block.timestamp);

        // uint256 soldETHAmount = swapAmounts[0];
        // uint256 leftoverETHAmount = amountIn - soldETHAmount;
        uint256 receivedTokenAmount = swapAmounts[1];
        // console.log("soldETHAmount %o and leftoverETHAmount is %o, and receivedTokenAmount is %o", soldETHAmount, leftoverETHAmount, receivedTokenAmount);
        // console.log("balance is %o", address(this).balance);
        
        require(tokenContract.approve(address(uniswapRouter), receivedTokenAmount), 'approve 1 failed.');
        
        // console.log("_fundLP(): pre adding liquidity eth amountIn %o", amountIn);
        // deposit token and remaining ethAmount 
        // https://docs.uniswap.org/contracts/v2/reference/smart-contracts/router-02#addliquidityeth
        uniswapRouter.addLiquidityETH{value:amountIn}(
            address(tokenContract),
            receivedTokenAmount,
            1,
            1,
            address(this),
            block.timestamp
        );
    }

    receive() payable external {}

}
