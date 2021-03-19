pragma solidity ^0.7.3;
import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// SPDX-License-Identifier: SPDX


contract Exchange {

    IERC20 private _token;

    constructor(address token){
        _token = IERC20(token);
    }

    function transfer(address _to, uint256 _amount) public {
        _token.transferFrom(msg.sender, _to, _amount);
    }

    function deposit() public view{
        
    }

    
}
