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

        await token.approve(pflBloc.address, constants.MaxUint256);
        await token.connect(addr1).approve(pflBloc.address, constants.MaxUint256);
        await token.connect(addr2).approve(pflBloc.address, constants.MaxUint256);
        
        await token.transfer(addr1.address, initialAccountBalance);
        await token.transfer(addr2.address, initialAccountBalance);
    })

    describe('deployment', function () {
        it('confirms contract owner', async function () {
            expect(await pflBloc.isOwner()).to.equal(owner.address);
        })
    })

    describe('staking', function () {
        describe('success', function () {
            let stakedAmount = 100;
            it('stakes token and allocates LP tokens', async function () {
                // Token totalSupply is sent to contract owner
                expect(await token.balanceOf(owner.address)).to.eq(totalSupply - (initialAccountBalance * 2));
                await pflBloc.stake(stakedAmount);
                // Confirm staked rewards for address
                expect(await pflBloc.getLPRewards(owner.address)).to.equal(stakedAmount);
                let lpRewards = await pflBloc.getLPRewards(owner.address);
                // Confirm LP Token amount for address
                expect(await lpToken.balanceOf(owner.address)).to.equal(lpRewards);
            })
        })
        describe('failure', function () {
            it('fails for insufficient balances', async function () {
                await expect(pflBloc.stake(totalSupply)).to.be.revertedWith("transfer amount exceeds balance");
            })
            
        })
    })
    describe('multiple stakers', function () {
        let stakedAmount = 100;
        describe('success', function () {
            it('stakes from a second account', async function () {
                await pflBloc.stake(100); 
                expect(await lpToken.totalSupply()).to.equal(100);
                expect(await pflBloc.getLPRewards(owner.address)).to.equal(100);
                await pflBloc.stake(1000);
                expect(await lpToken.totalSupply()).to.equal(1100);
                expect(await pflBloc.getLPRewards(owner.address)).to.equal(1100);
                await pflBloc.connect(addr1).stake(100);
                expect(await lpToken.totalSupply()).to.equal(1200);
                expect(await pflBloc.getLPRewards(addr1.address)).to.equal(100);
                await pflBloc.stake(1200);
                await pflBloc.connect(addr2).stake(200);
                expect(await lpToken.totalSupply()).to.equal(2600);
                expect(await pflBloc.getLPRewards(addr2.address)).to.equal(200);
                
           })
        })
    })

    describe('withdrawal', function () {
        describe('success', function () {
            let stakeAmount = 100;
            it('stakes and withdraws with timelock active', async function () {
                await pflBloc.setTimelock(10);
                for (var i = 1; i <= 10; i++) {                                               // owner Staking Token amount remains the same.
                    await ethers.provider.send("evm_mine", []);                                 // move forward 10 blocks
                }
                

                await pflBloc.stake(stakeAmount);
                expect(await pflBloc.totalStaked()).to.equal(stakeAmount);
                expect(await pflBloc.getStakedFunds(owner.address)).to.equal(stakeAmount);
                expect(await token.balanceOf(owner.address)).to.eq(totalSupply - (initialAccountBalance * 2) - stakeAmount);
                // Withdraw
                await pflBloc.withdrawStake(stakeAmount);
                expect(await pflBloc.getStakedFunds(owner.address)).to.equal(0);
                
            })
            
        })
        describe('failure', function (){
            it('timelock is still active', async function () {
                await pflBloc.setTimelock(100);
                await pflBloc.stake(100);
                await expect(pflBloc.withdrawStake(99)).to.be.revertedWith('Timelock is still active');
                
            })
            it('account does not have required funds', async function () {
                await pflBloc.setTimelock(10);
                await expect(pflBloc.withdrawStake(10000)).to.be.revertedWith('Insufficient funds to withdraw');
            })
        })
    })

    
})

   