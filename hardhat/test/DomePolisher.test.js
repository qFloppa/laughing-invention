const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DomePolisher Game Contracts", function () {
  let ShineToken, shineToken;
  let DomeAccessories, domeAccessories;
  let DomePolisher, domePolisher;
  let owner, trustedSigner, player1, player2;

  beforeEach(async function () {
    [owner, trustedSigner, player1, player2] = await ethers.getSigners();

    // 1. Deploy ShineToken
    ShineToken = await ethers.getContractFactory("ShineToken");
    shineToken = await ShineToken.deploy(owner.address);
    await shineToken.waitForDeployment();

    // 2. Deploy DomeAccessories
    DomeAccessories = await ethers.getContractFactory("DomeAccessories");
    domeAccessories = await DomeAccessories.deploy(owner.address, "https://api.domepolisher.com/metadata/{id}.json");
    await domeAccessories.waitForDeployment();

    // 3. Deploy DomePolisher (the game controller)
    DomePolisher = await ethers.getContractFactory("DomePolisher");
    domePolisher = await DomePolisher.deploy(
      await shineToken.getAddress(),
      await domeAccessories.getAddress(),
      trustedSigner.address
    );
    await domePolisher.waitForDeployment();

    // 4. Transfer ownership of tokens to the game contract so it can mint
    await shineToken.transferOwnership(await domePolisher.getAddress());
    await domeAccessories.transferOwnership(await domePolisher.getAddress());
  });

  describe("Deployment & Configuration", function () {
    it("should set the correct initial owners and trusted signer", async function () {
      expect(await shineToken.owner()).to.equal(await domePolisher.getAddress());
      expect(await domeAccessories.owner()).to.equal(await domePolisher.getAddress());
      expect(await domePolisher.trustedSigner()).to.equal(trustedSigner.address);
    });

    it("should have correct accessory prices", async function () {
      const topHatCost = await domePolisher.accessoryCosts(1);
      expect(topHatCost).to.equal(ethers.parseEther("100"));
    });
  });

  describe("Claiming Shine points (ECDSA Signatures)", function () {
    it("should verify valid signature and mint $SHINE tokens", async function () {
      const claimAmount = 150n; // 150 points
      const newTotalScore = 150n;
      const nonce = 42n;

      // Hash the parameters: player, claimAmount, newTotalScore, nonce
      const messageHash = ethers.solidityPackedKeccak256(
        ["address", "uint256", "uint256", "uint256"],
        [player1.address, claimAmount, newTotalScore, nonce]
      );
      
      // Sign the hash (as standard ethereum signed message)
      const signature = await trustedSigner.signMessage(ethers.getBytes(messageHash));

      // Claim as player1
      const tx = await domePolisher.connect(player1).claimShine(
        claimAmount,
        newTotalScore,
        nonce,
        signature
      );
      await tx.wait();

      // Check balance
      expect(await shineToken.balanceOf(player1.address)).to.equal(ethers.parseEther("150"));
      expect(await domePolisher.highScores(player1.address)).to.equal(150n);
    });

    it("should reject double claiming with the same nonce", async function () {
      const claimAmount = 100n;
      const newTotalScore = 100n;
      const nonce = 55n;

      const messageHash = ethers.solidityPackedKeccak256(
        ["address", "uint256", "uint256", "uint256"],
        [player1.address, claimAmount, newTotalScore, nonce]
      );
      const signature = await trustedSigner.signMessage(ethers.getBytes(messageHash));

      // First claim should succeed
      await domePolisher.connect(player1).claimShine(claimAmount, newTotalScore, nonce, signature);

      // Second claim with same nonce should fail
      await expect(
        domePolisher.connect(player1).claimShine(claimAmount, newTotalScore, nonce, signature)
      ).to.be.revertedWith("Nonce already used");
    });

    it("should reject forged signatures", async function () {
      const claimAmount = 100n;
      const newTotalScore = 100n;
      const nonce = 99n;

      const messageHash = ethers.solidityPackedKeccak256(
        ["address", "uint256", "uint256", "uint256"],
        [player1.address, claimAmount, newTotalScore, nonce]
      );
      
      // Signed by owner instead of trustedSigner
      const signature = await owner.signMessage(ethers.getBytes(messageHash));

      await expect(
        domePolisher.connect(player1).claimShine(claimAmount, newTotalScore, nonce, signature)
      ).to.be.revertedWith("Invalid signature");
    });
  });

  describe("Accessory NFT Shop and Wardrobe", function () {
    beforeEach(async function () {
      // Mint some $SHINE to player1 by submitting a valid claim first
      const claimAmount = 500n;
      const newTotalScore = 500n;
      const nonce = 101n;
      const messageHash = ethers.solidityPackedKeccak256(
        ["address", "uint256", "uint256", "uint256"],
        [player1.address, claimAmount, newTotalScore, nonce]
      );
      const signature = await trustedSigner.signMessage(ethers.getBytes(messageHash));
      await domePolisher.connect(player1).claimShine(claimAmount, newTotalScore, nonce, signature);
    });

    it("should buy an accessory NFT using $SHINE", async function () {
      // 1. Approve game contract to spend $SHINE (100 SHINE for Top Hat)
      await shineToken.connect(player1).approve(await domePolisher.getAddress(), ethers.parseEther("100"));

      // 2. Buy accessory ID 1 (Top Hat)
      await domePolisher.connect(player1).buyAccessory(1);

      // Verify balances
      expect(await shineToken.balanceOf(player1.address)).to.equal(ethers.parseEther("400")); // 500 - 100
      expect(await domeAccessories.balanceOf(player1.address, 1)).to.equal(1n); // Owns 1 Top Hat NFT
    });

    it("should allow equipping owned accessory NFT", async function () {
      await shineToken.connect(player1).approve(await domePolisher.getAddress(), ethers.parseEther("100"));
      await domePolisher.connect(player1).buyAccessory(1); // Top Hat

      // Equip hatId 1, glasses 0, wig 0
      await domePolisher.connect(player1).equipAccessory(1, 0, 0);

      const equipped = await domePolisher.equippedAccessories(player1.address);
      expect(equipped.hatId).to.equal(1n);
      expect(equipped.glassesId).to.equal(0n);
      expect(equipped.wigId).to.equal(0n);
    });

    it("should reject equipping an unowned accessory NFT", async function () {
      // Player doesn't own any accessories
      await expect(
        domePolisher.connect(player1).equipAccessory(1, 0, 0)
      ).to.be.revertedWith("Don't own this hat");
    });
  });

  describe("Onchain Leaderboard Sorting", function () {
    it("should dynamically keep the top 10 players sorted onchain", async function () {
      // Create 11 players with scores
      const players = await ethers.getSigners();
      
      // Let's claim scores for players index 3 to 13 (11 players)
      for (let i = 3; i < 14; i++) {
        const player = players[i];
        const score = BigInt(i * 10); // 30, 40, ..., 130
        const nonce = BigInt(i);

        const messageHash = ethers.solidityPackedKeccak256(
          ["address", "uint256", "uint256", "uint256"],
          [player.address, 0n, score, nonce] // claim 0 SHINE, but set score
        );
        const signature = await trustedSigner.signMessage(ethers.getBytes(messageHash));
        await domePolisher.connect(player).claimShine(0n, score, nonce, signature);
      }

      // Fetch the leaderboard
      const leaderboard = await domePolisher.getLeaderboard();

      // The highest score should be index 0 (which is player index 13, score 130)
      expect(leaderboard[0].score).to.equal(130n);
      
      // The 10th score (index 9) should be 40n (player index 4). The player index 3 (score 30) should be dropped!
      expect(leaderboard[9].score).to.equal(40n);

      // Verify the list is strictly descending
      for (let i = 0; i < 9; i++) {
        expect(leaderboard[i].score).to.be.gte(leaderboard[i + 1].score);
      }
    });
  });
});
