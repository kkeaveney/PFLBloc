const { expect } = require("chai");


describe("Token contract", function () {
  
  let ERC20;
  let token;
  let owner;
  let addr1;
  let addrs;
  let totalSupply = 1000000;


  beforeEach(async function () {
    ERC20 = await ethers.getContractFactory("Token");
    [owner, addr1, ...addrs] = await ethers.getSigners();
    token = await ERC20.deploy(totalSupply);
  });

  
  describe("Deployment", function () {
    
    it('Should set the right owner', async function () {
        expect(await token.owner()).to.equal(owner.address);
    });

    it('Should set the contract name', async function () {
        expect(await token.name()).to.equal('ERC20');
    })

    it('Should set the contract symbol', async function () {
        expect(await token.symbol()).to.equal('TOK');
    })

    it('Returns token total supply', async function () {
        expect(await token.totalSupply()).to.equal(1000000);
    })

    it('Mints Tokens to the deployer', async function () {
        expect(await token.balanceOf(owner.address)).to.equal(1000000);
    })
  })

  describe("Transferring Tokens", function () {
    let amount = 1000000
    // Transfer all tokens from owner to addr1
    it('Transfers from contract owner', async function () {
        let balance = await token.balanceOf(owner.address);   
        await token.transfer(addr1.address, amount);
        expect(await token.balanceOf(owner.address)).to.equal(0);
        expect(await token.balanceOf(addr1.address)).to.equal(amount);
    })

    it('Transfers Tokens from owner', async function () {
        await token.transfer(owner.address, amount), { from: addr1 };
        expect(await token.balanceOf(owner.address)).to.equal(amount);
        expect(await token.balanceOf(addr1.address)).to.equal(0);
    })
    
  })
}) 