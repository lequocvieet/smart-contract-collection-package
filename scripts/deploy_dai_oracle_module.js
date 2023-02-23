const hre = require("hardhat");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");


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


    //Deploy OSM contract
    OSM = await hre.ethers.getContractFactory("OSM");
    osm = await OSM.deploy(median.address);
    await osm.deployed();
    console.log("OSM deploy at:", osm.address)


    //Deploy Vat 
    Vat = await hre.ethers.getContractFactory("Vat");
    vat = await Vat.deploy();
    await vat.deployed();
    console.log("Vat deploy at:", vat.address)

    //Deploy Spot
    Spot = await hre.ethers.getContractFactory("Spotter");
    spot = await Spot.deploy(vat.address)
    await spot.deployed();
    console.log("Spot deploy at:", spot.address)

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
        [ethers.utils.parseEther("400"), 1002, priceType])
    console.log("hash1:", hash1)
    //Sign
    const signature1 = await account1.signMessage(ethers.utils.arrayify(hash1))
    console.log("Signature1:", signature1)
    // For Solidity, we need the expanded-format of a signature
    let sig1 = ethers.utils.splitSignature(signature1);

    //Hash
    let hash2 = ethers.utils.solidityKeccak256(['uint256', 'uint256', 'bytes32'], [ethers.utils.parseEther("450"), 1004, priceType])
    console.log("hash2:", hash2)
    //Sign
    const signature2 = await account2.signMessage(ethers.utils.arrayify(hash2))
    console.log("Signature2:", signature2)
    let sig2 = ethers.utils.splitSignature(signature2);

    //Hash
    let hash3 = ethers.utils.solidityKeccak256(['uint256', 'uint256', 'bytes32'], [ethers.utils.parseEther("500"), 1009, priceType])
    console.log("hash3:", hash3)
    //Sign
    const signature3 = await account3.signMessage(ethers.utils.arrayify(hash3))
    console.log("Signature3:", signature3)
    let sig3 = ethers.utils.splitSignature(signature3);


    //Set bar
    await median.connect(account0).setBar(3)
    //Call poke() from median to set value
    let hash = await median.testHash(ethers.utils.parseEther("500"), 1002)
    console.log("hash", hash)
    await median.connect(account0).poke([ethers.utils.parseEther("400"), ethers.utils.parseEther("450"), ethers.utils.parseEther("500")], [1002, 1004, 1009], [sig1.v, sig2.v, sig3.v], [sig1.r, sig2.r, sig3.r], [sig1.s, sig2.s, sig3.s])


    //Kiss() to add account0 to whitelist=> have permission to read value
    await median.kiss(account0.address);

    //Now get latest price after 3 called of 3 oracle
    newOraclePrice = await median.connect(account0).peek()
    console.log(" New Update oracle Price:", newOraclePrice[0])


    //OSM get price from median
    //Add osm to whitelist
    await median.kiss(osm.address)
    //regularly call poke()
    await osm.connect(account0).poke()
    //Increase time between 2 time call
    await time.increase(10000);
    await osm.connect(account0).poke()

    //Set pricefeed address for spot
    let what = await spot.stringToBytes32("pip")
    await spot.filez(priceType, what, osm.address)
    //Set liquidation ratio 1.5 *10^27 
    let what2 = await spot.stringToBytes32("mat")
    let decimal = ethers.BigNumber.from("150000000000000000000000000")
    await spot.file(priceType, what2, decimal)

    //Add spot to white list
    await osm.kiss(spot.address)
    //Authorize for spot to call vat
    await vat.connect(account0).rely(spot.address)
    //Spot get price from OSM Post to Vat
    await spot.poke(priceType)

    //Check eventually price at Vat
    let spotPrice = await vat.getIlkSpotPrice(priceType)
    console.log("spot price", spotPrice)

}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
