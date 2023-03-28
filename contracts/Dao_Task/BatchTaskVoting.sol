pragma solidity ^0.8.17;

import "./interfaces/ITaskManager.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IBatchTaskVoting.sol";

contract BatchTaskVoting is IBatchTaskVoting, Ownable {
    ITaskManager public taskManager;

    //mapping batchTaskIdToBatchTaskVoting
    mapping(uint => BatchTaskVoting) batchTaskIdToBatchTaskVoting;

    //mapping batchTaskIdToVoterToVoted
    mapping(uint => mapping(address => bool)) batchTaskIdToVoterToVoted;

    //Array to store all BatchTaskVoting on vote and voted
    BatchTaskVoting[] public batchTasks;

    BatchTaskVoting[] public batchTaskCanEnd;

    modifier checkBatchTaskState(
        BATCH_TASK_STATE requiredState,
        uint _batchTaskID
    ) {
        require(
            batchTaskIdToBatchTaskVoting[_batchTaskID].batchTaskState ==
                requiredState,
            "Error: Invalid Batch Task Voting state!"
        );
        _;
    }

    function setTaskManager(address _taskManagerAddress) external onlyOwner {
        taskManager = ITaskManager(_taskManagerAddress);
    }

    //Todo: onlyCall by TaskManager to open for vote
    function openForVote(uint _batchTaskID, uint _voteDuration) external {
        address[] memory _voters;
        BatchTaskVoting memory newBatchTask = BatchTaskVoting({
            batchTaskId: _batchTaskID,
            batchTaskState: BATCH_TASK_STATE.OPENFORVOTE,
            totalVote: 0,
            result: 0,
            voteDuration: _voteDuration,
            startTime: block.timestamp,
            voters: _voters
        });
        //save to mapping
        batchTaskIdToBatchTaskVoting[_batchTaskID] = newBatchTask;

        //save to array
        batchTasks.push(newBatchTask);
    }

    /**
     *User call this function to vote on batchTask
     *Require batchTask state=OPENFORVOTE
     *require time.vote > timeOpenForVote
     *Require each user can vote 1 times
     */
    function voteOnBatchTask(
        uint _batchTaskID,
        bool _choice
    ) public checkBatchTaskState(BATCH_TASK_STATE.OPENFORVOTE, _batchTaskID) {
        //iterate through list of batchTasks in array
        //find baskTask by Id
        for (uint i = 0; i < batchTasks.length; i++) {
            if (batchTasks[i].batchTaskId == _batchTaskID) {
                require(
                    batchTaskIdToVoterToVoted[_batchTaskID][msg.sender] ==
                        false,
                    "User already vote on this batch task"
                );
                require(
                    block.timestamp >= batchTasks[i].startTime &&
                        block.timestamp <=
                        batchTasks[i].startTime + batchTasks[i].voteDuration,
                    "Voting is end or not open yet"
                );
                if (_choice) {
                    //Yes
                    batchTasks[i].result++;
                } else {
                    //No
                    batchTasks[i].result--;
                }
                batchTasks[i].voters.push(msg.sender);
                batchTasks[i].totalVote++;
                batchTaskIdToVoterToVoted[_batchTaskID][msg.sender] == true;

                //update to mapping
                batchTaskIdToBatchTaskVoting[_batchTaskID] = batchTasks[i];

                //because id is unique, if found no need to loop anymore
                break;
            }
        }
    }

    /**
     *ToDo:only vote creator who create this vote
     *Only batchTask with State=OPENFORVOTE and is due(endVote time > start vote+duration)
     */
    function endVote() external {
        for (uint i = 0; i < batchTasks.length; i++) {
            if (
                batchTasks[i].batchTaskState == BATCH_TASK_STATE.OPENFORVOTE &&
                ((batchTasks[i].startTime + batchTasks[i].voteDuration) >
                    block.timestamp)
            ) {
                batchTasks[i].batchTaskState == BATCH_TASK_STATE.VOTED;
                batchTaskCanEnd.push(batchTasks[i]);
            }
        }
        int256 max = batchTaskCanEnd[0].result;
        for (uint i = 0; i < batchTaskCanEnd.length; i++) {
            if (batchTaskCanEnd[i].result > max) {
                max = batchTaskCanEnd[i].result;
            }
        }
        //Choose batchTask with higher results
        for (uint i = 0; i < batchTaskCanEnd.length; i++) {
            if (max == batchTaskCanEnd[i].result) {
                //Call to taskManager
                taskManager.initBatchTaskAuction(
                    batchTaskCanEnd[i].batchTaskId
                );
                break;
            }
        }
    }
}
