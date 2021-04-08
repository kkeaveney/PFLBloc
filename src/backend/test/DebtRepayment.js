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
    let blocksToPay;
    let currentBlock ;
    
    
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

        describe('repayment', () => {
            let stake = 500;
            beforeEach(async () => {
                blockNumber = await block(pflBloc.updateProfiles(
                    PLACEHOLDER_PROTOCOL,
                    500,
                    onePercent,
                    constants.MaxUint256
                ))
                    pflBloc.stakeFunds(stake);
                    debt = await pflBloc.accruedDebt(PLACEHOLDER_PROTOCOL);
                    premium = await pflBloc.premiumPerBlock(PLACEHOLDER_PROTOCOL);
                    currentBlock = await ethers.BigNumber.from(
                        await ethers.provider.getBlockNumber()
                    );
                    blocksToPay = currentBlock.sub(blockNumber);
            })
            describe('success', () => {
                it('protocol successfully pays debt', async () => {
                    expect(debt).to.equal(premium.mul(blocksToPay)); 
                    expect(debt).to.equal(5) //1 block, premium = 5 
                    expect(await pflBloc.getTotalStakedFunds()).to.be.equal(stake);
                    // Pay Off protocol debt
                    pflBloc.addProfileBalance(PLACEHOLDER_PROTOCOL, 500);

                    currentBlock = await ethers.BigNumber.from(
                        await ethers.provider.getBlockNumber()
                    );
                    blocksToPay = currentBlock.sub(blockNumber);
                    console.log(blocksToPay.toString());
                    //let accruedDebt = await pflBloc.accruedDebt(PLACEHOLDER_PROTOCOL)
                    expect(debt).to.equal(premium.mul(blocksToPay)); 
                    expect(await pflBloc.accruedDebt(PLACEHOLDER_PROTOCOL)).to.be.equal(10);
                    blocksToPay = currentBlock.sub(blockNumber);
                    console.log(blocksToPay.toString());
                    
                    pflBloc.payOffDebt(PLACEHOLDER_PROTOCOL);
                    expect(await pflBloc.accruedDebt(PLACEHOLDER_PROTOCOL)).to.be.equal(0);

                    currentBlock = await ethers.BigNumber.from(
                        await ethers.provider.getBlockNumber()
                    );
                    blocksToPay = currentBlock.sub(blockNumber);
                    expect(await pflBloc.getTotalStakedFunds()).to.be.equal(stake + (premium * blocksToPay));
                     
            })
        })
            describe('failure', () => {
                    it('fails to pay protocol balance', async () => {
                    pflBloc.stakeFunds(100);
                    await expect(pflBloc.payOffDebt(PLACEHOLDER_PROTOCOL)).to.be.revertedWith('Insufficient funds');
            })
        })          
    })
})
