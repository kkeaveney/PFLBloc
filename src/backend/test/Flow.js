const { expect } = require("chai");
const { parseEther, parseUnits } = require("ethers/lib/utils");
const { constants } = require("ethers");
const  { block } = require("./utils.js");


describe('Flow', () => {
    let mockStrategy;
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
        await ERC20.transfer(strategyManager.address, parseEther('1000'))
        expect(await ERC20.balanceOf(strategyManager.address)).to.eq(parseEther('1000'));
        expect(await strategyManager.balanceOf(ERC20.address)).to.eq(parseEther('0'));
        expect(await strategyManager.balanceOfNative()).to.eq(parseEther('0'));

        // Strategy Manager deposits Eth into Eth Token Strategy
        await strategyManager.deposit(ERC20.address);
        expect(await ERC20.balanceOf(strategyManager.address)).to.eq(parseEther('0'));
        expect(await strategyManager.balanceOf(ERC20.address)).to.eq(parseEther('1000'));
        expect(await strategyManager.balanceOfNative()).to.eq(parseEther('1000'));
        expect(await ERC20.balanceOf(mockPool.address)).to.eq(parseEther('0'));
    })

    it('Withdraw', async () => {
        await mockPool.withdraw(ERC20.address, parseEther('400'));
        expect(await ERC20.balanceOf(strategyManager.address)).to.eq(parseEther('0'));
        expect(await strategyManager.balanceOfNative()).to.eq(parseEther('600'));
        expect(await strategyManager.balanceOf(ERC20.address)).to.eq(parseEther('600'));
        expect(await ERC20.balanceOf(mockPool.address)).to.eq(parseEther('400'));
    })
    it('Updates Strategy', async () => {
        // updates Strategy, transfers Token to new Strategy
        mockStrategyNew = await MockStrategy.deploy()
        await mockStrategyNew.setWant(ERC20.address);
        await strategyManager.updateStrategy(
            ERC20.address,
            mockStrategyNew.address,
            constants.AddressZero
        )
        expect(await ERC20.balanceOf(mockStrategy.address)).to.eq(parseEther('0'));
        expect(await ERC20.balanceOf(mockStrategyNew.address)).to.eq(parseEther('600'));
    })
    it('validates storage', async () => {
        expect(await strategyManager.strategies(ERC20.address)).to.eq(mockStrategyNew.address);
        expect(await strategyManager.priceOracle(ERC20.address)).to.eq(constants.AddressZero)
        expect(await strategyManager.tokens(0)).to.eq(ERC20.address)
    })
})
describe('multi strategies', () => {


let MockStrategy;
    before(async function () {
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
      await mockStrategyAave.setWant(AAVE.address);
  
      const MockOracle = await ethers.getContractFactory("MockOracle");
      mockOracleAave = await MockOracle.deploy();
      // gwei = 9, mockOracle = 8. so 1 == 10
      await mockOracleAave.setPrice(parseUnits("1", "gwei"));
  
      const StrategyManager = await ethers.getContractFactory("StrategyManager");
      strategyManager = await StrategyManager.deploy();
      await mockPool.setSm(strategyManager.address);
      await strategyManager.setPool(mockPool.address);

      await strategyManager.updateStrategy(
          ERC20.address,
          mockStrategy.address,
          constants.AddressZero
      )

      await strategyManager.updateStrategy(
          AAVE.address,
          mockStrategyAave.address,
          mockOracleAave.address
      )
    });
    it('deposit', async () => {
        await ERC20.transfer(strategyManager.address, parseEther('1000'));
        expect(await ERC20.balanceOf(strategyManager.address)).to.be.equal(parseEther('1000'));
        expect(await strategyManager.balanceOf(ERC20.address)).to.be.equal(parseEther('0'))
        expect(await strategyManager.balanceOfNative()).to.be.equal(parseEther('0'))

        // Deposit ERC20
        await strategyManager.deposit(ERC20.address);
        expect(await ERC20.balanceOf(strategyManager.address)).to.be.equal(parseEther('0'));
        expect(await strategyManager.balanceOf(ERC20.address)).to.be.equal(parseEther('1000'));
        expect(await strategyManager.balanceOfNative()).to.be.equal(parseEther('1000'));
        // Depsoit into AAVE
        await AAVE.transfer(strategyManager.address, parseEther('300'))
        expect(await AAVE.balanceOf(strategyManager.address)).to.be.equal(parseEther('300'));
        await strategyManager.deposit(AAVE.address);
        expect(await AAVE.balanceOf(strategyManager.address)).to.be.equal(parseEther('0'));
        expect(await strategyManager.balanceOf(AAVE.address)).to.be.equal(parseEther('300'));
        expect(await strategyManager.balanceOfNative()).to.be.equal(parseEther('4000')); // WHY IS THIS ??
    })

    it('validate storage', async () => {
        expect(await strategyManager.strategies(ERC20.address)).to.eq(mockStrategy.address);
        expect(await strategyManager.priceOracle(ERC20.address)).to.eq(constants.AddressZero);
        expect(await strategyManager.tokens(0)).to.eq(ERC20.address);
        expect(await strategyManager.tokens(1)).to.eq(AAVE.address);
        expect(await strategyManager.strategies(AAVE.address)).to.eq(mockStrategyAave.address)
    })

    it('removes strategy', async () => {
        // ignore tokens
        // check balances
        expect(await strategyManager.balanceOf(ERC20.address)).to.eq(parseEther('1000'))
        expect(await strategyManager.balanceOf(AAVE.address)).to.eq(parseEther('300'))
        
        // remove strategy
        await mockStrategyAave.setWithdrawAllReturn(0);
        await strategyManager.removeStrategy(AAVE.address, 1);
        expect(await strategyManager.balanceOf(ERC20.address)).to.eq(parseEther('1000'))
        expect(await strategyManager.balanceOf(AAVE.address)).to.eq(parseEther('0')) // WHERE HAS IT GONE?
        expect(await strategyManager.balanceOfNative()).to.eq(parseEther('1000'))  // WHY
        
    })

    it('validates storage again', async () => {
        // ERC20
        expect(await strategyManager.strategies(ERC20.address)).to.eq(mockStrategy.address);
        expect(await strategyManager.priceOracle(ERC20.address)).to.eq(constants.AddressZero);
        expect(await strategyManager.tokens(0)).to.eq(ERC20.address);
        // AAVE
        expect(await strategyManager.strategies(AAVE.address)).to.eq(constants.AddressZero);
        expect(await strategyManager.priceOracle(AAVE.address)).to.eq(constants.AddressZero);
        await expect(strategyManager.tokens(1)).to.be.reverted;
    })
})  
    
