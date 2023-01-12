// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "hardhat/console.sol";

contract Exchange {
    using SafeMath for uint256;

    // Account that receives exchange fees
    address public feeAccount;
    uint256 public feePercent;

    // asign the 0 address to ether, to store ether amount
    // in mapping for minimizing storage on the blockchain
    address constant ETHER = address(0);

    // 1st key: token address, 2nd key: deposit user address, value: number of tokens
    mapping(address => mapping(address => uint256)) public tokens;
    mapping(uint256 => _Order) public orders;
    mapping(uint256 => bool) public orderCancelled;
    mapping(uint256 => bool) public orderFilled;
    uint256 public orderCount;

    event Deposit(address token, address user, uint256 amount, uint256 balance);
    event Withdraw(
        address token,
        address user,
        uint256 amount,
        uint256 balance
    );
    event Order(
        uint256 id,
        address user,
        address tokenGet,
        uint256 amountGet,
        address tokenGive,
        uint256 amountGive,
        uint256 timestamp
    );
    event Cancel(
        uint256 id,
        address user,
        address tokenGet,
        uint256 amountGet,
        address tokenGive,
        uint256 amountGive,
        uint256 timestamp
    );
    event Trade(
        uint256 id,
        address user,
        address tokenGet,
        uint256 amountGet,
        address tokenGive,
        uint256 amountGive,
        address userFill,
        uint256 timestamp
    );

    struct _Order {
        uint256 id;
        address user;
        address tokenGet;
        uint256 amountGet;
        address tokenGive;
        uint256 amountGive;
        uint256 timestamp;
    }

    constructor(address _feeAccount, uint256 _feePercent) {
        feeAccount = _feeAccount;
        feePercent = _feePercent;
    }

    // fallback() external payable {
    //     revert();
    // }

    /*-----------------Deposit/Withdraw ether-------------------*/

    function depositEther() public payable {
        //add value
        tokens[ETHER][msg.sender] = tokens[ETHER][msg.sender].add(msg.value);
        emit Deposit(ETHER, msg.sender, msg.value, tokens[ETHER][msg.sender]);
    }

    function withdrawEther(uint256 _amount) public {
        //number of ether you deposit must greater or equal than the amount you withdraw
        require(tokens[ETHER][msg.sender] >= _amount);
        //delete amount
        tokens[ETHER][msg.sender] = tokens[ETHER][msg.sender].sub(_amount);

        //transfer amount from contract to msg.sender
        payable(msg.sender).transfer(_amount);
        emit Withdraw(ETHER, msg.sender, _amount, tokens[ETHER][msg.sender]);
    }

    /*-----------------Deposit/Withdraw token-------------------*/

    function depositToken(address _token, uint256 _amount) public {
        // Do not allow ether deposits
        require(_token != ETHER);
        //ERC20 must be excuted before
        console.log("amount", _amount);
        require(
            ERC20(_token).transferFrom(msg.sender, address(this), _amount),
            "error"
        );

        // Add the amount in the token mapping
        tokens[_token][msg.sender] = tokens[_token][msg.sender].add(_amount);
        emit Deposit(_token, msg.sender, _amount, tokens[_token][msg.sender]);
    }

    function withdrawToken(address _token, uint256 _amount) public {
        //similar as ether withdraw
        require(_token != ETHER);
        require(tokens[_token][msg.sender] >= _amount);

        tokens[_token][msg.sender] = tokens[_token][msg.sender].sub(_amount);
        require(ERC20(_token).transfer(msg.sender, _amount));

        emit Withdraw(_token, msg.sender, _amount, tokens[_token][msg.sender]);
    }

    /*------------------Token balance function-------------------*/

    function balanceOf(
        address _token,
        address _user
    ) public view returns (uint256) {
        return tokens[_token][_user];
    }

    /*--------------------Make Order---------------------------*/

    function makeOrder(
        address _tokenGet,
        uint256 _amountGet,
        address _tokenGive,
        uint256 _amountGive
    ) public {
        orderCount = orderCount.add(1); //increase order count

        orders[orderCount] = _Order(
            orderCount,
            msg.sender,
            _tokenGet,
            _amountGet,
            _tokenGive,
            _amountGive,
            block.timestamp
        ); //create new _Order object

        emit Order(
            orderCount,
            msg.sender,
            _tokenGet,
            _amountGet,
            _tokenGive,
            _amountGive,
            block.timestamp
        );
    }

    /*--------------------Cancel Order-------------------------*/

    function cancelOrder(uint256 _id) public {
        // Fetch order from mapping and assign it to _order
        _Order storage _order = orders[_id];
        require(
            address(_order.user) == msg.sender,
            "Only owner can cancel the order"
        );
        require(_order.id == _id);

        orderCancelled[_id] = true;
        emit Cancel(
            _order.id,
            msg.sender,
            _order.tokenGet,
            _order.amountGet,
            _order.tokenGive,
            _order.amountGive,
            block.timestamp
        );
    }

    /*----------------------------------------------------------*/

    function fillOrder(uint256 _id) public {
        require(_id > 0 && _id <= orderCount, "Line 1");
        require(!orderFilled[_id]); //order must not be filled or canceled before
        require(!orderCancelled[_id]);

        // fetch the order from storage
        _Order storage _order = orders[_id];
        _trade(
            _order.id,
            _order.user,
            _order.tokenGet,
            _order.amountGet,
            _order.tokenGive,
            _order.amountGive
        );
        orderFilled[_order.id] = true;
    }

    /*----------------------------------------------------------*/

    function _trade(
        uint256 _orderId,
        address _user,
        address _tokenGet,
        uint256 _amountGet,
        address _tokenGive,
        uint256 _amountGive
    ) internal {
        // Fee paid by the user that fills the order (msg.sender). Deducted from _amountGet
        uint256 _feeAmount = _amountGet.mul(feePercent).div(100);

        // Execute trade
        // Get sender balance and substract the amount get (including fees)
        console.log("order id", _orderId);
        console.log("amount get", _amountGet);
        console.log("amount give", _amountGive);
        console.log("amount get + fee", _amountGet.add(_feeAmount));
        console.log("total amount token get", tokens[_tokenGet][msg.sender]);
        tokens[_tokenGet][msg.sender] = tokens[_tokenGet][msg.sender].sub(
            _amountGet.add(_feeAmount)
        );

        // Get the user balance and add the previous value
        tokens[_tokenGet][_user] = tokens[_tokenGet][_user].add(_amountGet);

        // Add feeAmount to the feeAccount
        tokens[_tokenGet][feeAccount] = tokens[_tokenGet][feeAccount].add(
            _feeAmount
        );

        // Get user balance and substract the amount get
        tokens[_tokenGive][_user] = tokens[_tokenGive][_user].sub(_amountGive);

        // Get the sender balance and add the previous value
        tokens[_tokenGive][msg.sender] = tokens[_tokenGive][msg.sender].add(
            _amountGive
        );

        emit Trade(
            _orderId,
            _user,
            _tokenGet,
            _amountGet,
            _tokenGive,
            _amountGive,
            msg.sender,
            block.timestamp
        );
    }

    function getEtherBalanceByAddress(
        address _address
    ) public view returns (uint256) {
        return tokens[ETHER][_address];
    }

    function getTokenBalanceByAddress(
        address _address,
        address tokenAddress
    ) public view returns (uint256) {
        return tokens[tokenAddress][_address];
    }
}
