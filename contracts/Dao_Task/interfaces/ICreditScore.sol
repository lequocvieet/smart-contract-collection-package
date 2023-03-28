pragma solidity ^0.8.17;

interface ICreditScore {
    struct TaskDone {
        uint taskId;
        uint percentageDone;
    }

    struct User {
        address userAddress;
        uint score; //credit score
        TaskDone[] tasksDone; //history of all task reviewed by reviewer
    }

    function calculateScoreByPercentTaskDone(
        address _userAddress
    ) external returns (uint);

    function saveTaskDone(
        uint _taskId,
        address _doer,
        uint _percentageDone
    ) external;

    function calculateCommitmentToken(address _user) external returns (uint);
}
