// SPDX-License-Identifier: SPDX
pragma solidity ^0.7.3;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IPool.sol";
import "../interfaces/IStrategyManager.sol";

contract MockPool is IPool {
    IERC20 public t;
    IStrategyManager public sm;

    function setToken(IERC20 _token) external {
        t = _token;
    }

    function setSm(IStrategyManager _sm) external {
        sm = _sm;
    }

    function token() external override view returns (IERC20) {
        return t;
    }

    function withdraw(address _token, uint _amount) external {
        sm.withdraw(_token, _amount);
    }
}