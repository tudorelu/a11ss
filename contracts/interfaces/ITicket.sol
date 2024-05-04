// SPDX-License-Identifier: MIT
pragma solidity ^0.6;

import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface ITicket is IERC721 {
    function hasMintStarted() external view returns(bool);
}