const { expect, reverted } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");

describe('PFL Contract', function () {
    let token;
    let lpToken;
    let owner;
    let addr1;
    let addrs;
    let pflBloc;
    let totalSupply = 1000000;

    beforeEach(async function () {
        LPToken = await ethers.getContractFactory("lpToken");
        lpToken = await LPToken.deploy();
        
        ERC20Token = await ethers.getContractFactory("Token");
        token = await ERC20Token.deploy(totalSupply);
        
        PFLBloc = await ethers.getContractFactory("PFLBloc");
        pflBloc = await PFLBloc.deploy(lpToken.address, token.address);

        [owner, addr1, ...addrs] = await ethers.getSigners();
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
                expect(await token.balanceOf(owner.address)).to.eq(totalSupply);
                await pflBloc.stake(100);
                // Confirm staked rewards for address
                expect(await pflBloc.getLPRewards(owner.address)).to.equal(1);
                let lpRewards = await pflBloc.getLPRewards(owner.address);
                // Confirm LP Token amount for address
                expect(await lpToken.balanceOf(owner.address)).to.equal(lpRewards);
            })
        })
        describe('failure', function () {
            it('fails for insufficient balances', async function () {
                await expect(pflBloc.stake(totalSupply + 1)).to.be.revertedWith("Transaction reverted without a reason");
            })
            
        })
    })

    
})

   