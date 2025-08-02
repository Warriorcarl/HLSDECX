const hre = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("Deploying utility contracts...");

    // Load token and V2 addresses
    const tokensPath = './deployments/tokens.json';
    const v2Path = './deployments/uniswap-v2.json';
    
    if (!fs.existsSync(tokensPath) || !fs.existsSync(v2Path)) {
        console.error("Required deployment files not found. Please run previous deployment scripts first.");
        process.exit(1);
    }

    const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
    const v2 = JSON.parse(fs.readFileSync(v2Path, 'utf8'));

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    const deployedContracts = {};

    // Deploy Multicall
    console.log("Deploying Multicall...");
    const Multicall = await hre.ethers.getContractFactory("Multicall");
    const multicall = await Multicall.deploy();
    await multicall.waitForDeployment();
    deployedContracts.multicall = await multicall.getAddress();
    console.log("Multicall deployed to:", deployedContracts.multicall);

    // Deploy PriceFeed
    console.log("Deploying PriceFeed...");
    const PriceFeed = await hre.ethers.getContractFactory("PriceFeed");
    const priceFeed = await PriceFeed.deploy(v2.factory, tokens.WDEX);
    await priceFeed.waitForDeployment();
    deployedContracts.priceFeed = await priceFeed.getAddress();
    console.log("PriceFeed deployed to:", deployedContracts.priceFeed);

    // Deploy LP Staking
    console.log("Deploying LPStaking...");
    const LPStaking = await hre.ethers.getContractFactory("LPStaking");
    
    // Parameters for LP Staking
    const rewardPerBlock = hre.ethers.parseEther("1"); // 1 WDEX per block as reward
    const startBlock = await hre.ethers.provider.getBlockNumber() + 100; // Start in 100 blocks
    
    const lpStaking = await LPStaking.deploy(
        tokens.WDEX, // Reward token (WDEX)
        rewardPerBlock,
        startBlock
    );
    await lpStaking.waitForDeployment();
    deployedContracts.lpStaking = await lpStaking.getAddress();
    console.log("LPStaking deployed to:", deployedContracts.lpStaking);

    // Save deployment addresses
    const utilsPath = './deployments/utils.json';
    fs.writeFileSync(utilsPath, JSON.stringify(deployedContracts, null, 2));
    console.log("\nUtility contracts deployment addresses saved to:", utilsPath);
    
    // Initialize PriceFeed for all tokens
    console.log("\nInitializing PriceFeed for tokens...");
    const tokenSymbols = ['USDT', 'USDC', 'DAI', 'BTC', 'SOL', 'BNB', 'ETH'];
    
    for (const symbol of tokenSymbols) {
        try {
            console.log(`Initializing price feed for ${symbol}...`);
            const tx = await priceFeed.initializePriceFeed(tokens[symbol]);
            await tx.wait();
            console.log(`${symbol} price feed initialized`);
        } catch (error) {
            console.error(`Error initializing ${symbol} price feed:`, error.message);
        }
    }

    return deployedContracts;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });