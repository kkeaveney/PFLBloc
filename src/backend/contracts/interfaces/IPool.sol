// SPDX-License-Identifier: SPDX
pragma solidity ^0.7.3;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IPool {
    function token() external view returns (IERC20);
}