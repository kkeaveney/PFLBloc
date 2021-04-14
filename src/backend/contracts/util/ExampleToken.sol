// SPDX-License-Identifier: SPDX
pragma solidity ^0.7.3;


import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ExampleToken is ERC20 {
    constructor(address to, uint256 amount) ERC20("Wrapped ETH", "ETH") {
        _mint(to, amount);
    }
}