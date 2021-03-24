const { expect, reverted } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");
const { constants } = require("ethers");
const { isCallTrace } = require("hardhat/internal/hardhat-network/stack-traces/message-trace");

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
    

    beforeEach(async () => {
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

    describe('Protocols', () => {
        describe('success', () => {
            it('', async () => {

            })
        })
        describe('failure', () => {
            it('adds balance to non-exsisting balance', () => {
                
            })
        })
    })

})