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
        expect(await mockStrategy.balanceOf()).to.eq(parseEther('0'));
        expect(await strategyManager.balanceOf(ERC20.address)).to.eq(parseEther('0'));
        expect(await strategyManager.balanceOfNative()).to.eq(parseEther('0'));
        
        // Strategy Manager deposits Eth into Eth Token Strategy
        await strategyManager.deposit(ERC20.address);
        expect(await ERC20.balanceOf(strategyManager.address)).to.eq(parseEther('0'));
        expect(await mockStrategy.balanceOf()).to.eq(parseEther('1000'));
        expect(await strategyManager.balanceOf(ERC20.address)).to.eq(parseEther('1000'));
        expect(await strategyManager.balanceOfNative()).to.eq(parseEther('1000'));
    })

    it('Withdraw', async () => {
        await mockPool.withdraw(ERC20.address, parseEther('400'));
        expect(await ERC20.balanceOf(strategyManager.address)).to.eq(parseEther('0'));
        expect(await strategyManager.balanceOfNative()).to.eq(parseEther('600'));
        expect(await strategyManager.balanceOf(ERC20.address)).to.eq(parseEther('600'));
        expect(await ERC20.balanceOf(mockPool.address)).to.eq(parseEther('400'));
        expect(await mockStrategy.balanceOf()).to.eq(parseEther('600'));
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
        expect(await mockStrategy.balanceOf()).to.be.equal(parseEther('1000'));
        expect(await strategyManager.balanceOf(ERC20.address)).to.be.equal(parseEther('1000'));
        expect(await strategyManager.balanceOfNative()).to.be.equal(parseEther('1000'));
        // Depsoit into AAVE
        await AAVE.transfer(strategyManager.address, parseEther('300'))
        expect(await AAVE.balanceOf(strategyManager.address)).to.be.equal(parseEther('300'));
        await strategyManager.deposit(AAVE.address);
        expect(await AAVE.balanceOf(strategyManager.address)).to.be.equal(parseEther('0'));
        expect(await mockStrategyAave.balanceOf()).to.be.equal(parseEther('300'));
        expect(await strategyManager.balanceOf(AAVE.address)).to.be.equal(parseEther('300'));
        expect(await strategyManager.balanceOfNative()).to.be.equal(parseEther('4000')); 
    })

    it('validate storage', async () => {
        expect(await strategyManager.strategies(ERC20.address)).to.eq(mockStrategy.address);
        expect(await strategyManager.priceOracle(ERC20.address)).to.eq(constants.AddressZero);
        expect(await strategyManager.tokens(0)).to.eq(ERC20.address);
        expect(await strategyManager.tokens(1)).to.eq(AAVE.address);
        expect(await strategyManager.strategies(AAVE.address)).to.eq(mockStrategyAave.address)
    })

    it('removes ERC20 strategy', async () => {
        // Confirm strategy manager Token balance
        expect(await ERC20.balanceOf(strategyManager.address)).to.eq(parseEther('0'));
        // Return funds back to the strategy manager
        await strategyManager.removeStrategy(ERC20.address, 0);
        expect(await ERC20.balanceOf(strategyManager.address)).to.eq(parseEther('1000'));
        expect(await strategyManager.balanceOf(ERC20.address)).to.eq(parseEther('0'));
        expect(await mockStrategy.balanceOf()).to.be.eq(parseEther('0'));
        // ERC20 balance removed, AAVE remains
        expect(await strategyManager.balanceOfNative()).to.be.equal(parseEther('3000')); 
        // Withdraw not possible
        await expect(strategyManager.withdraw(ERC20.address, parseEther('0'))).to.be.revertedWith('ONLY_POOL');
        // Deposit not possible
        await expect(strategyManager.deposit(ERC20.address)).to.be.revertedWith('NO_STRATEGY');
    })

    it('removes AAVE Strategy', async () => {
        // Confirm strategy manager Token balance
        expect(await AAVE.balanceOf(strategyManager.address)).to.eq(parseEther('0'));
        // Return funds back to the strategy manager
        await strategyManager.removeStrategy(AAVE.address, 0);
        expect(await AAVE.balanceOf(strategyManager.address)).to.eq(parseEther('300'));
        expect(await strategyManager.balanceOf(AAVE.address)).to.eq(parseEther('0'));
        expect(await mockStrategyAave.balanceOf()).to.be.eq(parseEther('0'));
        // ERC20 balance removed, AAVE balance removed
        expect(await strategyManager.balanceOfNative()).to.be.equal(parseEther('0'));
        // Withdraw not possible
        await expect(strategyManager.withdraw(AAVE.address, parseEther('0'))).to.be.revertedWith('ONLY_POOL');
        // Deposit not possible
        await expect(strategyManager.deposit(AAVE.address)).to.be.revertedWith('NO_STRATEGY');
        

    })

    it('validates storage again', async () => {
        expect(await strategyManager.strategies(ERC20.address)).to.eq(constants.AddressZero);
        expect(await strategyManager.priceOracle(ERC20.address)).to.eq(constants.AddressZero);
        expect(await strategyManager.strategies(AAVE.address)).to.eq(constants.AddressZero);
        expect(await strategyManager.priceOracle(AAVE.address)).to.eq(constants.AddressZero);
        await expect(strategyManager.tokens(0)).to.be.reverted;
        await expect(strategyManager.tokens(1)).to.be.reverted;
    })

})

