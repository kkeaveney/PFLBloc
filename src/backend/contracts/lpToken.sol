// SPDX-License-Identifier: SPDX
pragma solidity ^0.7.3;

import './interfaces/ILPToken.sol';
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/** Token Contract inherits ERC20 */
contract lpToken is ERC20('LPToken','LP'), ILPToken, Ownable {
  

 function mint(address account, uint256 amount) external override {
    _mint(account, amount);
  }

 function burn(address account, uint256 amount) external override {
    _burn(account, amount);
  }

}