const fs = require('fs');
const path = require('path');

async function main() {
    console.log("Generating ABI and bytecode files...");

    const artifactsDir = './artifacts/contracts';
    const outputDir = './deployments/abis';

    // Create output directory
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Contract names to extract
    const contracts = [
        // Tokens
        { name: 'WDEX', path: 'tokens/WDEX.sol' },
        { name: 'TestUSDT', path: 'tokens/TestUSDT.sol' },
        { name: 'TestUSDC', path: 'tokens/TestUSDC.sol' },
        { name: 'TestDAI', path: 'tokens/TestDAI.sol' },
        { name: 'TestBTC', path: 'tokens/TestBTC.sol' },
        { name: 'TestSOL', path: 'tokens/TestSOL.sol' },
        { name: 'TestBNB', path: 'tokens/TestBNB.sol' },
        { name: 'TestETH', path: 'tokens/TestETH.sol' },
        
        // Uniswap V2
        { name: 'UniswapV2Factory', path: 'v2/core/UniswapV2Factory.sol' },
        { name: 'UniswapV2Pair', path: 'v2/core/UniswapV2Pair.sol' },
        { name: 'UniswapV2Router02', path: 'v2/periphery/UniswapV2Router02.sol' },
        
        // Staking
        { name: 'LPStaking', path: 'staking/LPStaking.sol' },
        
        // Utils
        { name: 'Multicall', path: 'utils/Multicall.sol' },
        { name: 'PriceFeed', path: 'utils/PriceFeed.sol' }
    ];

    const abiExports = {};
    const bytecodeExports = {};

    for (const contract of contracts) {
        try {
            const artifactPath = path.join(artifactsDir, contract.path, `${contract.name}.json`);
            
            if (fs.existsSync(artifactPath)) {
                const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
                
                abiExports[contract.name] = artifact.abi;
                bytecodeExports[contract.name] = artifact.bytecode;
                
                // Save individual ABI files
                fs.writeFileSync(
                    path.join(outputDir, `${contract.name}.json`),
                    JSON.stringify({ abi: artifact.abi, bytecode: artifact.bytecode }, null, 2)
                );
                
                console.log(`Extracted ${contract.name}`);
            } else {
                console.warn(`Artifact not found: ${artifactPath}`);
            }
        } catch (error) {
            console.error(`Error processing ${contract.name}:`, error.message);
        }
    }

    // Generate JavaScript exports for frontend
    const jsContent = `// Auto-generated ABI and bytecode exports for Helios DEX
// Generated on: ${new Date().toISOString()}

export const ABIS = ${JSON.stringify(abiExports, null, 2)};

export const BYTECODES = ${JSON.stringify(bytecodeExports, null, 2)};

// Individual exports for convenience
${Object.keys(abiExports).map(name => 
    `export const ${name}ABI = ABIS.${name};`
).join('\n')}

${Object.keys(bytecodeExports).map(name => 
    `export const ${name}Bytecode = BYTECODES.${name};`
).join('\n')}

// Contract names for iteration
export const CONTRACT_NAMES = ${JSON.stringify(Object.keys(abiExports))};
`;

    fs.writeFileSync(path.join(outputDir, 'index.js'), jsContent);
    
    // Generate TypeScript declarations
    const tsContent = `// Auto-generated TypeScript declarations for Helios DEX
// Generated on: ${new Date().toISOString()}

export interface ContractABI {
  [key: string]: any[];
}

export interface ContractBytecode {
  [key: string]: string;
}

export declare const ABIS: ContractABI;
export declare const BYTECODES: ContractBytecode;

${Object.keys(abiExports).map(name => 
    `export declare const ${name}ABI: any[];`
).join('\n')}

${Object.keys(bytecodeExports).map(name => 
    `export declare const ${name}Bytecode: string;`
).join('\n')}

export declare const CONTRACT_NAMES: string[];
`;

    fs.writeFileSync(path.join(outputDir, 'index.d.ts'), tsContent);

    console.log(`\nGenerated files in ${outputDir}:`);
    console.log('- index.js (JavaScript exports)');
    console.log('- index.d.ts (TypeScript declarations)');
    console.log(`- ${contracts.length} individual contract JSON files`);
    
    // Generate summary
    const summary = {
        generatedAt: new Date().toISOString(),
        totalContracts: contracts.length,
        contracts: Object.keys(abiExports),
        outputDirectory: outputDir
    };

    fs.writeFileSync(path.join(outputDir, 'summary.json'), JSON.stringify(summary, null, 2));
    console.log('- summary.json (generation summary)');
}

main()
    .then(() => {
        console.log("\n✅ ABI and bytecode generation complete!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Generation failed:", error);
        process.exit(1);
    });