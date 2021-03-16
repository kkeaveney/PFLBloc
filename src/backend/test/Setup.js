const { expect } = require("chai");


describe("Token contract", function () {
  
  let ERC20;
  let token;
  let owner;
  let addr1;
  let addrs;

  beforeEach(async function () {
    ERC20 = await ethers.getContractFactory("Token");
    [owner, addr1, ...addrs] = await ethers.getSigners();
    token = await ERC20.deploy('Token','ZRK');
  });

  
  describe("Deployment", function () {
    
    it('Should set the right owner', async function () {
     expect(await token.owner()).to.equal(owner.address);
    });

    it('Should set the contract name', async function () {
     expect(await token.name()).to.equal('Token');
    })

    it('Should set the contract symbol', async function () {
     expect(await token.symbol()).to.equal('ZRK');
    })

    it('Mints Tokens to the deployer', async function () {
     const balance = await token.balanceOf(owner.address)
     expect(balance).to.equal(1000000)
    })
  })

  describe("", function () {
    
   })
}) 