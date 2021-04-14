// SPDX-License-Identifier: SPDX
pragma solidity ^0.7.3;
import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import './interfaces/ILPToken.sol';
import './interfaces/IToken.sol';
import './interfaces/IPayout.sol';
import './StrategyManager.sol';

contract PFLBloc is Ownable {

    using SafeMath for uint256;

    IStrategyManager public strategyManager;

    ILPToken public lpToken;
    IToken public ERC20Token;

    bool public redirectStakeToStrategy;

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
    
    
    constructor(address _lpToken, address _PFLToken, address _strategyManager) public {
        lpToken = ILPToken(_lpToken);
        ERC20Token = IToken(_PFLToken);
        strategyManager = IStrategyManager(_strategyManager);
    }

    function setTimelock(uint256 _timelock) onlyOwner external {
        timelock = _timelock;
    }

    function _withdrawStrategyManager(uint256 _amount) internal {
        strategyManager.withdraw(address(lpToken), _amount);
        totalStakedFunds = totalStakedFunds.add(_amount);
    }

    function withdrawStrategyManager(uint _amount) external onlyOwner {
        _withdrawStrategyManager(_amount);
    }

    function _depositStrategyManager(uint256 _amount) internal onlyOwner {
        require(
            lpToken.transfer(address(strategyManager), _amount), 'Insufficient funds'
        );
        totalStakedFunds = totalStakedFunds.sub(_amount);
        strategyManager.deposit(address(lpToken));
    }

    function depositStrategyManager(uint256 _amount) external {
        _depositStrategyManager(_amount);
    }

    function setStrategyManager(address _strategyManager) external onlyOwner {
        // todo withdraw all funds
        strategyManager = IStrategyManager(_strategyManager);
    }

    function setRedirectStakeToStrategy(bool _redirect) external onlyOwner {
        redirectStakeToStrategy = _redirect;
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

    function insurancePayout(
        bytes32 _protocol,
        uint256 _amount,
        address _payout ) 
        external onlyOwner {
            require (coveredFunds(_protocol) >= _amount, "Insufficient_coverage");
            require(ERC20Token.transfer(_payout, _amount), "Insufficient_Funds");
            IPayout payout = IPayout(_payout);
            payout.deposit(address(ERC20Token));
            totalStakedFunds = totalStakedFunds.sub(_amount);
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

        _tryPayOffDebtAll(false);

        uint256 funds = withdraw.stake.mul(getTotalStakedFunds()).div(
            lpToken.totalSupply()
        );
        
        if(funds > totalStakedFunds) {
            _withdrawStrategyManager(funds.sub(totalStakedFunds));
        } else if (redirectStakeToStrategy && funds < totalStakedFunds) {
            _depositStrategyManager(totalStakedFunds.sub(funds));
        }

        
        
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

    function tryPayOffDebt(bytes32 _protocol, bool _useRedirect) internal returns (bool) {
        uint256 debt = accruedDebt(_protocol);
        if(debt > profileBalances[_protocol]) {
            return false;
        }
        profileBalances[_protocol] = profileBalances[_protocol].sub(debt);
        totalStakedFunds = totalStakedFunds.add(debt);
        profilePremiumLastPaid[_protocol] = block.number;

        // if(_useRedirect && redirectStakeToStrategy) {
        //     _depositStrategyManager(debt);
        // }
        return true;
    }

    function _tryPayOffDebtAll(bool _useRedirect) internal {
        for(uint256 i = 0; i < protocols.length; i++) {
            tryPayOffDebt(protocols[i], _useRedirect);
        }
    }

    function payOffDebt(bytes32 _protocol) external {
        require(tryPayOffDebt(_protocol, true), 'Insufficient funds');
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

    function profileBalance(bytes32 _protocol) public view returns (uint256) {
        return profileBalances[_protocol];
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