const { expect, reverted } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");
const { constants } = require("ethers");

describe('PFL Contract', function () {
    let token;
    let lpToken;
    let owner;
    let addr1;
    let addr2;
    let addrs;
    let pflBloc;
    let totalSupply = 1000000;
    let initialAccountBalance = 10000; // Not for deploying address
    

    beforeEach(async function () {
        LPToken = await ethers.getContractFactory("lpToken");
        lpToken = await LPToken.deploy();
        
        ERC20Token = await ethers.getContractFactory("Token");
        token = await ERC20Token.deploy(totalSupply);
        
        PFLBloc = await ethers.getContractFactory("PFLBloc");
        pflBloc = await PFLBloc.deploy(lpToken.address, token.address);

        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

        // Approve Token allowance to be transferred by pflBloc
        await token.approve(pflBloc.address, constants.MaxUint256);
        await lpToken.approve(pflBloc.address, constants.MaxUint256);
        await token.connect(addr1).approve(pflBloc.address, constants.MaxUint256);
        await token.connect(addr2).approve(pflBloc.address, constants.MaxUint256);
        // Transfer tokens for other address useage
        await token.transfer(addr1.address, initialAccountBalance);
        await token.transfer(addr2.address, initialAccountBalance);
        // Transfer ownership to pflBloc contract
        await token.transferOwnership(pflBloc.address);
    })

    describe('deployment', function () {
        it('confirms contract owner', async function () {
            expect(await pflBloc.isOwner()).to.equal(owner.address);
         })
         it('confirms Stake Token initial balance', async function () {
            expect(await lpToken.totalSupply()).to.equal(0);
         })
         it('confirms ERC20 Token initial balance', async function () {
             expect(await token.totalSupply()).to.equal(1000000)
         })
    })

    describe('staking', function () {
        describe('success', function () {
            let stakedAmount = 100;
            it('stakes token and allocates LP tokens', async function () {
                // Token totalSupply is sent to contract owner
                expect(await token.balanceOf(owner.address)).to.eq(totalSupply - (initialAccountBalance * 2));
                await pflBloc.stakeFunds(stakedAmount);
                // Confirm total stake amount
                expect(await pflBloc.getTotalStakedFunds()).to.equal(stakedAmount);
                // Confirm LP Token amount for address
                expect(await lpToken.balanceOf(owner.address)).to.equal(stakedAmount);
                expect(await pflBloc.getFunds(owner.address)).to.equal(100);
            })
        })
        describe('failure', function () {
            it('fails for insufficient balances', async function () {
                await expect(pflBloc.stakeFunds(totalSupply)).to.be.revertedWith("transfer amount exceeds balance");
            })
            
        })
    })
    describe('multiple stakers', function () {
        let stakedAmount = 100;
        describe('success', function () {
            it('stakes from a second account', async function () {
                await pflBloc.stakeFunds(100); 
                expect(await lpToken.totalSupply()).to.equal(100);
                expect(await pflBloc.getFunds(owner.address)).to.equal(100);
                // Stake more
                await pflBloc.stakeFunds(1000);
                expect(await lpToken.totalSupply()).to.equal(1100);
                expect(await pflBloc.getFunds(owner.address)).to.equal(1100);
                // Another staker joins
                await pflBloc.connect(addr1).stakeFunds(100);
                expect(await lpToken.totalSupply()).to.equal(1200);
                expect(await pflBloc.getFunds(addr1.address)).to.equal(100);
                // Stake more
                await pflBloc.stakeFunds(1200);
                // Another staker joins
                await pflBloc.connect(addr2).stakeFunds(200);
                expect(await lpToken.totalSupply()).to.equal(2600);
                expect(await pflBloc.getFunds(addr2.address)).to.equal(200);
                
           })
        })
    })

    describe('withdrawal', function () {
        let stakeAmount = 100;
        describe('success', function () {
            it('adds withdraw request to the vesting schedule', async function () {
                //await pflBloc.setTimelock(100);
                for (var i = 1; i <= 10; i++) {                                               // owner Staking Token amount remains the same.
                    await ethers.provider.send("evm_mine", []);                                 // move forward 10 blocks
                }
                await pflBloc.stakeFunds(stakeAmount);
                expect(await pflBloc.totalStaked()).to.equal(stakeAmount);
                expect(await pflBloc.getFunds(owner.address)).to.equal(stakeAmount);
                expect(await token.balanceOf(owner.address)).to.eq(totalSupply - (initialAccountBalance * 2) - stakeAmount);
                expect(await lpToken.balanceOf(owner.address)).to.eq(stakeAmount);
                // Withdraw, (vested) tokens transferred to pfl contract
                await pflBloc.withdrawStake(stakeAmount);
                expect(await lpToken.balanceOf(owner.address)).to.eq(0);
                expect(await lpToken.balanceOf(pflBloc.address)).to.eq(100);
             })
            
        })
        describe('failure', async function () {
            it('withdrawal is already active', async () => {
                await pflBloc.stakeFunds(stakeAmount);
                await pflBloc.withdrawStake(stakeAmount / 20 );
                await expect (pflBloc.withdrawStake(stakeAmount / 10 )).to.be.revertedWith('Withdraw active')
             })
             it('doesnt have enough funds to withdraw', async () => {
                await pflBloc.stakeFunds(stakeAmount);
                await expect (pflBloc.withdrawStake(stakeAmount + 1 )).to.be.revertedWith('transfer amount exceeds balance')
             })
        })

    })

    describe('cancelling withdraw request', () => {
        let stakeAmount = 100;
        describe('success', () => {
            it('cancels withdraw before timelock expiration', async () => {
                await pflBloc.setTimelock(100);
                await pflBloc.stakeFunds(stakeAmount);
                // Check owner LP Balance
                expect(await lpToken.balanceOf(owner.address)).to.equal(100)
                await pflBloc.withdrawStake(stakeAmount);
                /// check LP balances
                expect(await lpToken.balanceOf(owner.address)).to.equal(0)
                expect(await lpToken.balanceOf(pflBloc.address)).to.equal(100)
                await pflBloc.cancelWithdraw();
                /// check LP balances
                expect(await lpToken.balanceOf(owner.address)).to.equal(100)
                expect(await lpToken.balanceOf(pflBloc.address)).to.equal(0)
            })
        })
        describe('failure', () => {
            it('cancels withdraw after timelock expiration', async () => {
                await pflBloc.setTimelock(1);
                await pflBloc.stakeFunds(stakeAmount);
                // Check owner LP Balance
                expect(await lpToken.balanceOf(owner.address)).to.equal(100)
                await pflBloc.withdrawStake(stakeAmount);
                // Will revert due to timelock constraints
                await expect(pflBloc.stakeFunds(totalSupply)).to.be.revertedWith("transfer amount exceeds balance");
                await expect(pflBloc.cancelWithdraw()).to.be.revertedWith("Timelock Expired")
            })
        })
    })

    describe('claiming funds', () => {
        let stakeAmount = 100;
        describe('success', () => {
            it('claims', async () => {
                await pflBloc.stakeFunds(stakeAmount);
                // Confirm balances
                expect(await lpToken.totalSupply()).to.be.equal(100);
                expect(await lpToken.balanceOf(owner.address)).to.be.equal(100);
                expect(await token.balanceOf(owner.address)).to.eq(totalSupply - (initialAccountBalance * 2) - stakeAmount);
                expect(await lpToken.balanceOf(pflBloc.address)).to.be.equal(0);
                
                await pflBloc.withdrawStake(stakeAmount);
                // Confirm balances
                expect(await lpToken.totalSupply()).to.be.equal(100);
                expect(await token.balanceOf(owner.address)).to.eq(totalSupply - (initialAccountBalance * 2) - stakeAmount);
                expect(await lpToken.balanceOf(owner.address)).to.be.equal(0);
                expect(await lpToken.balanceOf(pflBloc.address)).to.be.equal(100);
                
                await pflBloc.claimFunds(owner.address);
                // Confirm balances
                expect(await token.balanceOf(owner.address)).to.eq(totalSupply - (initialAccountBalance * 2));
                expect(await lpToken.totalSupply()).to.be.equal(0);
                expect(await lpToken.balanceOf(owner.address)).to.be.equal(0);
                expect(await lpToken.balanceOf(pflBloc.address)).to.be.equal(0);

            })
        })
    })

    
})

   