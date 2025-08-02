const hre = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("Deploying Uniswap V2 contracts...");

    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // Load token addresses
    const tokensPath = './deployments/tokens.json';
    if (!fs.existsSync(tokensPath)) {
        console.error("Token addresses not found. Please run 01-deploy-tokens.js first.");
        process.exit(1);
    }
    const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
    const wdexAddress = tokens.WDEX;

    // Deploy UniswapV2Factory
    const UniswapV2Factory = await hre.ethers.getContractFactory("UniswapV2Factory");
    const factory = await UniswapV2Factory.deploy(deployer.address); // deployer as feeToSetter
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    console.log("UniswapV2Factory deployed to:", factoryAddress);

    // Deploy UniswapV2Router02
    const UniswapV2Router02 = await hre.ethers.getContractFactory("UniswapV2Router02");
    const router = await UniswapV2Router02.deploy(factoryAddress, wdexAddress);
    await router.waitForDeployment();
    const routerAddress = await router.getAddress();
    console.log("UniswapV2Router02 deployed to:", routerAddress);

    // Save deployment addresses
    const v2Addresses = {
        factory: factoryAddress,
        router: routerAddress,
        WDEX: wdexAddress
    };

    const deploymentPath = './deployments/uniswap-v2.json';
    fs.writeFileSync(deploymentPath, JSON.stringify(v2Addresses, null, 2));
    console.log("\nUniswap V2 deployment addresses saved to:", deploymentPath);
    
    return v2Addresses;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });