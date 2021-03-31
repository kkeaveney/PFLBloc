const { expect } = require('chai');
const { constants } = require('ethers');
const { block } = require("./utils.js");

describe('Debt', function () {
    let token;
    let lpToken;
    let addrs;
    const PLACEHOLDER_PROTOCOL = 
    '0x561ca898cce9f021c15a441ef41899706e923541cee724530075d1a1144761c7'; 
    let pflBloc;
    let totalSupply = 1000000;
    const onePercent = ethers.BigNumber.from("10").pow(16);
    let debt;
    let premium;
    let blockNumber;
    
    
    beforeEach(async () => {
        LPToken = await ethers.getContractFactory("lpToken");
        lpToken = await LPToken.deploy();
        ERC20Token = await ethers.getContractFactory("Token");
        token = await ERC20Token.deploy(totalSupply);
        PFLBloc = await ethers.getContractFactory("PFLBloc");
        pflBloc = await PFLBloc.deploy(lpToken.address, token.address);
        [owner, addr1, addr2, balanceReceiver, ...addrs] = await ethers.getSigners();
        await token.approve(pflBloc.address, constants.MaxUint256); 
    })
   
        describe('verify debt', () => {
            beforeEach(async () => {
                blockNumber = await block(
                pflBloc.updateProfiles(
                PLACEHOLDER_PROTOCOL,
                500,
                onePercent,
                constants.MaxUint256
            ))
        })  
            it('funds have not been staked', async () => {
                // No debt accrued
                expect( await pflBloc.accruedDebt(PLACEHOLDER_PROTOCOL)).to.equal(0);
                // Move foreward 10 blocks
                for(var i = 1; i <= 10; i++) {
                    await ethers.provider.send("evm_mine", []);
                }
                expect(await pflBloc.accruedDebt(PLACEHOLDER_PROTOCOL)).to.equal(0);
            })

            it('maxFundsCovered has paritally been covered', async () => {
                pflBloc.stakeFunds(100);
                debt = await pflBloc.accruedDebt(PLACEHOLDER_PROTOCOL);
                premium = await pflBloc.premiumPerBlock(PLACEHOLDER_PROTOCOL);

                const currentBlock = ethers.BigNumber.from(
                    await ethers.provider.getBlockNumber()
                );
                let blocksToPay = currentBlock.sub(blockNumber);
                expect(debt).to.equal(premium.mul(blocksToPay));
                expect(debt).to.equal(premium.mul(1));
            })

            it('staking funds cover protocol maxFundsCovered', async () => {
                // Stake funds
                pflBloc.stakeFunds(400);
                debt = await pflBloc.accruedDebt(PLACEHOLDER_PROTOCOL);
                premium = await pflBloc.premiumPerBlock(PLACEHOLDER_PROTOCOL);

                let currentBlock = ethers.BigNumber.from(
                    await ethers.provider.getBlockNumber()
                );
                
                let blocksToPay = currentBlock.sub(blockNumber); 
                expect(debt).to.equal(premium.mul(blocksToPay));
                expect(debt).to.equal(4);   // we've advanced 1 block
                // advance 10 blocks
                for(var i = 1; i <= 10; i++) {
                    await ethers.provider.send("evm_mine", []);
                }

                debt = await pflBloc.accruedDebt(PLACEHOLDER_PROTOCOL);
                premium = await pflBloc.premiumPerBlock(PLACEHOLDER_PROTOCOL);
                currentBlock = ethers.BigNumber.from(
                    await ethers.provider.getBlockNumber()
                );
                blocksToPay = currentBlock.sub(blockNumber);
                expect(debt).to.equal(premium.mul(blocksToPay));  
                expect(debt).to.equal(44);
            })

            it('staking funds exceed protocol maxFundsCovered', async () => {
                // Stake more funds
                pflBloc.stakeFunds(1000);
                debt = await pflBloc.accruedDebt(PLACEHOLDER_PROTOCOL);
                premium = await pflBloc.premiumPerBlock(PLACEHOLDER_PROTOCOL);

                const currentBlock = ethers.BigNumber.from(
                    await ethers.provider.getBlockNumber()
                );
                let blocksToPay = currentBlock.sub(blockNumber);
                expect(debt).to.equal(premium.mul(blocksToPay));
                expect(debt).to.equal(5);
            })
        })

        describe('verify debt with gradual staking', () => {
            it('stakes', async () => {
                blockNumber = await block(
                    pflBloc.updateProfiles(
                    PLACEHOLDER_PROTOCOL,
                    500,
                    onePercent,
                    constants.MaxUint256
                ))
                pflBloc.stakeFunds(100);
                debt = await pflBloc.accruedDebt(PLACEHOLDER_PROTOCOL);
                premium = await pflBloc.premiumPerBlock(PLACEHOLDER_PROTOCOL);

                let currentBlock = ethers.BigNumber.from(
                    await ethers.provider.getBlockNumber()
                );
               
                let blocksToPay = currentBlock.sub(blockNumber);
                expect(debt).to.equal(premium.mul(blocksToPay));
                expect(debt).to.equal(1);

                pflBloc.stakeFunds(400);
                debt = await pflBloc.accruedDebt(PLACEHOLDER_PROTOCOL);
                premium = await pflBloc.premiumPerBlock(PLACEHOLDER_PROTOCOL);

                currentBlock = ethers.BigNumber.from(
                    await ethers.provider.getBlockNumber()
                );
                blocksToPay = currentBlock.sub(blockNumber);
                expect(debt).to.equal(premium.mul(blocksToPay));
                // advanced 1 block, staked funds are now 500
                expect(debt).to.equal(10);
            })
        })
})
       
  
