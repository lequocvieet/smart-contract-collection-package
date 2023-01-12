const { expect } = require("chai");
const { ethers } = require("hardhat");
require("@nomiclabs/hardhat-waffle");

describe("Test", function () {
  beforeEach(async function () {
    //set up variables test
    [owner, landLord, user1, user2] = await ethers.getSigners();
    bookRoomPrice = 5; // 5 ether
    cancelPrice = 2; //2 ether
    numberOfDatesBook = 4; //4 days
    tokenIds = [0, 1, 2]; //parameter for burn 0,1,2   //parameter for tranfer 0 1 2

    //Deploy 2 contracts
    RoomNFT = await hre.ethers.getContractFactory("RoomNFT");
    roomNFT = await RoomNFT.deploy();
    await roomNFT.deployed();

    Hotel = await hre.ethers.getContractFactory("Hotel");
    hotel = await Hotel.deploy(roomNFT.address);
    await hotel.deployed();

    // Set approval
    await roomNFT.connect(user1).setApprovalForAll(hotel.address, true);
  });

  it("Should create new list room", async function () {
    tx = await hotel.connect(landLord).createListRoom();
    await expect(tx).to.emit(hotel, "CreateListRoom");
  });

  it("Should delete list room", async function () {
    tx = await hotel.connect(landLord).createListRoom();
    let listRooms = await hotel.getListRooms();
    expect(listRooms.length).to.equal(1);
    const listRoomID = listRooms[0].listRoomId;

    tx = await hotel.connect(landLord).deleteListRoom(listRoomID);
    await expect(tx).to.emit(hotel, "DeleteListRoom");
    listRooms = await hotel.getListRooms();
    const owner = listRooms[0].owner;
    expect(owner).to.equal("0x0000000000000000000000000000000000000000");
  });

  it("Should book room", async function () {
    const contractBalanceBefore = await hotel.getContractBalance();
    tx = await hotel.connect(user1).bookRoom(bookRoomPrice, numberOfDatesBook, {
      value: ethers.utils.parseEther(bookRoomPrice.toString()),
    });
    await expect(tx).to.emit(hotel, "BookRoom");
    // .withArgs(
    //   roomId,
    //   numberOfDatesBook,
    //   0,
    //   user1.address,
    //   Date.now(),
    // )
    const contractBalanceAfter = await hotel.getContractBalance();
    expect(
      contractBalanceBefore + ethers.utils.parseEther(bookRoomPrice.toString())
    ).to.equal(contractBalanceAfter);

    for (let index = 0; index < tokenIds.length; index++) {
      //check owner
      expect(await hotel.getOwnerOf(tokenIds[index])).to.equal(user1.address);
    }
  });
  it("Should cancel book room", async function () {
    tx = await hotel.connect(user1).bookRoom(bookRoomPrice, numberOfDatesBook, {
      value: ethers.utils.parseEther(bookRoomPrice.toString()),
    });
    const contractBalanceBefore = await hotel.getContractBalance();
    tx = await hotel
      .connect(user1)
      .cancelBookRoom(
        tokenIds,
        ethers.utils.parseEther(cancelPrice.toString())
      );
    await expect(tx).to.emit(hotel, "CancelBookRoom");
    // .withArgs(
    //   tokenIds,
    //   user1.address,
    //   block.mockTime,

    // )
    const contractBalanceAfter = await hotel.getContractBalance();
    cancelPrice = ethers.utils.parseEther(cancelPrice.toString());
    expect(contractBalanceBefore.sub(contractBalanceAfter)).to.equal(
      cancelPrice
    );
  });

  it("Should checkIn", async function () {
    tx = await hotel.connect(user1).bookRoom(bookRoomPrice, numberOfDatesBook, {
      value: ethers.utils.parseEther(bookRoomPrice.toString()),
    });
    tx = await hotel.connect(user1).checkIn(tokenIds);
    await expect(tx).to.emit(hotel, "CheckIn");
    // .withArgs(
    //   tokenIds,
    //   user1.address,
    //   block.mockTime,

    // )
  });

  it("LandLord should request payment", async function () {
    tx = await hotel.connect(user1).bookRoom(bookRoomPrice, numberOfDatesBook, {
      value: ethers.utils.parseEther(bookRoomPrice.toString()),
    });
    tx = await hotel.connect(user1).checkIn(tokenIds);
    await expect(tx).to.emit(hotel, "CheckIn");
    // .withArgs(
    //   tokenIds,
    //   user1.address,
    //   block.mockTime,

    // )
    const landLordBalanceBefore = await hotel
      .connect(landLord)
      .getAccountBalance();
    tx = await hotel
      .connect(landLord)
      .requestPayment(ethers.utils.parseEther(bookRoomPrice.toString()));
    const landLordBalanceAfter = await hotel
      .connect(landLord)
      .getAccountBalance();
    expect(landLordBalanceAfter.sub(landLordBalanceBefore)).to.lessThanOrEqual(
      ethers.utils.parseEther(bookRoomPrice.toString()) //include fee transaction
    );
  });

  it("should transfer RoomNFT", async function () {
    tx = await hotel.connect(user1).bookRoom(bookRoomPrice, numberOfDatesBook, {
      value: ethers.utils.parseEther(bookRoomPrice.toString()),
    });
    tx = await hotel.connect(user1).tranferRoomNFT(tokenIds, user2.address);
    //tranfer RoomNFT from user1 to user2
    await expect(tx)
      .to.emit(hotel, "TranferRoomNFT")
      .withArgs(user1.address, user2.address, tokenIds);
    for (let index = 0; index < tokenIds.length; index++) {
      //check owner
      expect(await hotel.getOwnerOf(tokenIds[index])).to.equal(user2.address);
    }
  });
});
