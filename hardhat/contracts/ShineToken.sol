// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ShineToken
 * @dev Satirical token $SHINE earned by polishing Brian Armstrong's dome.
 */
contract ShineToken is ERC20, Ownable {
    constructor(address initialOwner) ERC20("Shine", "SHINE") Ownable(initialOwner) {}

    /**
     * @dev Mint new $SHINE tokens. Only callable by the game contract (owner).
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
