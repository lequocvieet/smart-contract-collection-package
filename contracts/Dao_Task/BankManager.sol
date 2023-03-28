// Bank Manager Smart Contract Manages account Balance
pragma solidity ^0.8.17;
// Import ERC20 Token
import "./Token.sol";

// Declare the contract
contract BankManager {
    // Define the ERC20 token instance
    Token private erc20Token;

    function chooseToken(address _erc20Address) public {
        erc20Token = Token(_erc20Address);
    }

    // Function to fund the ERC20 token
    function fundTokenErc20(uint256 _amount) public {
        // Transfer tokens to the contract from the sender
        erc20Token.transferFrom(msg.sender, address(this), _amount);
    }

    // Function to mint new tokens
    function mint(uint256 _amount) public {
        // Mint new tokens and send them to the sender
        erc20Token.mint(msg.sender, _amount);
    }

    // Function to burn tokens
    function burn(uint256 _amount) public {
        // Burn tokens from the sender's account
        erc20Token.burn(msg.sender, _amount);
    }

    // Function to transfer tokens
    function transferToken(address _recipient, uint256 _amount) public {
        // Transfer tokens from the sender's account to the specified recipient
        erc20Token.transfer(_recipient, _amount);
    }

    function getBalance(address account) public view returns (uint256) {
        return erc20Token.getBalance(account);
    }
}
