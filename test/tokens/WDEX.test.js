const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("WDEX Token", function () {
    let wdex;
    let owner, addr1, addr2;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
        
        const WDEX = await ethers.getContractFactory("WDEX");
        wdex = await WDEX.deploy();
        await wdex.waitForDeployment();
    });

    describe("Deployment", function () {
        it("Should have correct name and symbol", async function () {
            expect(await wdex.name()).to.equal("Wrapped DEX");
            expect(await wdex.symbol()).to.equal("WDEX");
            expect(await wdex.decimals()).to.equal(18);
        });

        it("Should have zero initial supply", async function () {
            expect(await wdex.totalSupply()).to.equal(0);
        });
    });

    describe("Deposit", function () {
        it("Should allow HLS deposits", async function () {
            const depositAmount = ethers.parseEther("1.0");
            
            await wdex.connect(addr1).deposit({ value: depositAmount });
            
            expect(await wdex.balanceOf(addr1.address)).to.equal(depositAmount);
            expect(await wdex.totalSupply()).to.equal(depositAmount);
        });

        it("Should emit Deposit event", async function () {
            const depositAmount = ethers.parseEther("1.0");
            
            await expect(wdex.connect(addr1).deposit({ value: depositAmount }))
                .to.emit(wdex, "Deposit")
                .withArgs(addr1.address, depositAmount);
        });

        it("Should work with receive function", async function () {
            const depositAmount = ethers.parseEther("1.0");
            
            await addr1.sendTransaction({
                to: await wdex.getAddress(),
                value: depositAmount
            });
            
            expect(await wdex.balanceOf(addr1.address)).to.equal(depositAmount);
        });
    });

    describe("Withdraw", function () {
        beforeEach(async function () {
            // Deposit some HLS first
            await wdex.connect(addr1).deposit({ value: ethers.parseEther("2.0") });
        });

        it("Should allow HLS withdrawals", async function () {
            const withdrawAmount = ethers.parseEther("1.0");
            const initialBalance = await ethers.provider.getBalance(addr1.address);
            
            const tx = await wdex.connect(addr1).withdraw(withdrawAmount);
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * receipt.gasPrice;
            
            expect(await wdex.balanceOf(addr1.address)).to.equal(ethers.parseEther("1.0"));
            
            const finalBalance = await ethers.provider.getBalance(addr1.address);
            expect(finalBalance).to.equal(initialBalance + withdrawAmount - gasUsed);
        });

        it("Should emit Withdrawal event", async function () {
            const withdrawAmount = ethers.parseEther("1.0");
            
            await expect(wdex.connect(addr1).withdraw(withdrawAmount))
                .to.emit(wdex, "Withdrawal")
                .withArgs(addr1.address, withdrawAmount);
        });

        it("Should revert if insufficient balance", async function () {
            const withdrawAmount = ethers.parseEther("3.0");
            
            await expect(wdex.connect(addr1).withdraw(withdrawAmount))
                .to.be.revertedWith("WDEX: insufficient balance");
        });
    });

    describe("ERC20 Functions", function () {
        beforeEach(async function () {
            await wdex.connect(addr1).deposit({ value: ethers.parseEther("2.0") });
        });

        it("Should allow transfers", async function () {
            const transferAmount = ethers.parseEther("1.0");
            
            await wdex.connect(addr1).transfer(addr2.address, transferAmount);
            
            expect(await wdex.balanceOf(addr1.address)).to.equal(ethers.parseEther("1.0"));
            expect(await wdex.balanceOf(addr2.address)).to.equal(transferAmount);
        });

        it("Should allow approvals and transferFrom", async function () {
            const approveAmount = ethers.parseEther("1.0");
            
            await wdex.connect(addr1).approve(addr2.address, approveAmount);
            expect(await wdex.allowance(addr1.address, addr2.address)).to.equal(approveAmount);
            
            await wdex.connect(addr2).transferFrom(addr1.address, addr2.address, approveAmount);
            
            expect(await wdex.balanceOf(addr1.address)).to.equal(ethers.parseEther("1.0"));
            expect(await wdex.balanceOf(addr2.address)).to.equal(approveAmount);
            expect(await wdex.allowance(addr1.address, addr2.address)).to.equal(0);
        });
    });
});