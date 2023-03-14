const hre = require("hardhat");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

async function main() {
    //Setup account 
    var [account0, account1, account2, account3, account4, account5, account10, account11, account12] = await ethers.getSigners();

    console.log("contract owner", account0.address)
    console.log("account1", account1.address)
    console.log("account2", account2.address)
    console.log("account3", account3.address)
    console.log("account4", account4.address)
    console.log("account5", account5.address)
    console.log("account10", account10.address)
    console.log("account11", account11.address)
    console.log("account12", account12.address)

    //---------------------------------SET UP ORACLE PRICE------------------------
    //Deploy Median contract
    Median = await hre.ethers.getContractFactory("Median");
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
    //oracle 1 price=400
    //oracle 2 price =450
    //oracle 3 price=500
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
    console.log(" New Update oracle Price:   Next oracle Price", newOraclePrice[0])


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
    let decimal = ethers.BigNumber.from("1500000000000000000000000000")
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

    //-------------------------------ADD BAT COLLATERAL to VAT----------------

    //Deploy collateral BAT
    DSToken = await hre.ethers.getContractFactory("contracts/stable-coin/dai/liquidation-auction-module/token.sol:DSToken");
    bat = await DSToken.deploy("BAT");
    await bat.deployed();
    console.log("BAT deploy at:", bat.address)


    //Deploy Dai(DSToken) for using in DaiJoin
    Dai = await hre.ethers.getContractFactory("contracts/stable-coin/dai/liquidation-auction-module/token.sol:DSToken");
    dai = await DSToken.deploy("DAI");
    await dai.deployed();
    console.log("DAI deploy at:", dai.address)

    //Deploy gemJoin contract
    GemJoin = await hre.ethers.getContractFactory("contracts/stable-coin/dai/liquidation-auction-module/join.sol:GemJoin");
    gemJoin = await GemJoin.deploy(vat.address, priceType, bat.address);
    await gemJoin.deployed();
    console.log("GemJoin deploy at:", gemJoin.address)


    //Deploy DSRoles contract an implement of authority for DSAuth contract
    DSRoles = await hre.ethers.getContractFactory("DSRoles");
    ds_roles = await DSRoles.deploy()
    await ds_roles.deployed();
    console.log("DSRoles deploy at:", ds_roles.address)

    //Grant  authorized permission for account1
    await ds_roles.setRootUser(account1.address, true);

    //Fund 100 BAT to account1
    await bat.setAuthority(ds_roles.address)
    await bat.connect(account1).mint(ethers.utils.parseEther("100"))
    var account1Balance = await bat.connect(account1).getBalance();
    console.log("Account1 Balance", account1Balance)


    //bat must approve for gemJoin permission 
    //to call mint() that require transfer
    await bat.connect(account1).approve_max(gemJoin.address)

    //Authorize for gemJoin to call vat
    await vat.connect(account0).rely(gemJoin.address)

    //Account 1 add 50 BAT collateral
    //await gemJoin.connect(account1).join(bat.address, ethers.utils.parseEther("50"))



    //--------------------OPEN VAULT ADD COLLATERAL USE DS-PROXY--------------------

    //Deploy DssProxyActions contract
    DssProxyActions = await hre.ethers.getContractFactory("DssProxyActions");
    dssProxyActions = await DssProxyActions.deploy()
    await dssProxyActions.deployed();
    console.log("DssProxyActions deploy at:", dssProxyActions.address)


    //Deploy manager to implement managerLike interface
    DssCdpManager = await hre.ethers.getContractFactory("DssCdpManager");
    dssCdpManager = await DssCdpManager.deploy(vat.address)
    await dssCdpManager.deployed()
    console.log("DssCdpManager deploy at:", dssCdpManager.address)

    //Deploy jug.sol(rate module) to implement jugLike interface
    Jug = await hre.ethers.getContractFactory("Jug");
    jug = await Jug.deploy(vat.address)
    await jug.deployed()
    console.log("Jug deploy at:", jug.address)


    //Deploy ETHJoin 
    ETHJoin = await hre.ethers.getContractFactory("ETHJoin");
    ethJoin = await ETHJoin.deploy(vat.address, priceType)
    await ethJoin.deployed()
    console.log("ETHJoin deploy at:", ethJoin.address)




    //Deploy DaiJoin contract
    DaiJoin = await hre.ethers.getContractFactory("contracts/stable-coin/dai/liquidation-auction-module/join.sol:DaiJoin");
    daiJoin = await DaiJoin.deploy(vat.address, dai.address)
    await daiJoin.deployed()
    console.log("DaiJoin deploy at:", daiJoin.address)



    //Approve for DssProxy action permission transfer BAT
    await bat.connect(account1).approve_max(dssProxyActions.address)


    //Authorize for jug to call vat
    await vat.connect(account0).rely(jug.address)

    //init duty(stability fee for each ilk) & rho(last drip call ) in jug
    await jug.init(priceType)

    //set base(Global, per-second stability fee)
    base = await jug.stringToBytes32("base")
    await jug.file_base(base, 0)

    //Init rate in Vat
    await vat.connect(account0).init(priceType);

    //Set debt ceiling for BAT(line) and debt ceiling for all collateral(Line)
    //Total collateral ceiling debt is 900 DAI in 10^45 uint
    Line = await vat.stringToBytes32("Line")
    let decimal_Line = ethers.BigNumber.from("900000000000000000000000000000000000000000000000")
    await vat.connect(account0).file_Line(Line, decimal_Line)
    //Ceiling debt for BAT will be 700 DAI
    line = await vat.stringToBytes32("line")
    let decimal_line = ethers.BigNumber.from("700000000000000000000000000000000000000000000000")
    await vat.connect(account0).file(priceType, line, decimal_line)


    //Lock Bat token and mint Dai to user 
    //Authorize for daiJoin.sol permission to call mint
    await ds_roles.connect(account0).setRootUser(daiJoin.address, true);
    await dai.connect(account0).setAuthority(ds_roles.address)

    //Lock 1.5 BAT and draw Dai
    await dssProxyActions.connect(account1).openLockGemAndDraw(
        dssCdpManager.address, jug.address, gemJoin.address,
        daiJoin.address, priceType, ethers.utils.parseEther("1.5"), ethers.utils.parseEther("400"), true);


    //Deploy dog.sol liquidation contract
    Dog = await hre.ethers.getContractFactory("Dog");
    dog = await Dog.deploy(vat.address)
    await dog.deployed();
    console.log("Dog deploy at:", dog.address)

    //Get urn
    let urn = await dssCdpManager.getUrn(1);
    console.log("urn", urn);


    //----------------------------------------Decrease Spot Price------------------------
    //----------------------------------------Trigger Liquidation--------------------------

    //Auth to for some account permission to call lift
    tx = await median.connect(account0).rely(account10.address)
    tx2 = await median.connect(account0).rely(account11.address)
    tx3 = await median.connect(account0).rely(account12.address)

    //Now call lift() to add an account become trusting oracle
    await median.connect(account0).lift([account10.address, account11.address, account12.address])
    //Trusted oracle must sign message before verify on-chain
    //val, age,wat
    //oracle 4 price=100
    //oracle 5 price =150
    //oracle 6 price=200
    //Hash
    let hash4 = ethers.utils.solidityKeccak256(['uint256', 'uint256', 'bytes32'],
        [ethers.utils.parseEther("100"), 1000000000000000, priceType])
    console.log("hash4:", hash4)
    //Sign
    const signature4 = await account10.signMessage(ethers.utils.arrayify(hash4))
    console.log("Signature4:", signature4)
    // For Solidity, we need the expanded-format of a signature
    let sig4 = ethers.utils.splitSignature(signature4);

    //Hash
    let hash5 = ethers.utils.solidityKeccak256(['uint256', 'uint256', 'bytes32'], [ethers.utils.parseEther("150"), 200000000000000, priceType])
    console.log("hash5:", hash5)
    //Sign
    const signature5 = await account11.signMessage(ethers.utils.arrayify(hash5))
    console.log("Signature5:", signature5)
    let sig5 = ethers.utils.splitSignature(signature5);

    //Hash
    let hash6 = ethers.utils.solidityKeccak256(['uint256', 'uint256', 'bytes32'], [ethers.utils.parseEther("200"), 300000000000000, priceType])
    console.log("hash6:", hash6)
    //Sign
    const signature6 = await account12.signMessage(ethers.utils.arrayify(hash6))
    console.log("Signature6:", signature6)
    let sig6 = ethers.utils.splitSignature(signature6);


    //Set bar
    await median.connect(account0).setBar(3)
    let timestamp = await median.getBlockTimeStamp();
    console.log("time", timestamp)
    //Call poke() from median to set value
    await median.connect(account0).poke([ethers.utils.parseEther("100"), ethers.utils.parseEther("150"), ethers.utils.parseEther("200")], [1000000000000000, 200000000000000, 300000000000000], [sig4.v, sig5.v, sig6.v], [sig4.r, sig5.r, sig6.r], [sig4.s, sig5.s, sig6.s])


    //Kiss() to add account0 to whitelist=> have permission to read value
    await median.kiss(account0.address);

    //Now get latest price after 3 called of 3 oracle
    newOraclePrice = await median.connect(account0).peek()
    console.log(" New Update oracle Price:", newOraclePrice[0])


    //OSM get price from median
    //regularly call poke()
    await time.increase(10000);
    await osm.connect(account0).poke()
    //Increase time between 2 time call
    await time.increase(10000);
    await osm.connect(account0).poke()

    //Spot get price from OSM Post to Vat
    await spot.poke(priceType)

    //Check eventually price at Vat
    let newSpotPrice = await vat.getIlkSpotPrice(priceType)
    console.log("new spot price", newSpotPrice)



    //------------------------------------------Liquidation and Collateral Auction Stage-------------
    
    //Deploy Clip(Collateral Auction)
    Clip =await hre.ethers.getContractFactory("Clipper"); 
    clip=await Clip.deploy(vat.address,spot.address,dog.address,priceType);
    await clip.deployed();
    console.log("Clip deploy at:", clip.address)
    
    
    
    //Deploy Flop(debt Auction)
    Flop =await hre.ethers.getContractFactory("Flopper"); 
    flop=await Flop.deploy(vat.address,bat.address);
    await flop.deployed();
    console.log("Flop deploy at:", flop.address)


    //Deploy Flap(surplus Auction)
    Flap =await hre.ethers.getContractFactory("Flapper"); 
    flap=await Flap.deploy(vat.address,bat.address);
    await flap.deployed();
    console.log("Flap deploy at:", flap.address)


    //Deploy Vow(Maker Balance Sheet)
    Vow =await hre.ethers.getContractFactory("Vow"); 
    vow=await Vow.deploy(vat.address,flap.address,flop.address);
    await vow.deployed();
    console.log("Vow deploy at:", vow.address)


    //init Vow contract for Dog contract
    let vow_what=await dog.stringToBytes32("vow")
    await dog.file_vow(vow_what,vow.address)

    //init Clip contract for Dog contract
    let clip_what=await dog.stringToBytes32("clip")
    await dog.file_clip(priceType,clip_what,clip.address)

    //Auth for dog to call clip
    await clip.rely(dog.address)

    //Auth for Clip to Read  PriceFeed from OSM
    await osm.kiss(clip.address)


    //auth for dog to call vow
    await vow.rely(dog.address)

    //init dust(debt floor)
    //Hardfix dust is 100(minimum Dai Draw)
    let dust=await vat.stringToBytes32("dust")
    let dust_decimal=ethers.BigNumber.from("100000000000000000000000000000000000000000000000")
    await vat.file(priceType,dust,dust_decimal)
    //Setup Hole and hole for an aunction
    let Hole=await dog.stringToBytes32("Hole")
    let hole=await dog.stringToBytes32("hole")
    let chop=await dog.stringToBytes32("chop")
    //10 000 000 Dai(in Wad:10^45)
    let Hole_decimal = ethers.BigNumber.from("10000000000000000000000000000000000000000000000000000")
    let hole_decimal=Hole_decimal
    // chop penalty 1.13 * WAD
    let chop_decimal=ethers.utils.parseEther("1.13")
    await dog.file_Hole(Hole,Hole_decimal)
    await dog.file_hole_chop(priceType,hole,hole_decimal)
    await dog.file_hole_chop(priceType,chop,chop_decimal)
    

    //Authorize for dog to call vat
    await vat.rely(dog.address)
    
    //Call bark() func of dog to start liquidation
    await dog.connect(account0).bark(priceType, urn, account5.address)

    //----------------------------=> Done Start a Collateral Auction-----------------------------



    //-----------------------------USER PARTICIPATE TO BUY COLLATERAL---------------------------
    //Deploy Abacus() contract
    Abacus =await hre.ethers.getContractFactory("LinearDecrease"); 
    abacus=await Abacus.deploy();
    await flop.deployed();
    console.log("Abacus deploy at:", abacus.address)

    //Init abacus for clip
    abacus_what=await clip.stringToBytes32("calc")
    await clip.file_2(abacus_what,abacus.address)

    //Init tail(time elapsed util auction reset)
    //I want this  auction reset after 3600s
    tail_what=await clip.stringToBytes32("tail")
    await clip.file_1(tail_what,3600)

    //SetUp(tau:The number of seconds after the start of the auction where the price will hit 0)
    //tau==auction time
    //The price will decrease linearly along auction time
    //The faster you join auction the more good price position you have
    tau_what=await abacus.stringToBytes32("tau")
    let auction_time=120  //120 second
    await abacus.file(tau_what,auction_time)

    //vat authorize for user and clip by hope()
    await vat.connect(account2).hope(clip.address)

    //Grant  authorized permission for account2
    await ds_roles.setRootUser(account2.address, true);

    //Fund 500Dai to accounnt2
    await dai.setAuthority(ds_roles.address)
    await dai.connect(account2).mint(ethers.utils.parseEther("500"))
    var account2DaiBalance = await dai.connect(account2).getBalance();
    console.log("Account2 Dai Balance", account2DaiBalance)

    //dai must approve for daiJoin permission 
    //to call mint() and burn() that require transfer
    await dai.connect(account2).approve_max(daiJoin.address)


    //Account2 Join 300 Dai to Vat
    await daiJoin.connect(account2).join(account2.address,ethers.utils.parseEther("300"))

    //Dog rely for clip to call dog
    await dog.rely(clip.address)


    //Account2 will participate in Collateral Auction
    //Willling to Buy 1 Bat From 1.5 Bat debt a litter higher than  market price
    //Where market price for Bat is 150$ so I will buy at 200$
    amount_buy_decimal=ethers.utils.parseEther("1")
    //max acceptable amount=spotPrice*1.3 (10^27) 
    max_accept_price=ethers.BigNumber.from("200000000000000000000000000000")
    const emptyByteArray = new Uint8Array(0);
    await clip.connect(account2).take(1,amount_buy_decimal,max_accept_price,account2.address,emptyByteArray)

    //Amount Collateral account2 takes from auction will move to Vat
    //And Account2 can cash out that amount through gemJoin 



}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
