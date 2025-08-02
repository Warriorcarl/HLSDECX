const hre = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("Deploying Uniswap V3 Periphery contracts...");

    // Load required deployment files
    const tokensPath = './deployments/tokens.json';
    const v3CorePath = './deployments/uniswap-v3-core.json';
    
    if (!fs.existsSync(tokensPath) || !fs.existsSync(v3CorePath)) {
        console.error("Required deployment files not found. Please run previous deployment scripts first.");
        process.exit(1);
    }

    const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
    const v3Core = JSON.parse(fs.readFileSync(v3CorePath, 'utf8'));

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    const deployedContracts = {};

    // Deploy SwapRouter
    console.log("Deploying SwapRouter...");
    const SwapRouter = await hre.ethers.getContractFactory("SwapRouter");
    const swapRouter = await SwapRouter.deploy(v3Core.factory, tokens.WDEX);
    await swapRouter.waitForDeployment();
    deployedContracts.swapRouter = await swapRouter.getAddress();
    console.log("SwapRouter deployed to:", deployedContracts.swapRouter);

    // Deploy NonfungiblePositionManager (placeholder)
    console.log("Deploying NonfungiblePositionManager placeholder...");
    // For now, we'll create a simple placeholder contract
    // In a full implementation, this would be a complex NFT-based position manager
    const NonfungiblePositionManager = await hre.ethers.getContractFactory("contracts/utils/Multicall.sol:Multicall");
    const positionManager = await NonfungiblePositionManager.deploy();
    await positionManager.waitForDeployment();
    deployedContracts.nonfungiblePositionManager = await positionManager.getAddress();
    console.log("NonfungiblePositionManager (placeholder) deployed to:", deployedContracts.nonfungiblePositionManager);

    // Deploy Quoter (placeholder)
    console.log("Deploying Quoter placeholder...");
    const Quoter = await hre.ethers.getContractFactory("contracts/utils/Multicall.sol:Multicall");
    const quoter = await Quoter.deploy();
    await quoter.waitForDeployment();
    deployedContracts.quoter = await quoter.getAddress();
    console.log("Quoter (placeholder) deployed to:", deployedContracts.quoter);

    // Deploy TickLens (placeholder)
    console.log("Deploying TickLens placeholder...");
    const TickLens = await hre.ethers.getContractFactory("contracts/utils/Multicall.sol:Multicall");
    const tickLens = await TickLens.deploy();
    await tickLens.waitForDeployment();
    deployedContracts.tickLens = await tickLens.getAddress();
    console.log("TickLens (placeholder) deployed to:", deployedContracts.tickLens);

    // Save deployment addresses
    const v3PeripheryAddresses = {
        factory: v3Core.factory,
        WDEX: tokens.WDEX,
        swapRouter: deployedContracts.swapRouter,
        nonfungiblePositionManager: deployedContracts.nonfungiblePositionManager,
        quoter: deployedContracts.quoter,
        tickLens: deployedContracts.tickLens
    };

    const deploymentPath = './deployments/uniswap-v3-periphery.json';
    fs.writeFileSync(deploymentPath, JSON.stringify(v3PeripheryAddresses, null, 2));
    console.log("\nUniswap V3 Periphery deployment addresses saved to:", deploymentPath);
    
    return v3PeripheryAddresses;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });