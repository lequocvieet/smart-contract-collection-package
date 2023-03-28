// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import "./interfaces/ICreditScore.sol";

contract CreditScore is ICreditScore {
    CreditScore[] creditScores;
    mapping(address => User) public userAddressToUser;

    User[] users;

    //only call internal of this contract
    //Todo: exponential case
    function calculateScoreByPercentTaskDone(
        address _userAddress
    ) public override returns (uint) {
        //iterate through all taskDone
        for (
            uint i = 0;
            i < userAddressToUser[_userAddress].tasksDone.length;
            i++
        ) {
            if (
                userAddressToUser[_userAddress].tasksDone[i].percentageDone > 60
            ) {
                //If percentage of each taskDone>=60% increase score by 1
                userAddressToUser[_userAddress].score += 1;
            } else if (
                userAddressToUser[_userAddress].tasksDone[i].percentageDone < 30
            ) {
                //Else 30%-60% do nothing to score
            } else {
                //Else minus 1
                userAddressToUser[_userAddress].score =
                    userAddressToUser[_userAddress].score -
                    1;
            }
            return userAddressToUser[_userAddress].score;
        }
    }

    //Todo:only call by taskManager
    function saveTaskDone(
        uint _taskId,
        address _doer,
        uint _percentageDone
    ) public {
        // TaskDone memory userTaskDone;
        // userTaskDone.taskId = _taskId;
        // userTaskDone.percentageDone = _percentageDone;
        bool found = false;
        for (uint i = 0; i < users.length; i++) {
            if (users[i].userAddress == _doer) {
                users[i].tasksDone.push(
                    TaskDone({taskId: _taskId, percentageDone: _percentageDone})
                );
                found = true;
                userAddressToUser[_doer] = users[i];
                break;
            }
        }
        if (found == false) {
            //first time done task
            User memory newUser;
            newUser.userAddress = _doer;
            newUser.score = 50; //init score =50
            users.push(newUser);
            users[users.length - 1].tasksDone.push(
                TaskDone({taskId: _taskId, percentageDone: _percentageDone})
            );
            userAddressToUser[_doer] = newUser;
        }
    }

    // Function to calculate commitment token based on credit score
    function calculateCommitmentToken(address _user) public returns (uint) {
        //getCreditScore of user
        uint userScore = calculateScoreByPercentTaskDone(_user);
        //And calculate score respectively
        uint commitmentToken = userScore * 2; //this rule can change in the future
        return commitmentToken;
    }
}
