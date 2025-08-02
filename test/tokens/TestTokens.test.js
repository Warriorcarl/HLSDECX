const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Test Tokens", function () {
    let testUSDT, testBTC;
    let owner, addr1, addr2;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
        
        const TestUSDT = await ethers.getContractFactory("TestUSDT");
        testUSDT = await TestUSDT.deploy();
        await testUSDT.waitForDeployment();

        const TestBTC = await ethers.getContractFactory("TestBTC");
        testBTC = await TestBTC.deploy();
        await testBTC.waitForDeployment();
    });

    describe("Deployment", function () {
        it("Should have correct properties for USDT", async function () {
            expect(await testUSDT.name()).to.equal("Test Tether USD");
            expect(await testUSDT.symbol()).to.equal("USDT");
            expect(await testUSDT.decimals()).to.equal(6);
            expect(await testUSDT.totalSupply()).to.equal(1000000 * 10**6); // 1M USDT
        });

        it("Should have correct properties for BTC", async function () {
            expect(await testBTC.name()).to.equal("Test Bitcoin");
            expect(await testBTC.symbol()).to.equal("BTC");
            expect(await testBTC.decimals()).to.equal(8);
            expect(await testBTC.totalSupply()).to.equal(21000 * 10**8); // 21K BTC
        });

        it("Should give deployer initial supply", async function () {
            expect(await testUSDT.balanceOf(owner.address)).to.equal(1000000 * 10**6);
            expect(await testBTC.balanceOf(owner.address)).to.equal(21000 * 10**8);
        });
    });

    describe("Faucet Functionality", function () {
        it("Should allow users to mint tokens via faucet", async function () {
            await testUSDT.connect(addr1).faucet();
            
            const expectedAmount = 1000 * 10**6; // 1000 USDT with 6 decimals
            expect(await testUSDT.balanceOf(addr1.address)).to.equal(expectedAmount);
        });

        it("Should emit Faucet event", async function () {
            const expectedAmount = 1000 * 10**6;
            
            await expect(testUSDT.connect(addr1).faucet())
                .to.emit(testUSDT, "Faucet")
                .withArgs(addr1.address, expectedAmount);
        });

        it("Should enforce cooldown period", async function () {
            await testUSDT.connect(addr1).faucet();
            
            await expect(testUSDT.connect(addr1).faucet())
                .to.be.revertedWith("BaseTestToken: faucet cooldown active");
        });

        it("Should allow admin faucet without cooldown", async function () {
            const customAmount = 5000 * 10**6; // 5000 USDT
            
            await testUSDT.connect(owner).adminFaucet(addr1.address, customAmount);
            expect(await testUSDT.balanceOf(addr1.address)).to.equal(customAmount);
            
            // Should still allow regular faucet after admin faucet
            await testUSDT.connect(addr1).faucet();
            expect(await testUSDT.balanceOf(addr1.address)).to.equal(customAmount + 1000 * 10**6);
        });

        it("Should not allow faucet for blacklisted users", async function () {
            await testUSDT.connect(owner).setBlacklisted(addr1.address, true);
            
            await expect(testUSDT.connect(addr1).faucet())
                .to.be.revertedWith("BaseTestToken: account blacklisted");
        });
    });

    describe("Blacklist Functionality", function () {
        beforeEach(async function () {
            // Give addr1 some tokens first
            await testUSDT.connect(owner).adminFaucet(addr1.address, 1000 * 10**6);
        });

        it("Should allow owner to blacklist addresses", async function () {
            await testUSDT.connect(owner).setBlacklisted(addr1.address, true);
            expect(await testUSDT.blacklisted(addr1.address)).to.be.true;
        });

        it("Should prevent blacklisted users from transferring", async function () {
            await testUSDT.connect(owner).setBlacklisted(addr1.address, true);
            
            await expect(testUSDT.connect(addr1).transfer(addr2.address, 100 * 10**6))
                .to.be.revertedWith("BaseTestToken: account blacklisted");
        });

        it("Should prevent transfers to blacklisted addresses", async function () {
            await testUSDT.connect(owner).setBlacklisted(addr2.address, true);
            
            await expect(testUSDT.connect(addr1).transfer(addr2.address, 100 * 10**6))
                .to.be.revertedWith("BaseTestToken: account blacklisted");
        });

        it("Should emit Blacklisted event", async function () {
            await expect(testUSDT.connect(owner).setBlacklisted(addr1.address, true))
                .to.emit(testUSDT, "Blacklisted")
                .withArgs(addr1.address, true);
        });
    });

    describe("Pausable Functionality", function () {
        beforeEach(async function () {
            await testUSDT.connect(owner).adminFaucet(addr1.address, 1000 * 10**6);
        });

        it("Should allow owner to pause contract", async function () {
            await testUSDT.connect(owner).pause();
            expect(await testUSDT.paused()).to.be.true;
        });

        it("Should prevent faucet when paused", async function () {
            await testUSDT.connect(owner).pause();
            
            await expect(testUSDT.connect(addr2).faucet())
                .to.be.revertedWith("Pausable: paused");
        });

        it("Should prevent transfers when paused", async function () {
            await testUSDT.connect(owner).pause();
            
            await expect(testUSDT.connect(addr1).transfer(addr2.address, 100 * 10**6))
                .to.be.revertedWith("Pausable: paused");
        });

        it("Should allow owner to unpause", async function () {
            await testUSDT.connect(owner).pause();
            await testUSDT.connect(owner).unpause();
            
            expect(await testUSDT.paused()).to.be.false;
            
            // Should work normally after unpause
            await testUSDT.connect(addr1).transfer(addr2.address, 100 * 10**6);
            expect(await testUSDT.balanceOf(addr2.address)).to.equal(100 * 10**6);
        });
    });

    describe("Burn Functionality", function () {
        beforeEach(async function () {
            await testUSDT.connect(owner).adminFaucet(addr1.address, 1000 * 10**6);
        });

        it("Should allow users to burn their tokens", async function () {
            const burnAmount = 100 * 10**6;
            const initialSupply = await testUSDT.totalSupply();
            
            await testUSDT.connect(addr1).burn(burnAmount);
            
            expect(await testUSDT.balanceOf(addr1.address)).to.equal(900 * 10**6);
            expect(await testUSDT.totalSupply()).to.equal(initialSupply - BigInt(burnAmount));
        });
    });

    describe("Access Control", function () {
        it("Should not allow non-owner to use admin functions", async function () {
            await expect(testUSDT.connect(addr1).adminFaucet(addr2.address, 1000 * 10**6))
                .to.be.revertedWith("Ownable: caller is not the owner");
            
            await expect(testUSDT.connect(addr1).setBlacklisted(addr2.address, true))
                .to.be.revertedWith("Ownable: caller is not the owner");
            
            await expect(testUSDT.connect(addr1).pause())
                .to.be.revertedWith("Ownable: caller is not the owner");
        });
    });
});