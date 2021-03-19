// SPDX-License-Identifier: SPDX
pragma solidity ^0.7.3;
import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import './interfaces/ILPToken.sol';
contract PFLBloc is Ownable {

    using SafeMath for uint256;
    ILPToken public lpToken;
    IERC20 public ERC20Token;

    uint256 public totalStaked;

    mapping (address => uint256) stakedFunds;
    mapping (address => uint256) lpRewards;
    

    constructor(ILPToken _lpToken, IERC20 _PFLToken) {
        lpToken = ILPToken(_lpToken);
        ERC20Token = IERC20(_PFLToken);
    }

    function stake(uint256 _amount) public {
        require(ERC20Token.balanceOf(msg.sender) >= _amount);
        totalStaked = totalStaked.add(_amount);
        lpRewards[msg.sender] = totalStaked.div(_amount);
        lpToken.mint(msg.sender, lpRewards[msg.sender]);
        
    }

    function isOwner() public view returns(address) {
        return owner();
    }

    function getLPRewards (address _account) public view returns (uint256) {
        return lpRewards[_account];
    }

}