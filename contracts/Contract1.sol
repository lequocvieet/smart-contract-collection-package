pragma solidity ^0.8.0;
import "./Contract2.sol";

contract Contract1 {
    Contract2 public contract2;

    constructor(address contract2_address) {
        contract2 = Contract2(contract2_address);
    }

    function testSameBlockNumber() public {
        contract2.transfer(msg.sender, 10, "traceno1");
        contract2.transfer(msg.sender, 5, "traceno2");
    }
}
