const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Starting deployment with account:", deployer.address);

  // Set trusted signer (In development, use default Hardhat Account #1)
  const trustedSigner = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

  // 1. Deploy ShineToken
  console.log("Deploying ShineToken...");
  const ShineToken = await ethers.getContractFactory("ShineToken");
  const shineToken = await ShineToken.deploy(deployer.address);
  await shineToken.waitForDeployment();
  const shineTokenAddress = await shineToken.getAddress();
  console.log("ShineToken deployed at:", shineTokenAddress);

  // 2. Deploy DomeAccessories
  console.log("Deploying DomeAccessories...");
  const DomeAccessories = await ethers.getContractFactory("DomeAccessories");
  const domeAccessories = await DomeAccessories.deploy(
    deployer.address,
    "https://api.domepolisher.com/metadata/{id}.json"
  );
  await domeAccessories.waitForDeployment();
  const domeAccessoriesAddress = await domeAccessories.getAddress();
  console.log("DomeAccessories deployed at:", domeAccessoriesAddress);

  // 3. Deploy DomePolisher (the game controller)
  console.log("Deploying DomePolisher...");
  const DomePolisher = await ethers.getContractFactory("DomePolisher");
  const domePolisher = await DomePolisher.deploy(
    shineTokenAddress,
    domeAccessoriesAddress,
    trustedSigner
  );
  await domePolisher.waitForDeployment();
  const domePolisherAddress = await domePolisher.getAddress();
  console.log("DomePolisher deployed at:", domePolisherAddress);

  // 4. Transfer ownership of tokens to the game contract so it can mint
  console.log("Linking ownership tokens to the Game Controller...");
  await (await shineToken.transferOwnership(domePolisherAddress)).wait();
  await (await domeAccessories.transferOwnership(domePolisherAddress)).wait();

  console.log("\n==========================================");
  console.log("DEPLOYMENT COMPLETE SUCCESSFULLY!");
  console.log("Copy these addresses to your Next.js environment configurations:");
  console.log(`NEXT_PUBLIC_GAME_CONTRACT="${domePolisherAddress}"`);
  console.log(`NEXT_PUBLIC_SHINE_TOKEN="${shineTokenAddress}"`);
  console.log(`NEXT_PUBLIC_DOME_ACCESSORIES="${domeAccessoriesAddress}"`);
  console.log("==========================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
