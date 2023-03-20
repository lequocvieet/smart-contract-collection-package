pragma solidity ^0.8.0;
import "hardhat/console.sol";

contract Contract2 {
    mapping(address => int256) addressToBalance;
   
    function transfer(address to, int256 amt, string memory uuid) public {
        addressToBalance[to] = addressToBalance[to] + amt;
        addressToBalance[msg.sender] = addressToBalance[msg.sender] - amt;
        console.log("block number", block.number);
        console.log("block time stamp", block.timestamp);
       
        //console.log("nonce", ethers.provider.getTransactionCount(account));
    }
}
