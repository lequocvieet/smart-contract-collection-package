// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;
import "./ITaskManager.sol";

interface IBatchTaskVoting {
    struct BatchTaskVoting {
        uint batchTaskId;
        BATCH_TASK_STATE batchTaskState;
        uint totalVote; //number of voter votes on this batch
        int256 result; //Initialize=0,Yes+1, No -1
        uint voteDuration; //seconds
        uint startTime;
        address[] voters; //list voter
    }
    enum BATCH_TASK_STATE {
        OPENFORVOTE,
        VOTED
    }

    function setTaskManager(address _taskManagerAddress) external;

    function voteOnBatchTask(uint _batchTaskID, bool _choice) external;

    function endVote() external;

    function openForVote(uint _batchTaskID, uint _voteDuration) external;
}
