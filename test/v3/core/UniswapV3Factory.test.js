const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Uniswap V3 Factory", function () {
    let factory;
    let token0, token1;
    let deployer;

    beforeEach(async function () {
        [deployer] = await ethers.getSigners();
        
        // Deploy test tokens
        const TestToken = await ethers.getContractFactory("contracts/tokens/TestUSDT.sol:TestUSDT");
        token0 = await TestToken.deploy();
        await token0.waitForDeployment();
        
        const TestToken2 = await ethers.getContractFactory("contracts/tokens/TestUSDC.sol:TestUSDC");
        token1 = await TestToken2.deploy();
        await token1.waitForDeployment();
        
        // Deploy V3 Factory
        const UniswapV3Factory = await ethers.getContractFactory("UniswapV3Factory");
        factory = await UniswapV3Factory.deploy();
        await factory.waitForDeployment();
    });

    it("Should have correct initial fee amounts", async function () {
        expect(await factory.feeAmountTickSpacing(500)).to.equal(10);
        expect(await factory.feeAmountTickSpacing(3000)).to.equal(60);
        expect(await factory.feeAmountTickSpacing(10000)).to.equal(200);
    });

    it("Should create pool with valid fee tier", async function () {
        const token0Address = await token0.getAddress();
        const token1Address = await token1.getAddress();
        
        // Create pool
        const tx = await factory.createPool(token0Address, token1Address, 3000);
        await tx.wait();
        
        // Verify pool was created
        const poolAddress = await factory.getPool(token0Address, token1Address, 3000);
        expect(poolAddress).to.not.equal(ethers.ZeroAddress);
        
        // Verify reverse mapping works
        const reversePool = await factory.getPool(token1Address, token0Address, 3000);
        expect(reversePool).to.equal(poolAddress);
    });

    it("Should not allow duplicate pools", async function () {
        const token0Address = await token0.getAddress();
        const token1Address = await token1.getAddress();
        
        // Create first pool
        await factory.createPool(token0Address, token1Address, 3000);
        
        // Attempt to create duplicate should fail
        await expect(factory.createPool(token0Address, token1Address, 3000))
            .to.be.reverted;
    });

    it("Should not allow invalid fee tier", async function () {
        const token0Address = await token0.getAddress();
        const token1Address = await token1.getAddress();
        
        // Attempt to create pool with invalid fee
        await expect(factory.createPool(token0Address, token1Address, 1000))
            .to.be.reverted;
    });

    it("Should allow owner to enable new fee amounts", async function () {
        // Enable new fee amount
        await factory.enableFeeAmount(2500, 50);
        
        // Verify it was enabled
        expect(await factory.feeAmountTickSpacing(2500)).to.equal(50);
        
        // Should be able to create pool with new fee
        const token0Address = await token0.getAddress();
        const token1Address = await token1.getAddress();
        
        await factory.createPool(token0Address, token1Address, 2500);
        const poolAddress = await factory.getPool(token0Address, token1Address, 2500);
        expect(poolAddress).to.not.equal(ethers.ZeroAddress);
    });
});