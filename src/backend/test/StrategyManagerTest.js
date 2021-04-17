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

       
    })
    it('withdraw', async () => {
        await mockPool.withdraw(ERC20.address, parseEther("400"));
        expect(await strategyManager.balanceOfNative()).to.eq(parseEther("600"))
        expect(await strategyManager.balanceOf(ERC20.address)).to.eq(parseEther("600"))
        expect(await ERC20.balanceOf(strategyManager.address)).to.eq(parseEther('0'));
        expect(await ERC20.balanceOf(mockPool.address)).to.eq(parseEther('400'))
    })

    it('Update strategy', async () => {
        mockStrategyNew = await MockStrategy.deploy();
        await mockStrategyNew.setWant(ERC20.address);

        await strategyManager.updateStrategy(
            ERC20.address,
            mockStrategyNew.address,
            constants.AddressZero
        );

        expect(await ERC20.balanceOf(mockStrategy.address)).to.eq(parseEther("0"));
        expect(await ERC20.balanceOf(mockStrategyNew.address)).to.eq(parseEther("600"));
    })
    it('validate storage', async () => {
        expect(await strategyManager.strategies(ERC20.address)).to.eq(mockStrategyNew.address);
        expect(await strategyManager.priceOracle(ERC20.address)).to.eq(constants.AddressZero);
        expect(await strategyManager.tokens(0)).to.eq(ERC20.address);
    })
})
describe("Strategy Manager, multi strategy", () => {
    let MockStrategy;
    before(async () => {
        [owner] = await ethers.getSigners();
        WETH = await ethers.getContractFactory("ExampleToken");
        ERC20 = await WETH.deploy(owner.getAddress(), parseEther("10000"));
        AAVE = await WETH.deploy(owner.getAddress(), parseEther("10000"));

        const MockPool = await ethers.getContractFactory("MockPool");
        mockPool = await MockPool.deploy();
        await mockPool.setToken(ERC20.address);

        MockStrategy = await ethers.getContractFactory("MockStrategy");
        mockStrategy = await MockStrategy.deploy();
        await mockStrategy.setWant(ERC20.address);
        mockStrategyAave = await MockStrategy.deploy();
        mockStrategyAave.setWant(AAVE.address);

        const mockOracle = await ethers.getContractFactory("MockOracle");
        mockOracleAave = await mockOracle.deploy();
        // gwei = 9, mockOracle = 8, so 1 = 10
        await mockOracleAave.setPrice(parseUnits("1", "gwei"));

        const StrategyManager = await ethers.getContractFactory("StrategyManager");
        strategyManager = await StrategyManager.deploy();
        await mockPool.setsm(strategyManager.address);
        await strategyManager.updateStrategy(
            ERC20.address,
            mockStrategy.address,
            constant.AddressZero
        );
        await strategyManager.updateStrategy(
            AAVE.address,
            mockStrategyAave.address,
            mockOracleAave.address
        );
    })
    it("Deposit", async () => {

    })
})