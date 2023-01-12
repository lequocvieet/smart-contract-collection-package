// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

contract Staking {
    IERC20 public immutable stakingToken;
    IERC20 public immutable rewardsToken;

    address public owner;

    uint256 public duration; // Duration of rewards to be paid out (in seconds)
    uint256 public finishAt; // Timestamp of when the rewards finish
    uint256 public updatedAt; // Minimum of last updated time and reward finish time
    uint256 public rewardRate; // Reward to be paid out per second
    uint256 public rewardPerTokenStored; // Sum of (reward rate * dt * 1e18 / total supply)

    uint256 public totalSupply; // Total staked
    mapping(address => uint256) public balanceOf; // User address => staked amount
    mapping(address => uint256) public userRewardPerTokenPaid; // User  => rewardPerTokenStored
    mapping(address => uint256) public rewards; // User  => rewards to be claimed

    error ZeroInput();
    error OnlyOwner();
    error TooSoon();

    constructor(address _stakingToken, address _rewardToken) {
        owner = msg.sender;
        stakingToken = IERC20(_stakingToken);
        rewardsToken = IERC20(_rewardToken);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier updateReward(address _account) {
        rewardPerTokenStored = rewardPerToken();
        updatedAt = lastTimeRewardApplicable();

        if (_account != address(0)) {
            rewards[_account] = earned(_account);
            userRewardPerTokenPaid[_account] = rewardPerTokenStored;
        }
        _;
    }

    function lastTimeRewardApplicable() public view returns (uint256) {
        return _min(finishAt, block.timestamp);
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalSupply == 0) return rewardPerTokenStored;
        return
            rewardPerTokenStored +
            (rewardRate * (lastTimeRewardApplicable() - updatedAt) * 1e18) /
            totalSupply;
    }

    function stake(uint256 _amount) external updateReward(msg.sender) {
        if (_amount == 0) revert ZeroInput();
        stakingToken.transferFrom(msg.sender, address(this), _amount);
        balanceOf[msg.sender] += _amount;
        totalSupply += _amount;
    }

    function withdraw(uint256 _amount) external updateReward(msg.sender) {
        if (_amount == 0) revert ZeroInput();
        balanceOf[msg.sender] -= _amount;
        totalSupply -= _amount;
        stakingToken.transfer(msg.sender, _amount);
    }

    function earned(address _account) public view returns (uint256) {
        return
            ((balanceOf[_account] *
                (rewardPerToken() - userRewardPerTokenPaid[_account])) / 1e18) +
            rewards[_account];
    }

    function getReward() external updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardsToken.transfer(msg.sender, reward);
        }
    }

    function setRewardsDuration(uint256 _duration) external onlyOwner {
        if (block.timestamp < finishAt) revert TooSoon();
        duration = _duration;
    }

    function notifyRewardAmount(
        uint256 _amount
    ) external onlyOwner updateReward(address(0)) {
        if (block.timestamp >= finishAt) {
            rewardRate = _amount / duration;
        } else {
            uint256 remainingRewards = (finishAt - block.timestamp) *
                rewardRate;
            rewardRate = (_amount + remainingRewards) / duration;
        }

        require(rewardRate > 0, "reward rate = 0");
        require(
            rewardRate * duration <= rewardsToken.balanceOf(address(this)),
            "reward amount > balance"
        );

        finishAt = block.timestamp + duration;
        updatedAt = block.timestamp;
    }

    function _min(uint256 x, uint256 y) private pure returns (uint256) {
        return x <= y ? x : y;
    }

    function getDuration() public view returns (uint256) {
        return duration;
    }

    function getRewardRate() public view returns (uint256) {
        return rewardRate;
    }

    function getBalanceStaked(address staker) public view returns (uint256) {
        return balanceOf[staker];
    }

    function getUpdateTime() public view returns (uint256) {
        return updatedAt;
    }

    function getFinishTime() public view returns (uint256) {
        return finishAt;
    }

    function getAccountReward(address account) public view returns (uint256) {
        return rewards[account];
    }
}
