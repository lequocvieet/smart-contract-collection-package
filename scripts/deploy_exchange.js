const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    //Deploy Exchange contract
    Exchange = await hre.ethers.getContractFactory("Exchange");
    var [account0, account1, account2, account3] = await ethers.getSigners();

    console.log("contract owner", account0.address)
    console.log("account1", account1.address)
    console.log("account2", account2.address)
    console.log("account3", account3.address)

    exchange = await Exchange.deploy(account1.address, 1);
    await exchange.deployed();

    console.log("Exchange deploy at:", exchange.address)


    //deploy USDT mock
    const ERC20Mock = await hre.ethers.getContractFactory("ERC20Mock");
    USDTMock = await ERC20Mock.deploy("USDT Mock", "USDT")
    await USDTMock.deployed();
    console.log("USDTMock deploy at:", USDTMock.address)


    //deploy USDC mock
    USDCMock = await ERC20Mock.deploy("USDC Mock", "USDC")
    await USDCMock.deployed();

    console.log("USDCMock deploy at:", USDCMock.address)

    //set up varaible
    var etherAccount1Deposit = 5;
    var USDTAccount2Deposit = 10;

    //send 100 USDT ,100 USDC to account2 & account3
    await USDTMock.mint(account3.address)
    await USDCMock.mint(account2.address)
    var account2Balance = await USDCMock.getBalance(account2.address)
    var account3Balance = await USDTMock.balanceOf(account3.address)

    console.log("account2Balance", account2Balance)
    console.log("account3Balance", account3Balance)


    //account1 deposit 5 ether
    tx = await exchange.connect(account1).depositEther({ value: ethers.utils.parseEther(etherAccount1Deposit.toString()) })
    var etherBalanceDeposit = await exchange.getEtherBalanceByAddress(account1.address)

    console.log("EtherBalanceDeposit", ethers.utils.formatEther(etherBalanceDeposit))

    //account2 deposit  10 USDC
    //approve permission for exchange contract permission to call internal TransferFrom function
    await USDCMock.connect(account2).approve(exchange.address, ethers.utils.parseEther('10.0'))
    tx = await exchange.connect(account2).depositToken(USDCMock.address, ethers.utils.parseEther('10.0'))
    var usdcBalanceDeposit = await exchange.getTokenBalanceByAddress(account2.address, USDCMock.address)
    console.log("usdcBalanceDeposit", usdcBalanceDeposit)


    //account3 deposit USDC
    await USDTMock.connect(account3).approve(exchange.address, ethers.utils.parseEther('10.0'))
    tx = await exchange.connect(account3).depositToken(USDTMock.address, ethers.utils.parseEther('10.0'))
    var usdtBalanceDeposit = await exchange.getTokenBalanceByAddress(account3.address, USDTMock.address)
    console.log("usdtBalanceDeposit", usdtBalanceDeposit)

    //account2 create order 2  USDC to USDT
    //buy 1USDT using 1USDC
    await exchange.connect(account2).makeOrder(USDTMock.address, ethers.utils.parseEther('1.0'), USDCMock.address, ethers.utils.parseEther('1.0'))

    //account3 fill order2
    await exchange.connect(account3).fillOrder(1)

    //check balance after fill order
    //account2 should get 1USDT and account3 should get 1USDC
    var usdtBalanceAccount2After = await exchange.getTokenBalanceByAddress(account2.address, USDTMock.address)
    console.log("usdtBalanceAccount2After", usdtBalanceAccount2After)


}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});