describe('multi strategies with active oracles', () => {
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
    it('deposits, validates balance of native', async () => {
        await ERC20.transfer(strategyManager.address, parseEther('10000'));
        await AAVE.transfer(strategyManager.address, parseEther('10000'));
        expect(await strategyManager.balanceOfNative()).to.be.equal(parseEther('0'))

        await strategyManager.deposit(ERC20.address);
        await strategyManager.deposit(AAVE.address);
        expect(await strategyManager.balanceOfNative()).to.be.equal(parseEther('110000')) 
    })

    it('withdraws funds from strategy', async () => {
        // Withdraw funds from strategy to owner
        expect(await mockStrategy.balanceOf()).to.eq(parseEther('10000'));
        expect(await mockStrategyAave.balanceOf()).to.eq(parseEther('10000'));
        expect(await ERC20.balanceOf(owner.address)).to.eq(parseEther('0'));
        expect(await AAVE.balanceOf(owner.address)).to.eq(parseEther('0'));
        // Overloaded withdraw function
        // ERC20
        await mockStrategy["withdraw(uint256)"](parseEther('5000'));
        expect(await ERC20.balanceOf(owner.address)).to.eq(parseEther('5000'));
        // AAVE
        await mockStrategyAave["withdraw(uint256)"](parseEther('5000'));
        expect(await AAVE.balanceOf(owner.address)).to.eq(parseEther('5000'));    
    })
    it('reverts deposits, withdrawals', async () => {
        // ERC20
        await mockStrategy.setWithdrawRevert(1);
        await expect(mockStrategy["withdraw(uint256)"](parseEther('5000'))).to.be.revertedWith('Withdraw_Revert');
        await mockStrategy.setWithdrawAllRevert(1);
        await expect(mockStrategy.withdrawAll()).to.be.revertedWith('Withdraw_all_Revert');
        // AAVE
        await mockStrategyAave.setWithdrawRevert(1);
        await expect(mockStrategyAave["withdraw(uint256)"](parseEther('5000'))).to.be.revertedWith('Withdraw_Revert')
        await mockStrategyAave.setWithdrawAllRevert(1);
        await expect(mockStrategyAave.withdrawAll()).to.be.revertedWith('Withdraw_all_Revert');
    })

    it('withdraws all funds, refunds owner', async () => {
        
        expect(await ERC20.balanceOf(owner.address)).to.eq(parseEther('5000'));
        expect(await AAVE.balanceOf(owner.address)).to.eq(parseEther('5000')); 
        expect(await mockStrategy.balanceOf()).to.eq(parseEther('5000'));
        expect(await mockStrategyAave.balanceOf()).to.eq(parseEther('5000'));

        await mockStrategy.setWithdrawAllRevert(0);
        await mockStrategyAave.setWithdrawAllRevert(0);
        
        await mockStrategy.withdrawAll();
        await mockStrategyAave.withdrawAll();
        
        expect(await mockStrategy.balanceOf()).to.eq(parseEther('0'));
        expect(await mockStrategyAave.balanceOf()).to.eq(parseEther('0'));

        expect(await ERC20.balanceOf(owner.address)).to.eq(parseEther('10000'));
        expect(await AAVE.balanceOf(owner.address)).to.eq(parseEther('10000'));

    })

    it('removes strategies', async () => {
        await mockStrategyAave.setWithdrawAllReturn(0);
        await strategyManager.removeStrategy(AAVE.address, 1);
        // AAVE balance has been removed from Strategy Manager
        expect(await strategyManager.balanceOf(AAVE.address)).to.eq(parseEther('0'));
        // AAVE balance remains in AAVE strategy
        expect(await mockStrategyAave.balanceOf()).to.eq(parseEther('0'));
        expect(await strategyManager.balanceOfNative()).to.be.equal(parseEther('0')) 
        // Remove ERC20 Strategy
        await mockStrategy.setWithdrawAllReturn(0);
        await strategyManager.removeStrategy(ERC20.address, 0);
        // ERC20 balance is removed, balanceOfNative also zero
        expect(await mockStrategy.balanceOf()).to.eq(parseEther('0'));
        expect(await strategyManager.balanceOf(ERC20.address)).to.eq(parseEther('0'));
        expect(await strategyManager.balanceOfNative()).to.be.equal(parseEther('0')) 
        // What is the POOl exacatly - doesn't actually contain any funds
    })

    // remove strategies causes tests to fail.
}) 
    

