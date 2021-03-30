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
        uint256 percentagePremiumPerBlock;
    }

    bytes32[] public protocols;
    mapping(bytes32 => ProtocolProfile) public profiles;

    mapping(bytes32 => bool) public protocolsCovered;
    mapping(bytes32 => uint256) public profilePremiumLastPaid;
    mapping(bytes32 => uint256) public profileBalances;
    
    mapping(address => StakeWithdraw) public stakesWithdraw;
   
    
    constructor(ILPToken _lpToken, IToken _PFLToken) {
        lpToken = ILPToken(_lpToken);
        ERC20Token = IToken(_PFLToken);
    }

    function setTimelock(uint256 _timelock) onlyOwner external {
        timelock = _timelock;
    }

    // a governing contract will call update profiles
    // protocols can do an insurance request against this contract
    function updateProfiles(
        bytes32 _protocol,
        uint256 _maxFundsCovered,
        uint256 _percentagePremiumPerBlock,
        uint256 _premiumLastPaid
        //uint256 _forceOpenDebtPay
    ) external onlyOwner {
        require(_protocol != bytes32(0), 'Invalid Protocol');
        require(_maxFundsCovered != 0, 'Invalid Funds');
        require(_percentagePremiumPerBlock != 0, 'Invalid Risk');
        // if(_forceOpenDebtPay) {
        //     require(tryPayOffDebt(_protocol, true), 'Failed to pay off debt');
        // }
        profiles[_protocol] = ProtocolProfile(
            _maxFundsCovered,
            _percentagePremiumPerBlock
        );

        if(!protocolsCovered[_protocol]){
            protocolsCovered[_protocol] = true;
            protocols.push(_protocol);
        }

        if(_premiumLastPaid == 0) {
            require(profilePremiumLastPaid[_protocol] > 0, 'Invalid last paid'); /// What is this ?!?!?!
            return;
        }

        if(_premiumLastPaid == uint256(-1)) {
            profilePremiumLastPaid[_protocol] = block.number;
        } else {
            require(_premiumLastPaid < block.number, 'Too high');
            profilePremiumLastPaid[_protocol] = _premiumLastPaid;
        }
    }

    function removeProtocol(
        bytes32 _protocol,
        uint256 _index,
        //bool forceOpenDebtPay,
        address _balanceReceiver
     ) external onlyOwner {
         require(protocols[_index] == _protocol, 'Invalid index');
        //  if(_forceOpenDebtPay) {
        //      require(tryPayOffDebt(_protocol, true), 'Faild to pay off debt');
        //  }
        // transfer remaining balance to user
        require(
            ERC20Token.transferFrom(
                address(this),
                _balanceReceiver,
                profileBalances[_protocol]
            ), 'Insufficient Funds'
        );
        delete profiles[_protocol];
        delete profileBalances[_protocol];
        delete profilePremiumLastPaid[_protocol];
        protocolsCovered[_protocol] = false;
        // set last element to current index
        protocols[_index] = protocols[protocols.length -1];
        // remove last element
        delete protocols[protocols.length -1];
        protocols.pop();
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

    function accruedDebt(bytes32 _protocol) public view returns (uint256) {
        return
            block.number.sub(profilePremiumLastPaid[_protocol]).mul(
                premiumPerBlock(_protocol)
            );
    }

    function getFunds(address _staker) external view returns (uint256) {
        return lpToken.balanceOf(_staker).mul(getTotalStakedFunds()).div(
            lpToken.totalSupply()
        );
    }

    function premiumPerBlock(bytes32 _protocol) public view returns (uint256) {
        ProtocolProfile memory p = profiles[_protocol];
        return
            coveredFunds(_protocol).mul(p.percentagePremiumPerBlock).div(
                10**18
            );
        
    }

    function getTotalStakedFunds() public view returns (uint256) {
        return totalStakedFunds;
    }

    function isOwner() public view returns(address) {
        return owner();
    }

    function protocolCovered(bytes32 _protocol) public view returns (bool){
        return protocolsCovered[_protocol];
    }

    function premiumLastPaid(bytes32 _protocol) public view returns (uint256) {
        return profilePremiumLastPaid[_protocol];
    }

    function coveredFunds(bytes32 _protocol) public view returns(uint256) {
        ProtocolProfile memory p = profiles[_protocol];
        require(p.maxFundsCovered > 0, 'Profile not found');
        if(getTotalStakedFunds() > p.maxFundsCovered) {
            return p.maxFundsCovered;
        }
        return getTotalStakedFunds();
    }

    

}