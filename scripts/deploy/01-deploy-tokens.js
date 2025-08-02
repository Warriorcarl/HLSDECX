const hre = require("hardhat");

async function main() {
    console.log("Deploying token contracts...");

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
    const fs = require('fs');
    const deploymentPath = './deployments/tokens.json';
    
    // Create deployments directory if it doesn't exist
    if (!fs.existsSync('./deployments')) {
        fs.mkdirSync('./deployments');
    }

    fs.writeFileSync(deploymentPath, JSON.stringify(deployedTokens, null, 2));
    console.log("\nDeployment addresses saved to:", deploymentPath);
    
    return deployedTokens;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });