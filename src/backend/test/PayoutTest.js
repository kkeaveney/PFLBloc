const { expect, assert } = require('chai');
const { constants } = require('ethers');
const { block } = require("./utils.js");
const { parseEther } = require("ethers/lib/utils");

describe('Payout', function () {
    let token;
    let lpToken;
    let addrs;
    const PLACEHOLDER_PROTOCOL = 
    '0x561ca898cce9f021c15a441ef41899706e923541cee724530075d1a1144761c7'; 
    let pflBloc;
    let totalSupply = 1000000;
    let payout;
    const onePercent = ethers.BigNumber.from("10").pow(16);
    
    
        beforeEach(async () => {
            LPToken = await ethers.getContractFactory("lpToken");
            lpToken = await LPToken.deploy();
            ERC20Token = await ethers.getContractFactory("Token");
            token = await ERC20Token.deploy(totalSupply);
            PFLBloc = await ethers.getContractFactory("PFLBloc");
            pflBloc = await PFLBloc.deploy(lpToken.address, token.address);
            const Payout = await ethers.getContractFactory('PayOut');
            payout = await Payout.deploy();
            [owner, addr1, addr2, balanceReceiver, ...addrs] = await ethers.getSigners();
            stake = 250;
            await token.approve(pflBloc.address, constants.MaxUint256);
            await lpToken.approve(pflBloc.address, constants.MaxUint256);
            await pflBloc.stakeFunds(250);
            blocknumber = await block(pflBloc.updateProfiles(
                PLACEHOLDER_PROTOCOL,
                500,
                onePercent,
                constants.MaxUint256,
                
            ))
        })
        describe('success', () => {
            it('pays out', async () => {
                // before payou
                expect(await pflBloc.getTotalStakedFunds()).to.be.equal(stake)
                // payout
                await pflBloc.insurancePayout(PLACEHOLDER_PROTOCOL, stake, payout.address)
                expect(await pflBloc.getTotalStakedFunds()).to.be.equal(0)
                expect(await pflBloc.profileBalance(PLACEHOLDER_PROTOCOL)).to.be.equal(0);
            })
            it('pays out after debt accrual', async () => {
                expect(await pflBloc.getTotalStakedFunds()).to.be.equal(stake)
                // Move foreward 10 blocks
                for(var i = 1; i <= 10; i++) {
                    await ethers.provider.send("evm_mine", []);
                }
                await pflBloc.insurancePayout(PLACEHOLDER_PROTOCOL, stake, payout.address)
                expect(await pflBloc.getTotalStakedFunds()).to.be.equal(0)
                expect(await pflBloc.profileBalance(PLACEHOLDER_PROTOCOL)).to.be.equal(0);
            })
            it('pays out after funds have been claimed', async () => {
                await pflBloc.withdrawStake(250);
                await pflBloc.claimFunds(owner.address);
                expect(await pflBloc.getTotalStakedFunds()).to.be.equal(250)
                

            })


        })

        
        describe('failure', () => {
            it('insufficient funds to pay out', async () => {
                await expect (pflBloc.insurancePayout(PLACEHOLDER_PROTOCOL, 501, payout.address)).to.be.revertedWith('Insufficient_coverage');
            })
        })


}) 