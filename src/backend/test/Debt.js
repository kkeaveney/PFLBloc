const { expect } = require('chai');
const { constants } = require('ethers');
const { block } = require("./utils.js");

describe('Debt', function () {
    let token;
    let lpToken;
    let owner;
    let addrs;
    const PLACEHOLDER_PROTOCOL = 
    '0x561ca898cce9f021c15a441ef41899706e923541cee724530075d1a1144761c7'; 
    let pflBloc;
    let totalSupply = 1000000;
    let initialStake = 250;
    let initialAccountBalance = 10000; // Not for deploying address
    const onePercent = ethers.BigNumber.from("10").pow(16);
    let debt;
    let premiun;
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
        
        blockNumber = await block(
            pflBloc.updateProfiles(
            PLACEHOLDER_PROTOCOL,
            500,
            onePercent,
            constants.MaxUint256
        ))

    })
   
        describe('verify debt', () => {
        
            it('reports zero debt when funds have not been staked', async () => {
                // No debt accrued
                expect( await pflBloc.accruedDebt(PLACEHOLDER_PROTOCOL)).to.equal(0);
                // Move foreward 10 blocks
                for(var i = 1; i <= 10; i++) {
                    await ethers.provider.send("evm_mine", []);
                }
                expect(await pflBloc.accruedDebt(PLACEHOLDER_PROTOCOL)).to.equal(0);
            })

            it('reports debt accrued after funds have been staked', async () => {
                pflBloc.stakeFunds(500);

                for(var i = 1; i <= 10; i++) {
                    await ethers.provider.send("evm_mine", []);
                }
                debt = await pflBloc.accruedDebt(PLACEHOLDER_PROTOCOL);
                premium = await pflBloc.premiumPerBlock(PLACEHOLDER_PROTOCOL);

                const currentBlock = ethers.BigNumber.from(
                    await ethers.provider.getBlockNumber()
                );

                // accrued Debt = (block number - profilePremiumLastPaid) * premiumPerBlock
                // premiumPerBlock = coveredFunds[protocol] * protocol.premiumPerBlock * 10*18

                // accrued Debt = blockToPay * 1%
                // premiumPerBlock = 1 * 1% * (10 * 18)

                const blocksToPay = currentBlock.sub(blockNumber); // 1 block
                expect(debt).to.equal(premium.mul(blocksToPay));    // .01 * 100
                console.log('debt', debt.toString());
                console.log('premium', premium.toString());
                console.log('blocksToPay', blocksToPay.toString());
                
           
            })
        })
})
       
  
