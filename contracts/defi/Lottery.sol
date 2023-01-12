//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract Lottery {
    event Log(uint256);

    error InsufficientAmount();
    error AdminOnly();

    address[] public players;
    address public manager;

    receive() external payable {
        if (msg.value < 0.5 ether) revert InsufficientAmount();
        players.push(msg.sender);
    }

    constructor() {
        manager = msg.sender;
    }

    function balance() external view returns (uint256) {
        return address(this).balance;
    }

    function randomNotRandom() public view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty, players.length)));
    }

    function pickWinner() public {
        if (msg.sender != manager) revert AdminOnly();
        uint256 index = randomNotRandom() % players.length;
        address payable winner = payable(players[index]);
        players = new address[](0);
        winner.transfer(address(this).balance);
    }
}
