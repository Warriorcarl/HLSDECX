const fs = require('fs');
const path = require('path');

async function main() {
    console.log("Generating verification JSON files for Helios Explorer...");

    const verificationDir = './deployments/verification';
    
    // Create verification directory
    if (!fs.existsSync(verificationDir)) {
        fs.mkdirSync(verificationDir, { recursive: true });
    }

    // Load deployment addresses
    const deploymentFiles = ['tokens.json', 'uniswap-v2.json', 'utils.json'];
    const allAddresses = {};

    for (const file of deploymentFiles) {
        const filePath = `./deployments/${file}`;
        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            Object.assign(allAddresses, data);
        }
    }

    // Contract source mappings
    const contractSources = {
        WDEX: {
            contractName: 'WDEX',
            sourceFile: 'contracts/tokens/WDEX.sol',
            imports: ['@openzeppelin/contracts/token/ERC20/ERC20.sol', '@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol']
        },
        USDT: {
            contractName: 'TestUSDT',
            sourceFile: 'contracts/tokens/TestUSDT.sol',
            imports: ['./BaseTestToken.sol']
        },
        USDC: {
            contractName: 'TestUSDC',
            sourceFile: 'contracts/tokens/TestUSDC.sol',
            imports: ['./BaseTestToken.sol']
        },
        DAI: {
            contractName: 'TestDAI',
            sourceFile: 'contracts/tokens/TestDAI.sol',
            imports: ['./BaseTestToken.sol']
        },
        BTC: {
            contractName: 'TestBTC',
            sourceFile: 'contracts/tokens/TestBTC.sol',
            imports: ['./BaseTestToken.sol']
        },
        SOL: {
            contractName: 'TestSOL',
            sourceFile: 'contracts/tokens/TestSOL.sol',
            imports: ['./BaseTestToken.sol']
        },
        BNB: {
            contractName: 'TestBNB',
            sourceFile: 'contracts/tokens/TestBNB.sol',
            imports: ['./BaseTestToken.sol']
        },
        ETH: {
            contractName: 'TestETH',
            sourceFile: 'contracts/tokens/TestETH.sol',
            imports: ['./BaseTestToken.sol']
        },
        factory: {
            contractName: 'UniswapV2Factory',
            sourceFile: 'contracts/v2/core/UniswapV2Factory.sol',
            imports: ['../interfaces/IUniswapV2Factory.sol', './UniswapV2Pair.sol']
        },
        router: {
            contractName: 'UniswapV2Router02',
            sourceFile: 'contracts/v2/periphery/UniswapV2Router02.sol',
            imports: [
                '../interfaces/IUniswapV2Router.sol',
                '../interfaces/IUniswapV2Factory.sol',
                '../interfaces/IWDEX.sol',
                '../interfaces/IUniswapV2Pair.sol',
                '@openzeppelin/contracts/token/ERC20/IERC20.sol',
                '@openzeppelin/contracts/security/ReentrancyGuard.sol'
            ]
        },
        multicall: {
            contractName: 'Multicall',
            sourceFile: 'contracts/utils/Multicall.sol',
            imports: []
        },
        priceFeed: {
            contractName: 'PriceFeed',
            sourceFile: 'contracts/utils/PriceFeed.sol',
            imports: [
                '../interfaces/IUniswapV2Pair.sol',
                '../interfaces/IUniswapV2Factory.sol',
                '@openzeppelin/contracts/access/Ownable.sol'
            ]
        },
        lpStaking: {
            contractName: 'LPStaking',
            sourceFile: 'contracts/staking/LPStaking.sol',
            imports: [
                '@openzeppelin/contracts/token/ERC20/IERC20.sol',
                '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol',
                '@openzeppelin/contracts/access/Ownable.sol',
                '@openzeppelin/contracts/security/ReentrancyGuard.sol',
                '@openzeppelin/contracts/security/Pausable.sol'
            ]
        }
    };

    async function generateVerificationJson(contractKey, address) {
        const sourceInfo = contractSources[contractKey];
        if (!sourceInfo) {
            console.warn(`No source info found for ${contractKey}`);
            return;
        }

        try {
            // Read main contract source
            const mainSource = fs.readFileSync(sourceInfo.sourceFile, 'utf8');
            
            // Prepare sources object
            const sources = {};
            sources[sourceInfo.sourceFile] = { content: mainSource };

            // Add imported sources
            for (const importPath of sourceInfo.imports) {
                try {
                    let fullPath;
                    if (importPath.startsWith('@openzeppelin')) {
                        fullPath = path.join('./node_modules', importPath);
                    } else if (importPath.startsWith('./') || importPath.startsWith('../')) {
                        fullPath = path.resolve(path.dirname(sourceInfo.sourceFile), importPath);
                    } else {
                        fullPath = path.join('./contracts', importPath);
                    }

                    if (fs.existsSync(fullPath)) {
                        const importContent = fs.readFileSync(fullPath, 'utf8');
                        sources[importPath] = { content: importContent };
                    }
                } catch (error) {
                    console.warn(`Could not read import ${importPath}:`, error.message);
                }
            }

            // Create verification JSON in Remix format
            const verificationJson = {
                language: "Solidity",
                sources: sources,
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200
                    },
                    outputSelection: {
                        "*": {
                            "*": ["*"]
                        }
                    }
                }
            };

            // Save verification file
            const outputPath = path.join(verificationDir, `${contractKey}_${address}.json`);
            fs.writeFileSync(outputPath, JSON.stringify(verificationJson, null, 2));
            console.log(`Generated verification JSON for ${contractKey}: ${outputPath}`);

        } catch (error) {
            console.error(`Error generating verification JSON for ${contractKey}:`, error.message);
        }
    }

    // Generate verification files for all deployed contracts
    for (const [key, address] of Object.entries(allAddresses)) {
        if (address && address !== '') {
            await generateVerificationJson(key, address);
        }
    }

    // Generate master verification file with all contracts
    const masterVerification = {
        generatedAt: new Date().toISOString(),
        network: {
            name: "Helios Testnet",
            chainId: 42000,
            rpcUrl: "https://testnet1.helioschainlabs.org/",
            explorer: "https://explorer.helioschainlabs.org/"
        },
        contracts: allAddresses,
        solcVersion: "0.8.20",
        optimization: {
            enabled: true,
            runs: 200
        },
        instructions: {
            step1: "Go to Helios Explorer at https://explorer.helioschainlabs.org/",
            step2: "Search for your contract address",
            step3: "Click on 'Verify Contract'",
            step4: "Upload the corresponding JSON file from this directory",
            step5: "Select 'Standard JSON Input' as verification method"
        }
    };

    fs.writeFileSync(
        path.join(verificationDir, 'master-verification.json'),
        JSON.stringify(masterVerification, null, 2)
    );

    console.log(`\n✅ Generated verification files in ${verificationDir}:`);
    console.log(`- ${Object.keys(allAddresses).length} individual contract verification files`);
    console.log('- master-verification.json (summary and instructions)');
    
    return verificationDir;
}

main()
    .then(() => {
        console.log("\n✅ Verification JSON generation complete!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Generation failed:", error);
        process.exit(1);
    });