const hre = require("hardhat");

async function main() {
   //Deploy Online test

   OnlineTest = await hre.ethers.getContractFactory("OnlineTest");
   onlineTest = await OnlineTest.deploy();
   await onlineTest.deployed();
   console.log("OnlineTest deploy at:",onlineTest.address)
}
 

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
