const { ethers } = require("hardhat");
const { keccak256, encodePacked } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");

async function main() {
  const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Account #1
  const account = privateKeyToAccount(privateKey);
  const signerAddress = account.address;
  console.log("Signer Public Address (viem):", signerAddress);

  const playerAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Account #2
  const claimAmount = 150n;
  const newTotalScore = 200n;
  const nonce = 123456n;

  // 1. Generate signature using viem (Backend Logic)
  const messageHash = keccak256(
    encodePacked(
      ["address", "uint256", "uint256", "uint256"],
      [playerAddress, claimAmount, newTotalScore, nonce]
    )
  );

  const signature = await account.signMessage({
    message: { raw: messageHash },
  });
  console.log("Generated Signature (viem):", signature);

  // 2. Recover signature using ethers (Ethers/Solidity Logic)
  const ethersHash = ethers.solidityPackedKeccak256(
    ["address", "uint256", "uint256", "uint256"],
    [playerAddress, claimAmount, newTotalScore, nonce]
  );
  
  console.log("Viem Hash matches Ethers Hash?", messageHash === ethersHash);

  const ethSignedMessageHash = ethers.hashMessage(ethers.getBytes(ethersHash));
  const recoveredAddress = ethers.recoverAddress(ethSignedMessageHash, signature);
  console.log("Recovered Address (ethers):", recoveredAddress);
  console.log("Recovered matches Signer?", recoveredAddress.toLowerCase() === signerAddress.toLowerCase());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
