pragma solidity ^0.8.17;
import "./ITaskAuction.sol";

interface ITaskManager {
    // Struct to define the properties of the task object
    struct Task {
        uint taskId;
        string name;
        string description;
        uint point; //point is caculated by durations 1 point=4 hour
        uint reward;
        uint minReward;
        address reporter;
        address doer;
        address reviewer;
        uint timeDoerReceive;
        TASK_STATE taskState;
    }

    struct Poll {
        uint pollId;
        address pollOwner;
        BatchTask[] batchTasks;
    }

    struct BatchTask {
        uint batchTaskId;
        Task[] tasks; //list task in batch
        BATCH_TASK_STATE batchTaskState;
    }

    enum BATCH_TASK_STATE {
        OPENFORVOTE,
        VOTED
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

    function initPolls(bytes memory _polls) external;

    function openPollForVote(uint _pollId, uint _voteDuration) external;

    function initBatchTaskAuction(uint _batchTaskId) external;

    function openBatchTaskForAuction(
        uint _batchTaskID,
        uint _auctionDuration
    ) external;

    function assignTask(
        ITaskAuction.AuctionTask memory doneAuctionTask
    ) external;

    function receiveTask(uint _taskId) external payable;

    function submitTaskResult(uint _taskId) external;

    function submitReview(
        uint _taskId,
        uint percentageDone //ex:100==100%
    ) external;

    function updateTask(
        uint _taskId,
        uint _newPoint //point =duration
    ) external;

    function getBatchTask(
        uint _batchTaskID
    ) external view returns (BatchTask memory);
}
