const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Uniswap V1 Factory", function () {
    let factory;
    let token;
    let deployer;

    beforeEach(async function () {
        [deployer] = await ethers.getSigners();
        
        // Deploy test token
        const TestToken = await ethers.getContractFactory("contracts/tokens/TestUSDT.sol:TestUSDT");
        token = await TestToken.deploy();
        await token.waitForDeployment();
        
        // Deploy V1 Factory
        const UniswapFactory = await ethers.getContractFactory("UniswapFactory");
        factory = await UniswapFactory.deploy();
        await factory.waitForDeployment();
    });

    it("Should create exchange for token", async function () {
        const tokenAddress = await token.getAddress();
        
        // Create exchange
        const tx = await factory.createExchange(tokenAddress);
        await tx.wait();
        
        // Verify exchange was created
        const exchangeAddress = await factory.getExchange(tokenAddress);
        expect(exchangeAddress).to.not.equal(ethers.ZeroAddress);
        
        // Verify reverse mapping
        const retrievedToken = await factory.getToken(exchangeAddress);
        expect(retrievedToken).to.equal(tokenAddress);
        
        // Verify token count increased
        const tokenCount = await factory.tokenCount();
        expect(tokenCount).to.equal(1);
    });

    it("Should not allow duplicate exchanges", async function () {
        const tokenAddress = await token.getAddress();
        
        // Create first exchange
        await factory.createExchange(tokenAddress);
        
        // Attempt to create duplicate exchange should fail
        await expect(factory.createExchange(tokenAddress))
            .to.be.revertedWith("UniswapFactory: EXCHANGE_EXISTS");
    });

    it("Should not allow zero address token", async function () {
        await expect(factory.createExchange(ethers.ZeroAddress))
            .to.be.revertedWith("UniswapFactory: ZERO_ADDRESS");
    });
});