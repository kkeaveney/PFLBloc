// SPDX-License-Identifier: SPDX
pragma solidity ^0.7.3;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/** Token Contract inherits ERC20 */
interface IToken is IERC20 {
    
    function mint(address _account, uint256 _amount) external;

    function burn(address _account, uint256 _amount) external;
}