// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/utils/Pausable.sol';

/**
 * @title LPStaking
 * @dev Staking contract for Uniswap V2 LP tokens with HLS rewards
 */
contract LPStaking is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Info of each user
    struct UserInfo {
        uint256 amount;     // How many LP tokens the user has provided
        uint256 rewardDebt; // Reward debt
        uint256 lastStakeTime; // Last time user staked
    }

    // Info of each pool
    struct PoolInfo {
        IERC20 lpToken;           // Address of LP token contract
        uint256 allocPoint;       // How many allocation points assigned to this pool
        uint256 lastRewardBlock;  // Last block number that rewards distribution occurs
        uint256 accRewardPerShare; // Accumulated rewards per share, times 1e12
        uint256 totalStaked;      // Total amount of LP tokens staked
        uint256 minStakingPeriod; // Minimum staking period in seconds
        bool isActive;            // Pool is active or not
    }

    // The reward token (HLS will be wrapped as WDEX for rewards)
    IERC20 public rewardToken;
    
    // Reward tokens per block
    uint256 public rewardPerBlock;
    
    // Bonus multiplier for early users
    uint256 public constant BONUS_MULTIPLIER = 1;
    
    // Info of each pool
    PoolInfo[] public poolInfo;
    
    // Info of each user that stakes LP tokens
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;
    
    // Total allocation points. Must be the sum of all allocation points in all pools
    uint256 public totalAllocPoint = 0;
    
    // The block number when reward mining starts
    uint256 public startBlock;
    
    // Emergency withdrawal fee (in basis points, 100 = 1%)
    uint256 public emergencyWithdrawFee = 100;

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event RewardPaid(address indexed user, uint256 indexed pid, uint256 amount);
    event PoolAdded(uint256 indexed pid, address indexed lpToken, uint256 allocPoint);
    event PoolUpdated(uint256 indexed pid, uint256 allocPoint);

    constructor(
        IERC20 _rewardToken,
        uint256 _rewardPerBlock,
        uint256 _startBlock
    ) Ownable(msg.sender) {
        rewardToken = _rewardToken;
        rewardPerBlock = _rewardPerBlock;
        startBlock = _startBlock;
    }

    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }

    // Add a new lp to the pool. Can only be called by the owner.
    function add(
        uint256 _allocPoint,
        IERC20 _lpToken,
        uint256 _minStakingPeriod,
        bool _withUpdate
    ) external onlyOwner {
        if (_withUpdate) {
            massUpdatePools();
        }
        uint256 lastRewardBlock = block.number > startBlock ? block.number : startBlock;
        totalAllocPoint = totalAllocPoint + _allocPoint;
        poolInfo.push(PoolInfo({
            lpToken: _lpToken,
            allocPoint: _allocPoint,
            lastRewardBlock: lastRewardBlock,
            accRewardPerShare: 0,
            totalStaked: 0,
            minStakingPeriod: _minStakingPeriod,
            isActive: true
        }));
        
        emit PoolAdded(poolInfo.length - 1, address(_lpToken), _allocPoint);
    }

    // Update the given pool's allocation point. Can only be called by the owner.
    function set(
        uint256 _pid,
        uint256 _allocPoint,
        bool _withUpdate
    ) external onlyOwner {
        if (_withUpdate) {
            massUpdatePools();
        }
        totalAllocPoint = totalAllocPoint - poolInfo[_pid].allocPoint + _allocPoint;
        poolInfo[_pid].allocPoint = _allocPoint;
        
        emit PoolUpdated(_pid, _allocPoint);
    }

    // Return reward multiplier over the given _from to _to block.
    function getMultiplier(uint256 _from, uint256 _to) public pure returns (uint256) {
        return (_to - _from) * BONUS_MULTIPLIER;
    }

    // View function to see pending rewards on frontend.
    function pendingReward(uint256 _pid, address _user) external view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        uint256 accRewardPerShare = pool.accRewardPerShare;
        uint256 lpSupply = pool.totalStaked;
        
        if (block.number > pool.lastRewardBlock && lpSupply != 0) {
            uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
            uint256 reward = (multiplier * rewardPerBlock * pool.allocPoint) / totalAllocPoint;
            accRewardPerShare = accRewardPerShare + (reward * 1e12) / lpSupply;
        }
        return (user.amount * accRewardPerShare) / 1e12 - user.rewardDebt;
    }

    // Update reward variables for all pools. Be careful of gas spending!
    function massUpdatePools() public {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            updatePool(pid);
        }
    }

    // Update reward variables of the given pool to be up-to-date.
    function updatePool(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        if (block.number <= pool.lastRewardBlock) {
            return;
        }
        uint256 lpSupply = pool.totalStaked;
        if (lpSupply == 0) {
            pool.lastRewardBlock = block.number;
            return;
        }
        uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
        uint256 reward = (multiplier * rewardPerBlock * pool.allocPoint) / totalAllocPoint;
        pool.accRewardPerShare = pool.accRewardPerShare + (reward * 1e12) / lpSupply;
        pool.lastRewardBlock = block.number;
    }

    // Deposit LP tokens to earn rewards.
    function deposit(uint256 _pid, uint256 _amount) external nonReentrant whenNotPaused {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        require(pool.isActive, "LPStaking: Pool is not active");
        
        updatePool(_pid);
        
        if (user.amount > 0) {
            uint256 pending = (user.amount * pool.accRewardPerShare) / 1e12 - user.rewardDebt;
            if (pending > 0) {
                safeRewardTransfer(msg.sender, pending);
                emit RewardPaid(msg.sender, _pid, pending);
            }
        }
        
        if (_amount > 0) {
            pool.lpToken.safeTransferFrom(address(msg.sender), address(this), _amount);
            user.amount = user.amount + _amount;
            pool.totalStaked = pool.totalStaked + _amount;
            user.lastStakeTime = block.timestamp;
        }
        
        user.rewardDebt = (user.amount * pool.accRewardPerShare) / 1e12;
        emit Deposit(msg.sender, _pid, _amount);
    }

    // Withdraw LP tokens.
    function withdraw(uint256 _pid, uint256 _amount) external nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        require(user.amount >= _amount, "LPStaking: Insufficient balance");
        
        // Check minimum staking period
        require(
            block.timestamp >= user.lastStakeTime + pool.minStakingPeriod,
            "LPStaking: Minimum staking period not met"
        );
        
        updatePool(_pid);
        
        uint256 pending = (user.amount * pool.accRewardPerShare) / 1e12 - user.rewardDebt;
        if (pending > 0) {
            safeRewardTransfer(msg.sender, pending);
            emit RewardPaid(msg.sender, _pid, pending);
        }
        
        if (_amount > 0) {
            user.amount = user.amount - _amount;
            pool.totalStaked = pool.totalStaked - _amount;
            pool.lpToken.safeTransfer(address(msg.sender), _amount);
        }
        
        user.rewardDebt = (user.amount * pool.accRewardPerShare) / 1e12;
        emit Withdraw(msg.sender, _pid, _amount);
    }

    // Withdraw without caring about rewards. EMERGENCY ONLY.
    function emergencyWithdraw(uint256 _pid) external nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        uint256 amount = user.amount;
        
        // Apply emergency withdrawal fee
        uint256 fee = (amount * emergencyWithdrawFee) / 10000;
        uint256 amountAfterFee = amount - fee;
        
        user.amount = 0;
        user.rewardDebt = 0;
        pool.totalStaked = pool.totalStaked - amount;
        
        pool.lpToken.safeTransfer(address(msg.sender), amountAfterFee);
        if (fee > 0) {
            pool.lpToken.safeTransfer(owner(), fee); // Fee goes to owner
        }
        
        emit EmergencyWithdraw(msg.sender, _pid, amountAfterFee);
    }

    // Safe reward transfer function, just in case if rounding error causes pool to not have enough rewards.
    function safeRewardTransfer(address _to, uint256 _amount) internal {
        uint256 rewardBal = rewardToken.balanceOf(address(this));
        if (_amount > rewardBal) {
            rewardToken.safeTransfer(_to, rewardBal);
        } else {
            rewardToken.safeTransfer(_to, _amount);
        }
    }

    // Admin functions
    function setRewardPerBlock(uint256 _rewardPerBlock) external onlyOwner {
        massUpdatePools();
        rewardPerBlock = _rewardPerBlock;
    }

    function setEmergencyWithdrawFee(uint256 _fee) external onlyOwner {
        require(_fee <= 1000, "LPStaking: Fee too high"); // Max 10%
        emergencyWithdrawFee = _fee;
    }

    function setPoolActive(uint256 _pid, bool _isActive) external onlyOwner {
        poolInfo[_pid].isActive = _isActive;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Emergency reward withdrawal for owner
    function emergencyRewardWithdraw(uint256 _amount) external onlyOwner {
        require(_amount <= rewardToken.balanceOf(address(this)), "LPStaking: Insufficient balance");
        rewardToken.safeTransfer(owner(), _amount);
    }
}