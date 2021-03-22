// SPDX-License-Identifier: SPDX
pragma solidity ^0.7.3;
import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import './interfaces/ILPToken.sol';
import './interfaces/IToken.sol';

contract PFLBloc is Ownable {

    using SafeMath for uint256;
    ILPToken public lpToken;
    IToken public ERC20Token;

    uint256 public totalStaked;
    uint256 public totalLPTokens;

    uint256 timelock;

    mapping (address => uint256) stakedFunds;
    mapping (address => uint256) lpRewards;

    
    constructor(ILPToken _lpToken, IToken _PFLToken) {
        lpToken = ILPToken(_lpToken);
        ERC20Token = IToken(_PFLToken);
    }

    function stake(uint256 _amount) external {
        require(
            ERC20Token.transferFrom(msg.sender, address(this), _amount), 
            'Insufficient funds'
        );
        totalStaked = totalStaked.add(_amount); // total staked
        stakedFunds[msg.sender] = stakedFunds[msg.sender].add(_amount);
        lpRewards[msg.sender] = lpRewards[msg.sender].add(_amount);
        lpToken.mint(msg.sender, _amount);
    }

    function _withdrawStake(uint256 _amount) internal {
        require(block.number > timelock, 'Timelock is still active');
        stakedFunds[msg.sender] = stakedFunds[msg.sender].sub(_amount) ;
        ERC20Token.transferFrom(address(this), msg.sender, stakedFunds[msg.sender]);
        
    }

    function withdrawStake(uint256 _amount) external {
        require(stakedFunds[msg.sender] >= _amount, 'Insufficient funds to withdraw');
        _withdrawStake(_amount);
    }

    function _claimRewards() internal {
        
    }

    function claimRewards() external {
        
    }

    function isOwner() public view returns(address) {
        return owner();
    }

    function setTimelock(uint256 _timelock) onlyOwner external {
        timelock = _timelock;
    }

    function getLPRewards (address _account) public view returns (uint256) {
        return lpRewards[_account];
    }

    function getStakedFunds(address _account) public view returns (uint256) {
        return stakedFunds[_account];
    }

    

}