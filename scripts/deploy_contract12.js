const hre = require("hardhat");

async function main() {


   Contract2 = await hre.ethers.getContractFactory("Contract2");
   contract2 = await Contract2.deploy();
   await contract2.deployed();
   console.log("Contract2 deploy at:",contract2.address)

   Contract1 = await hre.ethers.getContractFactory("Contract1");
   contract1 = await Contract1.deploy(contract2.address);
   await contract1.deployed();
   console.log("Contract1 deploy at:",contract1.address)

   tx=await contract1.testSameBlockNumber();
   console.log("tx",tx);


}
 

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
