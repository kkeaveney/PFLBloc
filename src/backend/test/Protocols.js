const { expect, reverted } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");
const { parseEther } = require("ethers/lib/utils");
const { constants, utils } = require("ethers");

describe('PFL Contract', function () {
    let token;
    let lpToken;
    let owner;
    let addr1;
    let addr2;
    let addrs;
    let balanceReceiver;
    const PLACEHOLDER_PROTOCOL = 
    '0x561ca898cce9f021c15a441ef41899706e923541cee724530075d1a1144761c7'; 
    let pflBloc;
    let totalSupply = 1000000;
    let initialStake = 250;
    let initialAccountBalance = 10000; // Not for deploying address
    const onePercent = ethers.BigNumber.from("10").pow(16);
    
    
    beforeEach(async () => {
        LPToken = await ethers.getContractFactory("lpToken");
        lpToken = await LPToken.deploy();
        
        ERC20Token = await ethers.getContractFactory("Token");
        token = await ERC20Token.deploy(totalSupply);
        
        PFLBloc = await ethers.getContractFactory("PFLBloc");
        pflBloc = await PFLBloc.deploy(lpToken.address, token.address);

        [owner, addr1, addr2, balanceReceiver, ...addrs] = await ethers.getSigners();
        
        

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

        await pflBloc.stakeFunds(initialStake);
    })

    describe('Updating Protocols', () => {
        describe('success', () => {
            it('adds a protocol', async () => {
                
                expect(await pflBloc.protocolCovered(PLACEHOLDER_PROTOCOL)).to.equal(false); 
                expect(await pflBloc.premiumLastPaid(PLACEHOLDER_PROTOCOL)).to.equal(0);
                
                await pflBloc.updateProfiles(
                    PLACEHOLDER_PROTOCOL,
                    500,
                    onePercent,
                    constants.MaxUint256
                )   
                    // Get current block
                    let blockNumber = await ethers.provider.getBlockNumber();
                    expect(await pflBloc.coveredFunds(PLACEHOLDER_PROTOCOL)).to.equal(250); 
                    await pflBloc.stakeFunds(250);
                    expect(await pflBloc.coveredFunds(PLACEHOLDER_PROTOCOL)).to.equal(500); 
                    await pflBloc.stakeFunds(500);
                    expect(await pflBloc.coveredFunds(PLACEHOLDER_PROTOCOL)).to.equal(500); 
                    expect(await pflBloc.protocolCovered(PLACEHOLDER_PROTOCOL)).to.equal(true);
                    // Premium last paid is current block
                    expect(await pflBloc.premiumLastPaid(PLACEHOLDER_PROTOCOL)).to.equal(blockNumber);  
            })                                                                              
        })
        describe('failure', () => {
            it('is not a covered protocol', async () => {
                expect(await pflBloc.protocolCovered(PLACEHOLDER_PROTOCOL)).to.equal(false); 
            })
            it('provides an invalid protocol', async () => {
                await expect(pflBloc.updateProfiles(
                    '0x',
                    500,
                    onePercent,
                    constants.MaxUint256
                )).to.be.reverted
            })
            it('provides zero funds', async () => {
                await expect(pflBloc.updateProfiles(
                    PLACEHOLDER_PROTOCOL,
                    0,
                    onePercent,
                    constants.MaxUint256
                )).to.be.revertedWith('Invalid Funds')
            })
            it('provides invalid risk', async () => {
                await expect(pflBloc.updateProfiles(
                    PLACEHOLDER_PROTOCOL,
                    500,
                    0,
                    constants.MaxUint256
                )).to.be.revertedWith('Invalid Risk')
            })
            it('profile premium last paid it too high', async () => {
                await expect(pflBloc.updateProfiles(
                    PLACEHOLDER_PROTOCOL,
                    500,
                    onePercent,
                    150
                    )).to.be.revertedWith('Too high')
            })
            it('profile premium last paid is invalid', async () => {
                await expect(pflBloc.updateProfiles(
                    PLACEHOLDER_PROTOCOL,
                    500,
                    onePercent,
                    0
                )).to.be.revertedWith('Invalid last paid')
            })
        })
    })
    describe('Removing Protocols', () => {
        it('deletes first protocol', async () => {
            await pflBloc.updateProfiles(
                PLACEHOLDER_PROTOCOL,
                500,
                onePercent,
                constants.MaxUint256
            )
            // No funds paid into protocol
            let blockNumber = await ethers.provider.getBlockNumber();
            expect(await token.balanceOf(balanceReceiver.address)).to.be.equal(0); 
            // Protocol is covered
            expect(await pflBloc.protocolCovered(PLACEHOLDER_PROTOCOL)).to.equal(true);
            // Premium last paid is current block
            expect(await pflBloc.premiumLastPaid(PLACEHOLDER_PROTOCOL)).to.be.equal(blockNumber);

            
            await pflBloc.removeProtocol(
                PLACEHOLDER_PROTOCOL,
                0,
                balanceReceiver.address
            )
            // Still no funds paid into protocol
            expect(await token.balanceOf(balanceReceiver.address)).to.equal(0);
            // Protocol is no longer covered
            expect(await pflBloc.protocolCovered(PLACEHOLDER_PROTOCOL)).to.equal(false);
            // Premium last paid is reset
            expect(await pflBloc.premiumLastPaid(PLACEHOLDER_PROTOCOL)).to.be.equal(0);
        })
        it('deletes protocol with funds added to profile balance', async () => {
            let profileFunds = 10;

            await pflBloc.updateProfiles(
                PLACEHOLDER_PROTOCOL,
                500,
                onePercent,
                constants.MaxUint256
            )
            await pflBloc.addProfileBalance(PLACEHOLDER_PROTOCOL, profileFunds);
            // 250 staked on init
            expect(await pflBloc.getFunds(owner.address)).to.be.equal(250);
            expect(await pflBloc.getTotalStakedFunds()).to.be.equal(250);
            expect(await pflBloc.coveredFunds(PLACEHOLDER_PROTOCOL)).to.be.equal(250);
            expect(await pflBloc.withdrawStake(250));
            expect(await token.balanceOf(owner.address)).to.be.equal(totalSupply - (initialAccountBalance * 2) - initialStake - profileFunds);
            expect(await pflBloc.claimFunds(owner.address));
            expect(await token.balanceOf(owner.address)).to.be.equal(totalSupply - (initialAccountBalance * 2) - profileFunds);
        })
    })

})