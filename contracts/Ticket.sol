// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract Ticket is ERC721, Ownable {

    constructor(string memory _name, string memory _symbol) ERC721(_name, _symbol) public {}


    function mint(address receiver, uint256 tokenId) public payable onlyOwner() {
        _safeMint(receiver, tokenId);
    }

    function burn(uint256 tokenId) public onlyOwner() {
        _burn(tokenId);
    }

}
