const hre = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("=== Starting Complete DEX Deployment ===");
    console.log("Network:", hre.network.name);
    console.log("Chain ID:", (await hre.ethers.provider.getNetwork()).chainId);

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "HLS");

    try {
        // Step 1: Deploy tokens
        console.log("\n=== Step 1: Deploying Tokens ===");
        await deployTokens();

        // Step 2: Deploy Uniswap V2
        console.log("\n=== Step 2: Deploying Uniswap V2 ===");
        await deployUniswapV2();

        // Step 3: Deploy utilities
        console.log("\n=== Step 3: Deploying Utility Contracts ===");
        await deployUtils();

        // Step 4: Initialize pools (optional, requires HLS balance)
        const shouldInitializePools = process.env.INITIALIZE_POOLS === 'true';
        if (shouldInitializePools) {
            console.log("\n=== Step 4: Initializing Pools ===");
            await initializePools();
        } else {
            console.log("\n=== Step 4: Skipping Pool Initialization ===");
            console.log("Set INITIALIZE_POOLS=true environment variable to initialize pools");
        }

        // Generate summary
        console.log("\n=== Deployment Summary ===");
        await generateSummary();

        console.log("\n=== Deployment Complete! ===");

    } catch (error) {
        console.error("Deployment failed:", error);
        process.exit(1);
    }
}

async function deployTokens() {
    // Deploy WDEX first (Wrapped DEX for HLS)
    const WDEX = await hre.ethers.getContractFactory("WDEX");
    const wdex = await WDEX.deploy();
    await wdex.waitForDeployment();
    console.log("WDEX deployed to:", await wdex.getAddress());

    // Deploy test tokens
    const tokens = [
        { name: "TestUSDT", symbol: "USDT" },
        { name: "TestUSDC", symbol: "USDC" },
        { name: "TestDAI", symbol: "DAI" },
        { name: "TestBTC", symbol: "BTC" },
        { name: "TestSOL", symbol: "SOL" },
        { name: "TestBNB", symbol: "BNB" },
        { name: "TestETH", symbol: "ETH" }
    ];

    const deployedTokens = { WDEX: await wdex.getAddress() };

    for (const token of tokens) {
        const Token = await hre.ethers.getContractFactory(token.name);
        const deployedToken = await Token.deploy();
        await deployedToken.waitForDeployment();
        const address = await deployedToken.getAddress();
        deployedTokens[token.symbol] = address;
        console.log(`${token.name} deployed to:`, address);
    }

    // Save deployment addresses
    if (!fs.existsSync('./deployments')) {
        fs.mkdirSync('./deployments');
    }
    fs.writeFileSync('./deployments/tokens.json', JSON.stringify(deployedTokens, null, 2));
}

async function deployUniswapV2() {
    const tokens = JSON.parse(fs.readFileSync('./deployments/tokens.json', 'utf8'));
    const [deployer] = await hre.ethers.getSigners();

    // Deploy UniswapV2Factory
    const UniswapV2Factory = await hre.ethers.getContractFactory("UniswapV2Factory");
    const factory = await UniswapV2Factory.deploy(deployer.address);
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    console.log("UniswapV2Factory deployed to:", factoryAddress);

    // Deploy UniswapV2Router02
    const UniswapV2Router02 = await hre.ethers.getContractFactory("UniswapV2Router02");
    const router = await UniswapV2Router02.deploy(factoryAddress, tokens.WDEX);
    await router.waitForDeployment();
    const routerAddress = await router.getAddress();
    console.log("UniswapV2Router02 deployed to:", routerAddress);

    const v2Addresses = {
        factory: factoryAddress,
        router: routerAddress,
        WDEX: tokens.WDEX
    };

    fs.writeFileSync('./deployments/uniswap-v2.json', JSON.stringify(v2Addresses, null, 2));
}

