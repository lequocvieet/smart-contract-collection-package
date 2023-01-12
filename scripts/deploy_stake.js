const hre = require("hardhat");
const { ethers } = require("hardhat");
const { EpochTimeToDate } = require("../test/helper-function/helper-function")
const { time } = require("@nomicfoundation/hardhat-network-helpers");

async function main() {
    //..............................SET UP......................................
    //SetUp account
    var [account0, account1, account2, account3] = await ethers.getSigners();

    //account0 will be contract onwer of all contract
    console.log("contract owner", account0.address)
    console.log("account1", account1.address)
    console.log("account2", account2.address)
    console.log("account3", account3.address)

    //Get ERC20 Contract
    const ERC20Mock = await hre.ethers.getContractFactory("ERC20Mock");

    //Deploy USDT mock
    const USDTMock = await ERC20Mock.deploy("USDT Mock", "USDT")
    await USDTMock.deployed();
    console.log("USDTMock deploy at:", USDTMock.address)

    //Deploy USDC mock
    const USDCMock = await ERC20Mock.deploy("USDC Mock", "USDC")
    await USDCMock.deployed();
    console.log("USDCMock deploy at:", USDCMock.address)


    //Deploy stake contract
    //USDT is Stake token and USDC is Reward token
    const Staking = await ethers.getContractFactory("Staking");
    const stake = await Staking.deploy(USDTMock.address, USDCMock.address);
    await stake.deployed();
    console.log("Stake contract deployed at:", stake.address)

    //Fund 100 USDC to stake contract address
    await USDCMock.connect(account0).mint(stake.address)
    var totalSupply = await USDCMock.getBalance(stake.address)
    console.log("Total USDC contract stake has:", ethers.utils.formatEther(totalSupply))

    //Fund 100 USDT for account1 prepare before stake
    await USDTMock.connect(account0).mint(account1.address)
    var account1Balance = await USDTMock.getBalance(account1.address)
    console.log("Balance USDT  accoun1", ethers.utils.formatEther(account1Balance))

    //approve permission for Stake contract to transfer 10 USDT from sender to stake address
    await USDTMock.connect(account1).approve(stake.address, ethers.utils.parseEther('10.0'))

    //......................................START LOGIC...................................


    //Set Duration reward will be pay out
    // ex:  120 seconds  
    //Update time reward will start caculate at this time
    await stake.connect(account0).setRewardsDuration(120);
    var duration = await stake.getDuration();
    console.log("duration", duration)


    //Notify Reward amount
    //Contract extract from total supply an amount of USDC as a pool reward in a duration above 
    //50 USDC will be pay out in 10 seconds for anyone staked
    await stake.connect(account0).notifyRewardAmount(ethers.utils.parseEther("50.0"))
    var updateRewardTime = await stake.getUpdateTime();
    console.log("Update reward time ", EpochTimeToDate(updateRewardTime));

    var finishTime = await stake.getFinishTime();
    console.log("finish epoch time ", finishTime);
    console.log("Finish stake reward time ", EpochTimeToDate(finishTime));

    var rewardRate = await stake.getRewardRate();
    console.log("reward rate", rewardRate);



    //Account1 Stake 10 USDT 
    await stake.connect(account1).stake(ethers.utils.parseEther("10.0"));
    var d = new Date(Date.now())
    console.log("Start stake" + d.toString())


    //Check balance staked
    var balanceAccount1Staked = await stake.getBalanceStaked(account1.address)
    console.log("balance Account1 Staked ", ethers.utils.formatEther(balanceAccount1Staked));


    //Check earned money during stake time
    console.log("First Earned at:" + (new Date(Date.now())).toString())
    var earned = await stake.earned(account1.address)
    console.log("earned ", ethers.utils.formatEther(earned));


    //check earned money after 10s stake 
    await time.increase(10);
    var earnedAfter10s = await stake.earned(account1.address)
    console.log("earned after 10s stake", ethers.utils.formatEther(earnedAfter10s));

    //Get reward USDC to account1
    await stake.connect(account1).getReward();

    //Check USDC balance in account1
    var account1Balance = await USDCMock.getBalance(account1.address)
    console.log("Balance USDC  accoun1", ethers.utils.formatEther(account1Balance))

    //Withdraw 5 in total 10 USDT staked
    await stake.connect(account1).withdraw(ethers.utils.parseEther("5.0"))

    //Check USDT balance after withdraw
    var account1Balance = await USDTMock.getBalance(account1.address)
    console.log("Balance USDT  accoun1", ethers.utils.formatEther(account1Balance))


}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});