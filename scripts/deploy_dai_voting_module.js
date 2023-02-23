const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    //Setup account 
    var [account0, account1, account2, account3, account4, account5] = await ethers.getSigners();

    console.log("contract owner", account0.address)
    console.log("account1", account1.address)
    console.log("account2", account2.address)
    console.log("account3", account3.address)
    console.log("account4", account4.address)
    console.log("account5", account5.address)

    //Deploy GOV token
    DSToken = await hre.ethers.getContractFactory("DSToken");
    govToken = await DSToken.deploy("GOV");
    await govToken.deployed();
    console.log("GOVToken deploy at:", govToken.address)

    //Deploy IOU voting representation token
    iouToken = await DSToken.deploy("IOU");
    await iouToken.deployed();
    console.log("IOUToken deploy at:", iouToken.address)

    //MAX_YAYS Maximum number of candidates a slate can hold.
    const MAX_YAYS = 10

    //Deploy DSChief  contract
    DSChief = await hre.ethers.getContractFactory("DSChief");
    dschief = await DSChief.deploy(govToken.address, iouToken.address, MAX_YAYS);
    await dschief.deployed();
    console.log("DSChief deploy at:", dschief.address)


    //Deploy VoteProxy contract
    VoteProxy = await hre.ethers.getContractFactory("VoteProxy");
    //account1 and account2 works as cold and hot wallet
    vote_proxy = await VoteProxy.deploy(dschief.address, account1.address, account2.address);
    await vote_proxy.deployed();
    console.log("VoteProxy deploy at:", vote_proxy.address)

    //Deploy DSRoles contract an implement of authority for DSAuth contract
    DSRoles = await hre.ethers.getContractFactory("DSRoles");
    ds_roles = await DSRoles.deploy()
    await ds_roles.deployed();
    console.log("DSRoles deploy at:", ds_roles.address)

    //Grant  authorized permission for cold wallet==account1
    await ds_roles.connect(account0).setRootUser(account1.address, true);



    //Fund 100 GOV token to cold wallet==account1
    await govToken.connect(account0).setAuthority(ds_roles.address)
    await govToken.connect(account1).mint(100)
    var coldWalletBalance = await govToken.connect(account1).getBalance();
    console.log("Cold Wallet Balance", coldWalletBalance)


    //-------------------------------------Start logic-----------------------------------
    //account1 is cold wallet of account3
    //account2 is hot wallet of account3
    //account3 is voter
    //account4 and account5 is candidates 

    //Choose candidates into list of slate
    //Calller must be hot and cold wallet
    let candidates = []
    candidates.push(account4.address)
    candidates.push(account5.address)
    console.log("candidates", candidates)
    await vote_proxy.connect(account1).vote(candidates)


    //GOV & IOU token must approve for vote_proxy permission 
    //to call pull() and and mint() that require transfer
    await govToken.connect(account1).approve_max(vote_proxy.address)
    await iouToken.connect(account1).approve_max(vote_proxy.address)

    //lock 10 GOV token
    //Grant permission for chief contract to call mintz 
    await ds_roles.connect(account0).setRootUser(dschief.address, true);
    await iouToken.connect(account0).setAuthority(ds_roles.address)
    await vote_proxy.connect(account1).lock(10)

    //check weight deposit 


    //Proposed account5 become a next chief
    await dschief.lift(account5.address)

    //get Current chief ==account5
    let current_chief = await dschief.getCurrentChief();
    console.log("Current chief", current_chief)

}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
