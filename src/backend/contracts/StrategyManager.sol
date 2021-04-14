//SPDX-License-Identifier: MIT
pragma solidity ^0.7.3;

import "./interfaces/IStrategyManager.sol";
import "./interfaces/chainlink/AggregatorV3Interface.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


contract StrategyManager is IStrategyManager, Ownable {
    // This contract does not hold any funds
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    address public pool;
    address[] public tokens;
    mapping(address => address) public strategies;
    // todo, use ENS
    mapping(address => AggregatorV3Interface) public priceOracle;
}