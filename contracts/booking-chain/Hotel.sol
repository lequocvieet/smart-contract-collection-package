// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./RoomNFT.sol";

contract Hotel is ReentrancyGuard {
    uint256 public listRoomCount;
    ListRoom[] public listRooms;
    RoomNFT public nft; // address of nft contract

    constructor(address _nftAddress) {
        nft = RoomNFT(_nftAddress);
    }

    struct ListRoom {
        uint256 listRoomId;
        address payable owner;
    }

    mapping(uint256 => uint256) public tokenIdToRoomId;
    mapping(uint256 => ListRoom) public listRoomIdToListRoom;
    mapping(uint256 => bool) public tokenIdToRoomNFTState;

    event CreateListRoom(
        uint256 listRoomId,
        address indexed owner,
        uint256 timestamp
    );

    event DeleteListRoom(address indexed deleter, uint256 timestamp);

    event BookRoom(
        uint256 numberOfdates, // number of dates book
        uint256 startTokenId,
        address indexed booker,
        uint256 timestamp
    );

    event CancelBookRoom(
        uint256[] tokenIds,
        address indexed canceler,
        uint256 timestamp
    );

    event CheckIn(
        uint256[] tokenIds,
        address indexed checker,
        uint256 timestamp
    );

    event CheckOut(uint256 timestamp);

    event RequestPayment(address requester, uint256 price);

    event TranferRoomNFT(address from, address to, uint256[] tokenIds);

    function createListRoom() external nonReentrant {
        ListRoom memory listRoom;
        listRoomCount++;
        listRoom.listRoomId = listRoomCount;
        listRoom.owner = payable(msg.sender);
        listRooms.push(listRoom);
        emit CreateListRoom(listRoomCount, msg.sender, block.timestamp);
    }

    function deleteListRoom(uint256 _listRoomId) external nonReentrant {
        for (uint256 i = 0; i < listRooms.length; i++) {
            if (listRooms[i].listRoomId == _listRoomId) {
                delete listRooms[i]; //delete listRoom in listRoom array
                break;
            }
        }
        emit DeleteListRoom(msg.sender, block.timestamp);
    }

    function bookRoom(
        // booker call this function
        uint256 _totalPrice, //Total price after caculated by days*price1day*fee at backend
        uint256 _numberOfdates // number of dates book
    ) external payable nonReentrant {
        require(msg.value >= _totalPrice, "not enough ether to book this room");
        uint256 startTokenId = nft.safeMintBatch(
            msg.sender,
            _numberOfdates //mint a batch of nft
        );
        uint256 count = startTokenId;
        for (uint256 i = 0; i < _numberOfdates; i++) {
            tokenIdToRoomNFTState[count] = true;
            count++;
        }
        emit BookRoom(
            _numberOfdates,
            startTokenId,
            msg.sender,
            block.timestamp
        );
        //update state room at backend after received bookroom event
    }

    function cancelBookRoom(
        // canceler nft will call this function
        uint256[] memory _tokenIds,
        uint256 _price
    ) public payable {
        // check room is booked at backend
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            nft.burn(_tokenIds[i]);
        }
        payable(msg.sender).transfer(_price); //repay room price for canceler
        emit CancelBookRoom(_tokenIds, msg.sender, block.timestamp);
        // catch event delete roomNFT off-chain
    }

    function checkIn(uint256[] memory _tokenIds) public payable {
        //check valid time checkin at backend
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            address owner = nft.ownerOf(_tokenIds[i]);
            require(owner == msg.sender, "You are not owner of this nft");
            require(
                tokenIdToRoomNFTState[_tokenIds[i]],
                "Your NFT not available to checkIn"
            );
            tokenIdToRoomNFTState[_tokenIds[i]] = false; // now NFT is un available
        }
        emit CheckIn(_tokenIds, msg.sender, block.timestamp);
    }

    function tranferRoomNFT(uint256[] memory _tokenIds, address _receiver)
        public
    {
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            nft.transferFrom(msg.sender, _receiver, _tokenIds[i]);
        }
    emit TranferRoomNFT(msg.sender, _receiver, _tokenIds);
    }

    function checkOut() public {
        emit CheckOut(block.timestamp);
    }

    function requestPayment(uint256 _totalPrice) public payable {
        //check valid  day at backend
        payable(msg.sender).transfer(_totalPrice);
        emit RequestPayment(msg.sender, _totalPrice);
    }

    function getOwnerOf(uint256 _tokenId) public view returns (address) {
        return nft.ownerOf(_tokenId);
    }

    function getListRooms() public view returns (ListRoom[] memory) {
        return listRooms;
    }

    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function getAccountBalance() public view returns (uint256) {
        return msg.sender.balance;
    }
}
