// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./ShineToken.sol";
import "./DomeAccessories.sol";

/**
 * @title DomePolisher
 * @dev Main game contract for "Polish the Dome". Coordinates scores, leaderboard, and NFT customizations.
 */
contract DomePolisher is Ownable {
    using ECDSA for bytes32;

    struct EquippedItems {
        uint256 hatId;      // 0 if none
        uint256 glassesId;  // 0 if none
        uint256 wigId;      // 0 if none
    }

    struct LeaderboardEntry {
        address player;
        uint256 score;
    }

    // Contracts
    ShineToken public immutable shineToken;
    DomeAccessories public immutable domeAccessories;

    // Game state
    address public trustedSigner;
    mapping(address => uint256) public highScores;
    mapping(address => EquippedItems) public equippedAccessories;
    mapping(address => mapping(uint256 => bool)) public usedNonces;
    mapping(uint256 => uint256) public accessoryCosts;

    // On-chain leaderboard (Top 10)
    LeaderboardEntry[10] public topPolishers;

    // Events
    event ShineClaimed(address indexed player, uint256 amount, uint256 newTotalScore);
    event AccessoryBought(address indexed player, uint256 indexed accessoryId, uint256 cost);
    event AccessoryEquipped(address indexed player, uint256 hatId, uint256 glassesId, uint256 wigId);
    event SignerUpdated(address indexed newSigner);
    event CostUpdated(uint256 indexed accessoryId, uint256 newCost);

    constructor(
        address _shineToken,
        address _domeAccessories,
        address _trustedSigner
    ) Ownable(msg.sender) {
        shineToken = ShineToken(_shineToken);
        domeAccessories = DomeAccessories(_domeAccessories);
        trustedSigner = _trustedSigner;

        // Initialize default accessory costs in $SHINE (e.g. 100, 250, 500, etc.)
        accessoryCosts[1] = 100 * 10**18;  // Elegant Top Hat
        accessoryCosts[2] = 200 * 10**18;  // Propeller Beanie
        accessoryCosts[3] = 300 * 10**18;  // Pirate Hat
        accessoryCosts[4] = 150 * 10**18;  // Deal With It Sunglasses
        accessoryCosts[5] = 400 * 10**18;  // Cyber Laser Eyes
        accessoryCosts[6] = 500 * 10**18;  // Rogaine Hair Cream (Cure Baldness)
        accessoryCosts[7] = 800 * 10**18;  // Majestic Hair Transplant
        accessoryCosts[8] = 600 * 10**18;  // Rainbow Clown Wig
        accessoryCosts[9] = 1000 * 10**18; // Cursed Demon Horns
        accessoryCosts[10] = 1200 * 10**18; // Radiant Angel Halo
    }

    /**
     * @dev Claims earned $SHINE points and updates the leaderboard.
     * Uses ECDSA signatures from the trusted signer to prevent cheating.
     */
    function claimShine(
        uint256 claimAmount,
        uint256 newTotalScore,
        uint256 nonce,
        bytes memory signature
    ) external {
        require(!usedNonces[msg.sender][nonce], "Nonce already used");
        usedNonces[msg.sender][nonce] = true;

        // Recreate the message hash signed by the validator
        bytes32 messageHash = keccak256(abi.encodePacked(msg.sender, claimAmount, newTotalScore, nonce));
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);

        // Verify the signature
        address signer = ethSignedMessageHash.recover(signature);
        require(signer == trustedSigner, "Invalid signature");

        // Update total score and leaderboard
        if (newTotalScore > highScores[msg.sender]) {
            highScores[msg.sender] = newTotalScore;
            _updateLeaderboard(msg.sender, newTotalScore);
        }

        // Mint $SHINE tokens to the player (1:1 with claim amount in decimals)
        if (claimAmount > 0) {
            shineToken.mint(msg.sender, claimAmount * 10**18);
        }

        emit ShineClaimed(msg.sender, claimAmount, newTotalScore);
    }

    /**
     * @dev Purchase an accessory NFT by spending $SHINE.
     */
    function buyAccessory(uint256 accessoryId) external {
        uint256 cost = accessoryCosts[accessoryId];
        require(cost > 0, "Accessory does not exist");

        // Pull and burn/transfer SHINE from player
        shineToken.transferFrom(msg.sender, address(this), cost);

        // Mint the ERC1155 NFT
        domeAccessories.mint(msg.sender, accessoryId, 1, "");

        emit AccessoryBought(msg.sender, accessoryId, cost);
    }

    /**
     * @dev Equip purchased accessories. The player must own them.
     */
    function equipAccessory(uint256 hatId, uint256 glassesId, uint256 wigId) external {
        if (hatId != 0) {
            require(domeAccessories.balanceOf(msg.sender, hatId) > 0, "Don't own this hat");
        }
        if (glassesId != 0) {
            require(domeAccessories.balanceOf(msg.sender, glassesId) > 0, "Don't own these glasses");
        }
        if (wigId != 0) {
            require(domeAccessories.balanceOf(msg.sender, wigId) > 0, "Don't own this wig");
        }

        equippedAccessories[msg.sender] = EquippedItems(hatId, glassesId, wigId);

        emit AccessoryEquipped(msg.sender, hatId, glassesId, wigId);
    }

    /**
     * @dev Get the full leaderboard.
     */
    function getLeaderboard() external view returns (LeaderboardEntry[10] memory) {
        return topPolishers;
    }

    /**
     * @dev Owner utility: Set the trusted signature validator.
     */
    function setTrustedSigner(address _trustedSigner) external onlyOwner {
        trustedSigner = _trustedSigner;
        emit SignerUpdated(_trustedSigner);
    }

    /**
     * @dev Owner utility: Set cost of an accessory.
     */
    function setAccessoryCost(uint256 accessoryId, uint256 newCost) external onlyOwner {
        accessoryCosts[accessoryId] = newCost;
        emit CostUpdated(accessoryId, newCost);
    }

    /**
     * @dev Internal function to update the top 10 bubble-sorted leaderboard.
     */
    function _updateLeaderboard(address player, uint256 newScore) internal {
        int256 index = -1;
        
        // Find if player is already on the leaderboard
        for (uint256 i = 0; i < 10; i++) {
            if (topPolishers[i].player == player) {
                index = int256(i);
                break;
            }
        }

        if (index != -1) {
            // Player is already on the leaderboard, update their score
            topPolishers[uint256(index)].score = newScore;
        } else {
            // Player is not on the leaderboard, check if they beat the 10th player
            if (newScore > topPolishers[9].score) {
                topPolishers[9] = LeaderboardEntry(player, newScore);
            } else {
                return; // Doesn't qualify, no sort needed
            }
        }

        // Sort leaderboard (bubble/insertion sort since size is small)
        for (uint256 i = 0; i < 10; i++) {
            for (uint256 j = i + 1; j < 10; j++) {
                if (topPolishers[i].score < topPolishers[j].score) {
                    LeaderboardEntry memory temp = topPolishers[i];
                    topPolishers[i] = topPolishers[j];
                    topPolishers[j] = temp;
                }
            }
        }
    }
}