async function deployUtils() {
    const tokens = JSON.parse(fs.readFileSync('./deployments/tokens.json', 'utf8'));
    const v2 = JSON.parse(fs.readFileSync('./deployments/uniswap-v2.json', 'utf8'));

    const deployedContracts = {};

    // Deploy Multicall
    const Multicall = await hre.ethers.getContractFactory("Multicall");
    const multicall = await Multicall.deploy();
    await multicall.waitForDeployment();
    deployedContracts.multicall = await multicall.getAddress();
    console.log("Multicall deployed to:", deployedContracts.multicall);

    // Deploy PriceFeed
    const PriceFeed = await hre.ethers.getContractFactory("PriceFeed");
    const priceFeed = await PriceFeed.deploy(v2.factory, tokens.WDEX);
    await priceFeed.waitForDeployment();
    deployedContracts.priceFeed = await priceFeed.getAddress();
    console.log("PriceFeed deployed to:", deployedContracts.priceFeed);

    // Deploy LP Staking
    const LPStaking = await hre.ethers.getContractFactory("LPStaking");
    const rewardPerBlock = hre.ethers.parseEther("1");
    const startBlock = await hre.ethers.provider.getBlockNumber() + 100;
    
    const lpStaking = await LPStaking.deploy(tokens.WDEX, rewardPerBlock, startBlock);
    await lpStaking.waitForDeployment();
    deployedContracts.lpStaking = await lpStaking.getAddress();
    console.log("LPStaking deployed to:", deployedContracts.lpStaking);

    fs.writeFileSync('./deployments/utils.json', JSON.stringify(deployedContracts, null, 2));
}

async function initializePools() {
    const tokens = JSON.parse(fs.readFileSync('./deployments/tokens.json', 'utf8'));
    const v2 = JSON.parse(fs.readFileSync('./deployments/uniswap-v2.json', 'utf8'));
    const [deployer] = await hre.ethers.getSigners();

    const factory = await hre.ethers.getContractAt("UniswapV2Factory", v2.factory);
    const router = await hre.ethers.getContractAt("UniswapV2Router02", v2.router);

    const tokenPrices = {
        USDT: 1, USDC: 1, DAI: 1,
        BTC: 45000, SOL: 100, BNB: 300, ETH: 2500
    };

    const pairs = [];
    const tokenSymbols = Object.keys(tokenPrices);

    for (const symbol of tokenSymbols) {
        console.log(`Setting up ${symbol}/WDEX pair...`);
        
        try {
            const tokenAddress = tokens[symbol];
            const token = await hre.ethers.getContractAt("BaseTestToken", tokenAddress);
            
            // Create pair if it doesn't exist
            const existingPair = await factory.getPair(tokenAddress, tokens.WDEX);
            if (existingPair === "0x0000000000000000000000000000000000000000") {
                const tx = await factory.createPair(tokenAddress, tokens.WDEX);
                await tx.wait();
            }
            
            const pairAddress = await factory.getPair(tokenAddress, tokens.WDEX);
            pairs.push({ symbol, token: tokenAddress, pair: pairAddress });
            console.log(`${symbol}/WDEX pair: ${pairAddress}`);
            
        } catch (error) {
            console.error(`Error setting up ${symbol} pair:`, error.message);
        }
    }

    fs.writeFileSync('./deployments/pairs.json', JSON.stringify(pairs, null, 2));
}

async function generateSummary() {
    const deployments = {};
    
    const files = ['tokens.json', 'uniswap-v2.json', 'utils.json', 'pairs.json'];
    for (const file of files) {
        const path = `./deployments/${file}`;
        if (fs.existsSync(path)) {
            deployments[file.replace('.json', '')] = JSON.parse(fs.readFileSync(path, 'utf8'));
        }
    }

    fs.writeFileSync('./deployments/summary.json', JSON.stringify(deployments, null, 2));
    
    console.log("\nAll deployment addresses:");
    console.log(JSON.stringify(deployments, null, 2));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });