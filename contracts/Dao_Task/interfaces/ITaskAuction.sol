// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;
import "./ITaskManager.sol";

interface ITaskAuction {
    struct AuctionTask {
        uint taskId;
        uint point; // 1 point=4 hour doing Task
        uint reward;
        uint minReward;
        address reporter;
        address doer;
        address reviewer;
        TASK_STATE taskState;
        uint lowestBidAmount;
        address lowestBidder;
        uint duration;
        uint startTime;
    }

    enum TASK_STATE {
        //Do not have CREATED because Task created at backend
        //DO not have OPENFORVOTE because that blongs to batchTask not specific task
        OPENFORAUCTION,
        ASSIGNED,
        RECEIVED,
        SUBMITTED,
        REVIEWED
    }

    struct Bid {
        //represent user bid on specific task
        address payable bidder;
        uint taskId;
        uint totalBidAmount;
        uint numberBid; //number place Bid
    }

    function setTaskManager(address _taskManagerAddress) external;

    function openTaskForAuction(
        ITaskManager.Task memory _task,
        uint __auctionDuration
    ) external;

    function placeBid(uint _taskID) external payable;

    function endAuction() external;
}
