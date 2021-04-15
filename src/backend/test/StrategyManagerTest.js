const { expect } = require("chai");
const { parseEther, parseUnits } = require("ethers/lib/utils");
const { constants } = require("ethers");
const  { block } = require("./utils.js");


describe("Strategy Manager, single strategy", () => {
    let MockStrategy;
    before(async () => {
        [owner] = await ethers.getSigners();
        let WETH = await ethers.getContractFactory("ExampleToken");
        ERC20 = await WETH.deploy(owner.getAddress(), parseEther("10000"));
        AAVE = await WETH.deploy(owner.getAddress(), parseEther("10000"));

        const MockPool = await ethers.getContractFactory("MockPool")
        mockPool = await MockPool.deploy()
        await mockPool.setToken(ERC20.address);

        MockStrategy = await ethers.getContractFactory("MockStrategy");
        mockStrategy = await MockStrategy.deploy();
        await mockStrategy.setWant(ERC20.address)

        const StrategyManager = await ethers.getContractFactory("StrategyManager");
        strategyManager = await StrategyManager.deploy();
        await mockPool.setSm(strategyManager.address)
        await strategyManager.setPool(mockPool.address);
        await strategyManager.updateStrategy(
            ERC20.address,
            mockStrategy.address,
            constants.AddressZero
        );
    })
    it('Deposit', async () => {
        // Transfer Eth to Strategy Manager
        await ERC20.transfer(strategyManager.address, parseEther('1000'));
        expect(await ERC20.balanceOf(strategyManager.address)).to.eq(parseEther('1000'));
        expect(await strategyManager.balanceOfNative()).to.eq(parseEther("0"));

        // Strategy Manager deposits Eth into Eth Token Strategy 
        await strategyManager.deposit(ERC20.address);
        expect(await ERC20.balanceOf(strategyManager.address)).to.eq(parseEther('0'));
        expect(await strategyManager.balanceOf(ERC20.address)).to.eq(
            parseEther('1000')
        );
        expect(await strategyManager.balanceOfNative()).to.eq(parseEther("1000"));

        // Deposit more funds
        await ERC20.transfer(strategyManager.address, parseEther('5000'));
        expect(await ERC20.balanceOf(strategyManager.address)).to.eq(parseEther('5000'))
        expect(await strategyManager.balanceOf(ERC20.address)).to.eq(
            parseEther('1000')
        );
        expect(await strategyManager.balanceOfNative()).to.eq(parseEther("1000"));
        await strategyManager.deposit(ERC20.address);
        expect(await ERC20.balanceOf(strategyManager.address)).to.eq(parseEther('0'));
        expect(await strategyManager.balanceOf(ERC20.address)).to.eq(
            parseEther('6000')
        );
        expect(await strategyManager.balanceOfNative()).to.eq(parseEther("6000"));

    })
})