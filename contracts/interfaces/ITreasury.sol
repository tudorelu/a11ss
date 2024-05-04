// SPDX-License-Identifier: MIT
pragma solidity ^0.6;

interface ITreasury {
    function receiveMintProceeds(uint256 tokenId) external payable;
}