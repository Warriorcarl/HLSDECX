const hre = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("Deploying Uniswap V1 contracts...");

    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // Load token addresses (assume they exist from step 1)
    const tokensPath = './deployments/tokens.json';
    if (!fs.existsSync(tokensPath)) {
        console.error("Token addresses not found. Please run 01-deploy-tokens.js first.");
        process.exit(1);
    }
    const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));

    // Deploy UniswapV1Factory
    console.log("Deploying UniswapV1 Factory...");
    const UniswapFactory = await hre.ethers.getContractFactory("UniswapFactory");
    const factory = await UniswapFactory.deploy();
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    console.log("UniswapV1Factory deployed to:", factoryAddress);

    // Create exchanges for each token
    const exchanges = {};
    const tokenSymbols = ['USDT', 'USDC', 'DAI', 'BTC', 'SOL', 'BNB', 'ETH'];
    
    console.log("Creating V1 exchanges...");
    for (const symbol of tokenSymbols) {
        try {
            console.log(`Creating exchange for ${symbol}...`);
            const tokenAddress = tokens[symbol];
            const tx = await factory.createExchange(tokenAddress);
            await tx.wait();
            
            const exchangeAddress = await factory.getExchange(tokenAddress);
            exchanges[symbol] = exchangeAddress;
            console.log(`${symbol} exchange created at:`, exchangeAddress);
        } catch (error) {
            console.error(`Error creating ${symbol} exchange:`, error.message);
        }
    }

    // Save deployment addresses
    const v1Addresses = {
        factory: factoryAddress,
        exchanges: exchanges
    };

    // Create deployments directory if it doesn't exist
    if (!fs.existsSync('./deployments')) {
        fs.mkdirSync('./deployments');
    }

    const deploymentPath = './deployments/uniswap-v1.json';
    fs.writeFileSync(deploymentPath, JSON.stringify(v1Addresses, null, 2));
    console.log("\nUniswap V1 deployment addresses saved to:", deploymentPath);
    
    return v1Addresses;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });