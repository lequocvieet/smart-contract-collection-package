const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    //Deploy Median contract
    Median = await hre.ethers.getContractFactory("Median");
    var [account0, account1, account2, account3] = await ethers.getSigners();

    console.log("contract owner", account0.address)
    console.log("account1", account1.address)
    console.log("account2", account2.address)
    console.log("account3", account3.address)

    median = await Median.deploy();
    await median.deployed();
    console.log("Median deploy at:", median.address)

    //Deploy dsValue contract to get address src for OSM contract
    DSValue = await hre.ethers.getContractFactory("DSValue");
    dsvalue = await DSValue.deploy();
    await dsvalue.deployed();
    console.log("DSValue deploy at:", dsvalue.address)


    //Deploy OSM contract
    OSM = await hre.ethers.getContractFactory("OSM");
    osm = await OSM.deploy(dsvalue.address);
    await osm.deployed();
    console.log("OSM deploy at:", osm.address)


    //Authorized for account 1 have permission to set Value
    //Implement DSAuthority interface to bypass Authorize check to call setAuthority func
    DSAuthorityImpl = await hre.ethers.getContractFactory("DSAuthorityImpl");
    fake_authorize = await DSAuthorityImpl.deploy(1);//1==true
    await fake_authorize.deployed();
    console.log("DSAuthorityImpl deploy at:", fake_authorize.address)
    await dsvalue.connect(account0).setAuthority(fake_authorize.address)
    //now any account can set value


    //Manually set Price for DsValue contract using account1
    let value = ethers.utils.formatBytes32String("32")
    await dsvalue.connect(account1).poke(value)
    currentPrice = await dsvalue.peek()
    console.log("Current price", ethers.utils.parseBytes32String(currentPrice[0]))



    //Auth to for some account permission to call lift
    tx = await median.connect(account0).rely(account1.address)
    tx2 = await median.connect(account0).rely(account2.address)
    tx3 = await median.connect(account0).rely(account3.address)

    //Now call lift() to add an account become trusting oracle
    await median.connect(account0).lift([account1.address, account2.address, account3.address])



    //Trusted oracle must sign message before verify on-chain
    //val, age,wat
    //oracle 1 price=1650
    //oracle 2 price =1651
    //oracle 3 price=1653
    //Hash
    let priceType = await median.getWat()
    console.log("priceType:", priceType)
    let hash1 = ethers.utils.solidityKeccak256(['uint256', 'uint256', 'bytes32'],
        [1650, 1002, priceType])
    console.log("hash1:", hash1)
    //Sign
    const signature1 = await account1.signMessage(ethers.utils.arrayify(hash1))
    console.log("Signature1:", signature1)
    // For Solidity, we need the expanded-format of a signature
    let sig1 = ethers.utils.splitSignature(signature1);

    //Hash
    let hash2 = ethers.utils.solidityKeccak256(['uint256', 'uint256', 'bytes32'], [1652, 1004, priceType])
    console.log("hash2:", hash2)
    //Sign
    const signature2 = await account2.signMessage(ethers.utils.arrayify(hash2))
    console.log("Signature2:", signature2)
    let sig2 = ethers.utils.splitSignature(signature2);

    //Hash
    let hash3 = ethers.utils.solidityKeccak256(['uint256', 'uint256', 'bytes32'], [1657, 1009, priceType])
    console.log("hash3:", hash3)
    //Sign
    const signature3 = await account3.signMessage(ethers.utils.arrayify(hash3))
    console.log("Signature3:", signature3)
    let sig3 = ethers.utils.splitSignature(signature3);


    //Set bar
    await median.connect(account0).setBar(3)
    //Call poke() from median to set value
    let hash = await median.testHash(1650, 1002)
    console.log("hash", hash)
    await median.connect(account0).poke([1650, 1652, 1657], [1002, 1004, 1009], [sig1.v, sig2.v, sig3.v], [sig1.r, sig2.r, sig3.r], [sig1.s, sig2.s, sig3.s])


    //Kiss() to add account0 to whitelist=> have permission to read value
    await median.kiss(account0.address);


    //Now get latest price after 3 called of 3 oracle
    newOraclePrice = await median.connect(account0).peek()
    console.log(" New Update oracle Price:", newOraclePrice[0])




}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
