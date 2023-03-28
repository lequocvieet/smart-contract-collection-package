// Solidity version used for the contract
pragma solidity ^0.8.17;
import "./interfaces/ITaskManager.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ITaskAuction.sol";
import "./interfaces/IBatchTaskVoting.sol";
import "./interfaces/ICreditScore.sol";

// Contract definition
contract TaskManager is ITaskManager, Ownable {
    ITaskAuction public taskAuction;

    IBatchTaskVoting public batchTaskVoting;

    ICreditScore public creditScore;

    // Array to store all the tasks created
    Task[] public tasks;

    //Array store all polls
    Poll[] public polls;

    //Array to store all batch task created
    BatchTask[] public batchTasks;

    mapping(uint => Task) taskIdToTask;

    mapping(uint => Poll) pollIdToPoll;

    mapping(uint => BatchTask) batchTaskIdToBatchTask;

    modifier checkBatchTaskState(
        BATCH_TASK_STATE requiredState,
        uint _BatchTaskID
    ) {
        require(
            batchTaskIdToBatchTask[_BatchTaskID].batchTaskState ==
                requiredState,
            "Error: Invalid Batch Task State"
        );
        _;
    }

    modifier checkTaskState(TASK_STATE requiredState, uint _taskID) {
        require(
            taskIdToTask[_taskID].taskState == requiredState,
            "Error: Invalid Task State"
        );
        _;
    }

    function setTaskAuction(address _taskAuctionAddress) external onlyOwner {
        taskAuction = ITaskAuction(_taskAuctionAddress);
    }

    function setBatchTaskVoting(
        address _batchTaskVotingAddress
    ) external onlyOwner {
        batchTaskVoting = IBatchTaskVoting(_batchTaskVotingAddress);
    }

    function setCreditScore(address _creditScoreAddress) external onlyOwner {
        creditScore = ICreditScore(_creditScoreAddress);
    }

    //Each time done disscussion, backend will push a Poll contain list batchTask prepare for voting
    //Todo: onlycall by backend with signed signature
    function initPolls(bytes memory _polls) external {
        Poll[] memory newPolls = abi.decode(_polls, (Poll[]));
        for (uint i = 0; i < newPolls.length; i++) {
            //save to array
            polls.push(newPolls[i]);
            //save to mapping
            pollIdToPoll[newPolls[i].pollId] = newPolls[i];

            for (uint j = 0; j < newPolls[i].batchTasks.length; j++) {
                //save to array
                batchTasks.push(newPolls[i].batchTasks[j]);
                //save to mapping
                batchTaskIdToBatchTask[
                    newPolls[i].batchTasks[j].batchTaskId
                ] = newPolls[i].batchTasks[j];
            }
        }
    }

    //Open Poll for vote
    //Todo:should call by onlyOwner?
    function openPollForVote(uint _pollId, uint _voteDuration) public {
        for (uint i = 0; i < pollIdToPoll[_pollId].batchTasks.length; i++) {
            batchTaskIdToBatchTask[
                pollIdToPoll[_pollId].batchTasks[i].batchTaskId
            ].batchTaskState = BATCH_TASK_STATE.OPENFORVOTE;
            batchTaskVoting.openForVote(
                pollIdToPoll[_pollId].batchTasks[i].batchTaskId,
                _voteDuration
            );
            //Todo:update on array batchTasks
        }
    }

    //Todo:OnlyCall by BatchTaskVoting after done vote
    function initBatchTaskAuction(uint _batchTaskId) external {
        batchTaskIdToBatchTask[_batchTaskId].batchTaskState = BATCH_TASK_STATE
            .VOTED;

        //Todo:update on array batchTasks
    }

    //Todo: only call by who?
    function openBatchTaskForAuction(
        uint _batchTaskID,
        uint _auctionDuration
    ) external checkBatchTaskState(BATCH_TASK_STATE.VOTED, _batchTaskID) {
        Task[] memory taskForAuctions = batchTaskIdToBatchTask[_batchTaskID]
            .tasks;

        for (uint i = 0; i < taskForAuctions.length; i++) {
            taskForAuctions[i].taskState = TASK_STATE.OPENFORAUCTION;
            taskAuction.openTaskForAuction(
                taskForAuctions[i],
                _auctionDuration
            );

            //update to Task mapping
            taskIdToTask[taskForAuctions[i].taskId] = taskForAuctions[i];
        }
        //update to Batch task mapping
        batchTaskIdToBatchTask[_batchTaskID].tasks = taskForAuctions;
    }

    //Todo:OnlyCall by TaskAuction after done auction
    function assignTask(
        ITaskAuction.AuctionTask memory doneAuctionTask
    ) public {
        taskIdToTask[doneAuctionTask.taskId].reward = doneAuctionTask.reward;
        taskIdToTask[doneAuctionTask.taskId].doer = doneAuctionTask.doer;
        taskIdToTask[doneAuctionTask.taskId].taskState = TASK_STATE.ASSIGNED;
    }

    /** 
    //Only doer can call receive task after assigned in auction
    //require task state=ASSIGNED
    //require send a commitment token base on their creditscore
    */
    function receiveTask(
        uint _taskId
    ) external payable checkTaskState(TASK_STATE.ASSIGNED, _taskId) {
        require(msg.sender == taskIdToTask[_taskId].doer, "Only doer can call");
        require(taskIdToTask[_taskId].taskId == _taskId, "taskID not found");
        uint commitmentToken = creditScore.calculateCommitmentToken(msg.sender);
        require(
            msg.value >= commitmentToken,
            "Not provide enough money to receive task!"
        );
        taskIdToTask[_taskId].taskState = TASK_STATE.RECEIVED;
        taskIdToTask[_taskId].timeDoerReceive = block.timestamp;
    }

    /** 
    //require submit time > time task assigned(no need because changes by state)
    //Todo: if submit time> time task assigned+deadline=>task fail without revieww
    //Only doer can submit
    //require task stated==RECEIVED
    */
    function submitTaskResult(
        uint _taskId
    ) external checkTaskState(TASK_STATE.RECEIVED, _taskId) {
        require(taskIdToTask[_taskId].taskId == _taskId, "taskID not found");
        require(msg.sender == taskIdToTask[_taskId].doer, "Only doer can call");
        taskIdToTask[_taskId].taskState = TASK_STATE.SUBMITTED;
    }

    /** 
    //Only reviewer can call to submit revieww result of particular doer
    //require task state=SUBMITED
    //Reviewer choose % work load done to decide which %reward would be send to doer
    //After Submit revieww=> transfer money for doer
    //=> change task state to REVIEWED
    //=> Todo: leaf over money would send to bank manager reserve for many tasks later
    */
    function submitReview(
        uint _taskId,
        uint percentageDone //ex:100==100%
    ) external checkTaskState(TASK_STATE.SUBMITTED, _taskId) {
        require(
            msg.sender == taskIdToTask[_taskId].reviewer,
            "Only reviewer can call"
        );
        require(
            taskIdToTask[_taskId].taskId == _taskId,
            "taskID or batchTaskID not found"
        );
        uint payReward = (taskIdToTask[_taskId].reward * percentageDone) / 100; //in wei or decimal 10^18

        //transfer reward and commitmentToken deposit before
        payable(taskIdToTask[_taskId].doer).transfer(payReward);

        //update taskDone history to CreditScore for future calculation
        creditScore.saveTaskDone(
            _taskId,
            taskIdToTask[_taskId].doer,
            percentageDone
        );
        taskIdToTask[_taskId].taskState = TASK_STATE.REVIEWED;
    }

    /** 
    //Can call by:
    //If doer want to extends the duration=> send money to extends
    //If reviewer want to extends => ok not send money
    //Require task state=RECEIVED
    */
    function updateTask(
        uint _taskId,
        uint _newPoint //point =duration
    ) external checkTaskState(TASK_STATE.RECEIVED, _taskId) {
        require(
            msg.sender == taskIdToTask[_taskId].reviewer ||
                msg.sender == taskIdToTask[_taskId].doer,
            "Only doer or reviewer can call"
        );
        if (msg.sender == taskIdToTask[_taskId].reviewer) {
            taskIdToTask[_taskId].point = _newPoint;
        }
        if (msg.sender == taskIdToTask[_taskId].doer) {
            taskIdToTask[_taskId].point = _newPoint;
            //Todo: require pay money to extend their task
        }
    }

    function getBatchTask(
        uint _batchTaskID
    ) public view returns (BatchTask memory) {
        return batchTaskIdToBatchTask[_batchTaskID];
    }
}
