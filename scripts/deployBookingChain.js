const hre = require("hardhat");

async function main() {
   //Deploy 2 contracts
   RoomNFT = await hre.ethers.getContractFactory("RoomNFT");
   roomNFT = await RoomNFT.deploy();
   await roomNFT.deployed();

   Hotel = await hre.ethers.getContractFactory("Hotel");
   hotel = await Hotel.deploy(roomNFT.address);
   await hotel.deployed();

   console.log("Hotel deploy at:",hotel.address)
   console.log("RoomNFT deploy at:",roomNFT.address)
}
 

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
