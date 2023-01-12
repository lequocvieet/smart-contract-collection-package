// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20Mock is ERC20 {
    constructor(string memory  name, string memory symbol) ERC20(name, symbol) {}

    function mint(address account) external {
        _mint(account, 100*10**18);//hard fix 100 token

    }

    function burn(address account, uint256 amount) external {
        _burn(account, amount);
    }

    function getBalance(address account) public view returns(uint256){
         return balanceOf(account);
    }
}