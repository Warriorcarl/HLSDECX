const hre = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("Initializing Uniswap V3 pools...");

    // Load deployment files
    const tokensPath = './deployments/tokens.json';
    const v3CorePath = './deployments/uniswap-v3-core.json';
    
    if (!fs.existsSync(tokensPath) || !fs.existsSync(v3CorePath)) {
        console.error("Required deployment files not found.");
        process.exit(1);
    }

    const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
    const v3Core = JSON.parse(fs.readFileSync(v3CorePath, 'utf8'));

    const [deployer] = await hre.ethers.getSigners();
    console.log("Initializing with account:", deployer.address);

    const factory = await hre.ethers.getContractAt("UniswapV3Factory", v3Core.factory);

    // Token pairs and their corresponding fee tiers
    const pairConfigs = [
        // Stablecoin pairs - use 0.05% fee (500)
        { tokenA: 'USDT', tokenB: 'WDEX', fee: 500 },
        { tokenA: 'USDC', tokenB: 'WDEX', fee: 500 },  
        { tokenA: 'DAI', tokenB: 'WDEX', fee: 500 },
        { tokenA: 'USDT', tokenB: 'USDC', fee: 500 },
        
        // Standard pairs - use 0.3% fee (3000)
        { tokenA: 'BTC', tokenB: 'WDEX', fee: 3000 },
        { tokenA: 'ETH', tokenB: 'WDEX', fee: 3000 },
        { tokenA: 'BTC', tokenB: 'ETH', fee: 3000 },
        
        // Exotic pairs - use 1% fee (10000)
        { tokenA: 'SOL', tokenB: 'WDEX', fee: 10000 },
        { tokenA: 'BNB', tokenB: 'WDEX', fee: 10000 },
    ];

    const createdPools = [];

    for (const config of pairConfigs) {
        try {
            const tokenAAddress = tokens[config.tokenA];
            const tokenBAddress = tokens[config.tokenB];
            
            if (!tokenAAddress || !tokenBAddress) {
                console.log(`⚠️  Skipping ${config.tokenA}/${config.tokenB} - tokens not found`);
                continue;
            }

            console.log(`\nCreating ${config.tokenA}/${config.tokenB} pool with ${config.fee / 100}% fee...`);

            // Check if pool already exists
            const existingPool = await factory.getPool(tokenAAddress, tokenBAddress, config.fee);
            if (existingPool !== '0x0000000000000000000000000000000000000000') {
                console.log(`Pool already exists at: ${existingPool}`);
                createdPools.push({
                    tokenA: config.tokenA,
                    tokenB: config.tokenB,
                    fee: config.fee,
                    pool: existingPool,
                    status: 'existing'
                });
                continue;
            }

            // Create the pool
            const createTx = await factory.createPool(tokenAAddress, tokenBAddress, config.fee);
            const receipt = await createTx.wait();
            
            // Get the created pool address
            const poolAddress = await factory.getPool(tokenAAddress, tokenBAddress, config.fee);
            
            console.log(`✅ Pool created at: ${poolAddress}`);
            console.log(`   Transaction: ${createTx.hash}`);
            console.log(`   Gas used: ${receipt.gasUsed.toString()}`);

            createdPools.push({
                tokenA: config.tokenA,
                tokenB: config.tokenB,
                fee: config.fee,
                pool: poolAddress,
                txHash: createTx.hash,
                gasUsed: receipt.gasUsed.toString(),
                status: 'created'
            });

            // Calculate and log sqrtPriceX96 for initialization reference
            const sqrtPriceX96 = calculateSqrtPriceX96(config.tokenA, config.tokenB);
            console.log(`   Suggested sqrtPriceX96 for initialization: ${sqrtPriceX96}`);

        } catch (error) {
            console.error(`❌ Error creating ${config.tokenA}/${config.tokenB} pool:`, error.message);
        }
    }

    // Save pools information
    const v3PoolsInfo = {
        factory: v3Core.factory,
        pools: createdPools,
        feeTiers: v3Core.feeTiers,
        totalPools: createdPools.length,
        createdAt: new Date().toISOString()
    };

    const poolsPath = './deployments/v3-pools.json';
    fs.writeFileSync(poolsPath, JSON.stringify(v3PoolsInfo, null, 2));
    console.log(`\n📄 V3 pools information saved to: ${poolsPath}`);
    console.log(`✅ Created/verified ${createdPools.length} V3 pools`);

    // Log summary
    console.log('\n📊 Pool Creation Summary:');
    console.log(`   Total pools: ${createdPools.length}`);
    console.log(`   0.05% fee pools: ${createdPools.filter(p => p.fee === 500).length}`);
    console.log(`   0.3% fee pools: ${createdPools.filter(p => p.fee === 3000).length}`);
    console.log(`   1% fee pools: ${createdPools.filter(p => p.fee === 10000).length}`);
}

/**
 * Calculate sqrtPriceX96 for pool initialization
 * This is a simplified calculation - in production, you'd want more precise pricing
 */
function calculateSqrtPriceX96(tokenA, tokenB) {
    // Token prices in USD for calculation
    const prices = {
        WDEX: 10000, // HLS = $10,000
        USDT: 1,
        USDC: 1,
        DAI: 1,
        BTC: 45000,
        ETH: 2500,
        SOL: 100,
        BNB: 300
    };

    const priceA = prices[tokenA] || 1;
    const priceB = prices[tokenB] || 1;
    
    // Price ratio (token1/token0 after sorting)
    const [token0, token1] = tokenA < tokenB ? [tokenA, tokenB] : [tokenB, tokenA];
    const price0 = prices[token0];
    const price1 = prices[token1];
    const priceRatio = price1 / price0;
    
    // sqrtPriceX96 = sqrt(priceRatio) * 2^96
    const sqrtPrice = Math.sqrt(priceRatio);
    const Q96 = Math.pow(2, 96);
    const sqrtPriceX96 = Math.floor(sqrtPrice * Q96);
    
    return sqrtPriceX96.toString();
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });