// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title DomeAccessories
 * @dev Onchain NFTs (ERC1155) representing hats, wigs, glasses, and cursed items to equip on Brian's dome.
 */
contract DomeAccessories is ERC1155, Ownable {
    using Strings for uint256;

    string public name = "Brian's Shiny Accessories";
    string public symbol = "DOMEGEAR";

    constructor(address initialOwner, string memory baseUri) ERC1155(baseUri) Ownable(initialOwner) {}

    /**
     * @dev Mint a new accessory to a player. Only callable by the game contract (owner).
     */
    function mint(address to, uint256 id, uint256 amount, bytes memory data) external onlyOwner {
        _mint(to, id, amount, data);
    }

    /**
     * @dev Update the base URI.
     */
    function setURI(string memory newuri) external onlyOwner {
        _setURI(newuri);
    }
}
