//SPDX-License-Identifier: MIT
pragma solidity ^0.7.3;

interface IStrategyManager {
    function amountOfStrategies() external view returns (uint256);

    function balanceOfNative() external view returns (uint256);

    function balanceOf(address _token) external view returns (uint256);

    function deposit(address _token) external;

    function withdraw(address _token, uint256 _amount) external;
}
