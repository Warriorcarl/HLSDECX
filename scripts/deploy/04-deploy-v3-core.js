const hre = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("Deploying Uniswap V3 Core contracts...");

    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // Deploy UniswapV3Factory
    console.log("Deploying UniswapV3Factory...");
    const UniswapV3Factory = await hre.ethers.getContractFactory("UniswapV3Factory");
    const factory = await UniswapV3Factory.deploy();
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    console.log("UniswapV3Factory deployed to:", factoryAddress);

    // Verify fee amounts are enabled
    console.log("Verifying fee amounts...");
    const fee500 = await factory.feeAmountTickSpacing(500);
    const fee3000 = await factory.feeAmountTickSpacing(3000);
    const fee10000 = await factory.feeAmountTickSpacing(10000);
    
    console.log("Fee tier 500 (0.05%) - tick spacing:", fee500.toString());
    console.log("Fee tier 3000 (0.3%) - tick spacing:", fee3000.toString());
    console.log("Fee tier 10000 (1%) - tick spacing:", fee10000.toString());

    // Save deployment addresses
    const v3CoreAddresses = {
        factory: factoryAddress,
        feeTiers: {
            500: { fee: 500, tickSpacing: fee500.toString() },
            3000: { fee: 3000, tickSpacing: fee3000.toString() },
            10000: { fee: 10000, tickSpacing: fee10000.toString() }
        }
    };

    // Create deployments directory if it doesn't exist
    if (!fs.existsSync('./deployments')) {
        fs.mkdirSync('./deployments');
    }

    const deploymentPath = './deployments/uniswap-v3-core.json';
    fs.writeFileSync(deploymentPath, JSON.stringify(v3CoreAddresses, null, 2));
    console.log("\nUniswap V3 Core deployment addresses saved to:", deploymentPath);
    
    return v3CoreAddresses;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });