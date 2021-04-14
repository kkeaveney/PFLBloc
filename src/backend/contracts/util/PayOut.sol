// SPDX-License-Identifier: SPDX
pragma solidity ^0.7.3;

import "../interfaces/IPayout.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


contract PayOut is IPayout {
    function deposit(address _token) external view override {
        IERC20 token = IERC20(_token);
        uint256 got = token.balanceOf(address(this));
    }
}


