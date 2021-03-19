// SPDX-License-Identifier: SPDX
pragma solidity ^0.7.3;

import './interfaces/IToken.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

contract Token is ERC20 ('ERC20', 'TOK'), IToken, Ownable {

  constructor(uint256 _totalSupply)  {
    _mint(msg.sender, _totalSupply);
  }
  
  function mint(address account, uint256 amount) external override {
    _mint(account, amount);
  }

 function burn(address account, uint256 amount) external override {
    _burn(account, amount);
  }
}