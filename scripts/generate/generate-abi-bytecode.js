const fs = require('fs');
const path = require('path');

async function main() {
    console.log("Generating ABI and bytecode files for all versions...");

    const artifactsDir = './artifacts/contracts';
    const outputDir = './deployments/abis';

    // Create output directory
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Contract names to extract - organized by version
    const contracts = {
        // Core tokens
        tokens: [
            { name: 'WDEX', path: 'tokens/WDEX.sol' },
            { name: 'TestUSDT', path: 'tokens/TestUSDT.sol' },
            { name: 'TestUSDC', path: 'tokens/TestUSDC.sol' },
            { name: 'TestDAI', path: 'tokens/TestDAI.sol' },
            { name: 'TestBTC', path: 'tokens/TestBTC.sol' },
            { name: 'TestSOL', path: 'tokens/TestSOL.sol' },
            { name: 'TestBNB', path: 'tokens/TestBNB.sol' },
            { name: 'TestETH', path: 'tokens/TestETH.sol' },
        ],
        
        // Uniswap V1
        v1: [
            { name: 'UniswapFactory', path: 'v1/UniswapFactory.sol' },
            { name: 'UniswapExchange', path: 'v1/UniswapExchange.sol' },
        ],
        
        // Uniswap V2 (from existing implementation)
        v2: [
            { name: 'UniswapV2Factory', path: 'v2/core/UniswapV2Factory.sol' },
            { name: 'UniswapV2Pair', path: 'v2/core/UniswapV2Pair.sol' },
            { name: 'UniswapV2Router02', path: 'v2/periphery/UniswapV2Router02.sol' },
        ],
        
        // Uniswap V3
        v3: [
            { name: 'UniswapV3Factory', path: 'v3/core/UniswapV3Factory.sol' },
            { name: 'SwapRouter', path: 'v3/periphery/SwapRouter.sol' },
            { name: 'BitMath', path: 'v3/core/libraries/BitMath.sol' },
            { name: 'FullMath', path: 'v3/core/libraries/FullMath.sol' },
            { name: 'TickMath', path: 'v3/core/libraries/TickMath.sol' },
        ],
        
        // Utilities
        utils: [
            { name: 'UniversalRouter', path: 'utils/UniversalRouter.sol' },
            { name: 'Multicall', path: 'utils/Multicall.sol' },
            { name: 'PriceFeed', path: 'utils/PriceFeed.sol' },
            { name: 'LPStaking', path: 'staking/LPStaking.sol' },
        ]
    };

    const allContracts = {};
    const abiExports = {};
    const bytecodeExports = {};

    // Process all contract categories
    for (const [category, contractList] of Object.entries(contracts)) {
        console.log(`\nProcessing ${category.toUpperCase()} contracts...`);
        allContracts[category] = {};
        
        for (const contract of contractList) {
            try {
                const artifactPath = path.join(artifactsDir, contract.path, `${contract.name}.json`);
                
                if (fs.existsSync(artifactPath)) {
                    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
                    
                    allContracts[category][contract.name] = {
                        abi: artifact.abi,
                        bytecode: artifact.bytecode
                    };
                    
                    abiExports[contract.name] = artifact.abi;
                    bytecodeExports[contract.name] = artifact.bytecode;
                    
                    // Save individual ABI files
                    fs.writeFileSync(
                        path.join(outputDir, `${contract.name}.json`),
                        JSON.stringify({ abi: artifact.abi, bytecode: artifact.bytecode }, null, 2)
                    );
                    
                    console.log(`✅ Extracted ${contract.name}`);
                } else {
                    console.warn(`⚠️  Artifact not found: ${artifactPath}`);
                }
            } catch (error) {
                console.error(`❌ Error processing ${contract.name}:`, error.message);
            }
        }
    }

    // Generate comprehensive JavaScript exports
    const jsContent = `// Auto-generated ABI and bytecode exports for Helios DEX
// Multi-version Uniswap implementation (V1, V2, V3)
// Generated on: ${new Date().toISOString()}

// All contracts organized by category
export const contracts = ${JSON.stringify(allContracts, null, 2)};

// Flat exports for backward compatibility
export const ABIS = ${JSON.stringify(abiExports, null, 2)};

export const BYTECODES = ${JSON.stringify(bytecodeExports, null, 2)};

// Individual ABI exports
${Object.keys(abiExports).map(name => 
    `export const ${name}ABI = ABIS.${name};`
).join('\n')}

// Individual bytecode exports
${Object.keys(bytecodeExports).map(name => 
    `export const ${name}Bytecode = BYTECODES.${name};`
).join('\n')}

// Version-specific exports
export const V1_CONTRACTS = contracts.v1;
export const V2_CONTRACTS = contracts.v2;  
export const V3_CONTRACTS = contracts.v3;
export const TOKEN_CONTRACTS = contracts.tokens;
export const UTIL_CONTRACTS = contracts.utils;

// Contract names for iteration
export const CONTRACT_NAMES = ${JSON.stringify(Object.keys(abiExports))};

// Version information
export const VERSION_INFO = {
    v1: {
        name: "Uniswap V1",
        description: "Simple exchange contracts with HLS native support",
        contracts: ${JSON.stringify(Object.keys(allContracts.v1 || {}))}
    },
    v2: {
        name: "Uniswap V2", 
        description: "AMM with pair-based liquidity",
        contracts: ${JSON.stringify(Object.keys(allContracts.v2 || {}))}
    },
    v3: {
        name: "Uniswap V3",
        description: "Concentrated liquidity AMM with multiple fee tiers", 
        contracts: ${JSON.stringify(Object.keys(allContracts.v3 || {}))}
    }
};

// Network configuration for Helios Testnet
export const HELIOS_CONFIG = {
    chainId: 42000,
    name: "Helios Testnet",
    rpcUrl: "https://testnet1.helioschainlabs.org/",
    nativeCurrency: {
        name: "Helios",
        symbol: "HLS", 
        decimals: 18,
        targetPrice: 10000 // USD
    }
};
`;

    fs.writeFileSync(path.join(outputDir, 'index.js'), jsContent);
    
    // Generate enhanced TypeScript declarations
    const tsContent = `// Auto-generated TypeScript declarations for Helios DEX
// Multi-version Uniswap implementation (V1, V2, V3)
// Generated on: ${new Date().toISOString()}

export interface ContractInfo {
  abi: any[];
  bytecode: string;
}

export interface CategoryContracts {
  [contractName: string]: ContractInfo;
}

export interface AllContracts {
  tokens: CategoryContracts;
  v1: CategoryContracts;
  v2: CategoryContracts;
  v3: CategoryContracts;
  utils: CategoryContracts;
}

export interface VersionInfo {
  name: string;
  description: string;
  contracts: string[];
}

export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
    targetPrice: number;
  };
}

export declare const contracts: AllContracts;
export declare const ABIS: { [key: string]: any[] };
export declare const BYTECODES: { [key: string]: string };

${Object.keys(abiExports).map(name => 
    `export declare const ${name}ABI: any[];`
).join('\n')}

${Object.keys(bytecodeExports).map(name => 
    `export declare const ${name}Bytecode: string;`
).join('\n')}

export declare const V1_CONTRACTS: CategoryContracts;
export declare const V2_CONTRACTS: CategoryContracts;
export declare const V3_CONTRACTS: CategoryContracts;
export declare const TOKEN_CONTRACTS: CategoryContracts;
export declare const UTIL_CONTRACTS: CategoryContracts;

export declare const CONTRACT_NAMES: string[];

export declare const VERSION_INFO: {
  v1: VersionInfo;
  v2: VersionInfo;
  v3: VersionInfo;
};

export declare const HELIOS_CONFIG: NetworkConfig;
`;

    fs.writeFileSync(path.join(outputDir, 'index.d.ts'), tsContent);

    console.log(`\n📄 Generated files in ${outputDir}:`);
    console.log('- index.js (JavaScript exports with version organization)');
    console.log('- index.d.ts (TypeScript declarations)');
    console.log(`- ${Object.keys(abiExports).length} individual contract JSON files`);
    
    // Generate comprehensive summary
    const summary = {
        generatedAt: new Date().toISOString(),
        versions: {
            v1: {
                totalContracts: Object.keys(allContracts.v1 || {}).length,
                contracts: Object.keys(allContracts.v1 || {})
            },
            v2: {
                totalContracts: Object.keys(allContracts.v2 || {}).length,
                contracts: Object.keys(allContracts.v2 || {})
            },
            v3: {
                totalContracts: Object.keys(allContracts.v3 || {}).length,
                contracts: Object.keys(allContracts.v3 || {})
            }
        },
        tokens: {
            totalContracts: Object.keys(allContracts.tokens || {}).length,
            contracts: Object.keys(allContracts.tokens || {})
        },
        utils: {
            totalContracts: Object.keys(allContracts.utils || {}).length,
            contracts: Object.keys(allContracts.utils || {})
        },
        totalContracts: Object.keys(abiExports).length,
        outputDirectory: outputDir,
        heliosConfig: {
            chainId: 42000,
            nativeToken: "HLS",
            targetPrice: "$10,000"
        }
    };

    fs.writeFileSync(path.join(outputDir, 'summary.json'), JSON.stringify(summary, null, 2));
    console.log('- summary.json (comprehensive generation summary)');
    
    console.log('\n📊 Generation Summary:');
    console.log(`   Total contracts: ${summary.totalContracts}`);
    console.log(`   V1 contracts: ${summary.versions.v1.totalContracts}`);
    console.log(`   V2 contracts: ${summary.versions.v2.totalContracts}`);
    console.log(`   V3 contracts: ${summary.versions.v3.totalContracts}`);
    console.log(`   Token contracts: ${summary.tokens.totalContracts}`);
    console.log(`   Utility contracts: ${summary.utils.totalContracts}`);
}

main()
    .then(() => {
        console.log("\n✅ Multi-version ABI and bytecode generation complete!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Generation failed:", error);
        process.exit(1);
    });