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

    uint256 internal totalStakedFunds;
    uint256 timelock;

    struct StakeWithdraw {
        uint256 blockInitiated;
        uint256 stake;
    }

    struct ProtocolProfile {
        // translated to the value of the native erc20 of the pool
        uint256 maxFundsCovered;
        // percentage of the funds covered
        uint256 premiumPerBlock;
    }

    bytes32[] public protocols;

    mapping(bytes32 => uint256) public profileBalances;
    mapping(bytes32 => ProtocolProfile) public profiles;
    mapping(address => StakeWithdraw) public stakesWithdraw;
   
    
    constructor(ILPToken _lpToken, IToken _PFLToken) {
        lpToken = ILPToken(_lpToken);
        ERC20Token = IToken(_PFLToken);
    }

    function isOwner() public view returns(address) {
        return owner();
    }

    function setTimelock(uint256 _timelock) onlyOwner external {
        timelock = _timelock;
    }

    function stakeFunds(uint256 _amount) external {
        require(

            ERC20Token.transferFrom(msg.sender, address(this), _amount), 
            'Insufficient funds'
        );
        totalStaked = totalStaked.add(_amount); // total staked

        uint256 totalStake = lpToken.totalSupply();

        uint256 stake;
        if(totalStake == 0) {
            // mint initial stake
            stake = _amount;
        } else {
            stake = _amount.mul(totalStake).div(getTotalStakedFunds());
        }

        totalStakedFunds = totalStakedFunds.add(_amount);
        lpToken.mint(msg.sender, stake);
        
    }

   
    // To withdraw funds, add them to a vesting schedule
    function withdrawStake(uint256 _amount) external {
        require(stakesWithdraw[msg.sender].blockInitiated == 0, 'Withdraw active');
        require(lpToken.transferFrom(msg.sender, address(this), _amount),'Transfer failed');
        stakesWithdraw[msg.sender] = StakeWithdraw(block.number, _amount);
    }

    function cancelWithdraw() external {
        StakeWithdraw memory withdraw = stakesWithdraw[msg.sender];

        require(withdraw.blockInitiated != 0, 
        'Withdraw inactive');
        require(
            withdraw.blockInitiated.add(timelock) > block.number,
            "Timelock Expired"
        );

        require(lpToken.transfer(msg.sender, withdraw.stake));
        delete stakesWithdraw[msg.sender];
    }

    function claimFunds(address _staker) external {
        StakeWithdraw memory withdraw = stakesWithdraw[_staker];
        require(withdraw.blockInitiated != 0, 'Withdraw inactive');

        require(withdraw.blockInitiated.add(timelock) <= block.number, 
        'timelock active');

        uint256 funds = withdraw.stake.mul(getTotalStakedFunds()).div(
            lpToken.totalSupply()
        );
        ERC20Token.transfer(_staker, funds);
        lpToken.burn(address(this), withdraw.stake);
    }

    function addProfileBalance(bytes32 _protocol, uint256 _amount) external {
        require(
            ERC20Token.transferFrom(msg.sender, address(this), _amount), 
            'Insufficient funds'
        );
        profileBalances[_protocol] = profileBalances[_protocol].add(_amount);

    }

    function getFunds(address _staker) external view returns (uint256) {
        return lpToken.balanceOf(_staker).mul(getTotalStakedFunds()).div(
            lpToken.totalSupply()
        );
    }

    function getTotalStakedFunds() public view returns (uint256) {
        return totalStakedFunds;
    }

    

}