const hre = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("Deploying Universal Router...");

    // Load required deployment files
    const tokensPath = './deployments/tokens.json';
    const v1Path = './deployments/uniswap-v1.json';
    const v2Path = './deployments/uniswap-v2.json';
    const v3PeripheryPath = './deployments/uniswap-v3-periphery.json';
    
    const requiredFiles = [tokensPath, v1Path, v2Path, v3PeripheryPath];
    for (const file of requiredFiles) {
        if (!fs.existsSync(file)) {
            console.error(`Required deployment file not found: ${file}`);
            console.error("Please run all previous deployment scripts first.");
            process.exit(1);
        }
    }

    const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
    const v1 = JSON.parse(fs.readFileSync(v1Path, 'utf8'));
    const v2 = JSON.parse(fs.readFileSync(v2Path, 'utf8'));
    const v3Periphery = JSON.parse(fs.readFileSync(v3PeripheryPath, 'utf8'));

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // Deploy UniversalRouter
    console.log("Deploying UniversalRouter...");
    const UniversalRouter = await hre.ethers.getContractFactory("UniversalRouter");
    const universalRouter = await UniversalRouter.deploy(
        tokens.WDEX,           // WDEX address
        v1.factory,            // V1 Factory
        v2.router,             // V2 Router
        v3Periphery.swapRouter // V3 SwapRouter
    );
    await universalRouter.waitForDeployment();
    const universalRouterAddress = await universalRouter.getAddress();
    console.log("UniversalRouter deployed to:", universalRouterAddress);

    // Test getting quotes
    console.log("\nTesting UniversalRouter quote functionality...");
    try {
        const testAmount = hre.ethers.parseEther("1"); // 1 token
        
        // Test WDEX to USDT quotes
        if (tokens.USDT) {
            console.log("Getting quotes for 1 WDEX -> USDT...");
            const [bestQuote, bestVersion] = await universalRouter.getBestQuote(
                tokens.WDEX,
                tokens.USDT,
                testAmount
            );
            console.log(`Best quote: ${hre.ethers.formatEther(bestQuote)}`);
            console.log(`Best version: ${bestVersion} (0=V1, 1=V2, 2=V3)`);
        }
    } catch (error) {
        console.log("Quote testing failed (expected for mock implementation):", error.message);
    }

    // Save deployment addresses
    const universalRouterAddresses = {
        universalRouter: universalRouterAddress,
        supportedVersions: {
            v1: {
                factory: v1.factory,
                exchanges: v1.exchanges
            },
            v2: {
                factory: v2.factory,
                router: v2.router
            },
            v3: {
                factory: v3Periphery.factory,
                swapRouter: v3Periphery.swapRouter
            }
        },
        WDEX: tokens.WDEX
    };

    const deploymentPath = './deployments/universal-router.json';
    fs.writeFileSync(deploymentPath, JSON.stringify(universalRouterAddresses, null, 2));
    console.log("\nUniversal Router deployment addresses saved to:", deploymentPath);
    
    return universalRouterAddresses;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });