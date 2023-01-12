//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract Coin {
    address public minter;
    mapping(address => uint256) public balances;
    event Sent(address from, address to, uint256 amount);

    modifier onlyOwner() {
        msg.sender == minter;
        _;
    }

    constructor() {
        minter = msg.sender;
    }

    function mint(address _to, uint256 value) public onlyOwner {
        balances[_to] += value;
    }

    function send(address _to, uint256 value) public {
        require(balances[msg.sender] >= value, "Please try to send ETH that you own");
        require(value > 0, "Please try to send more than 0 wei");
        balances[_to] += value;
        balances[msg.sender] -= value;
        emit Sent(msg.sender, _to, value);
    }
}
