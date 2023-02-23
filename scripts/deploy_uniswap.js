const { ethers, UniswapV2Deployer } = require("hardhat");


async function main() {



    //Setup and deploy
    const overrides = {
        gasLimit: 9999999
    }
    var [account0, account1, account2, account3] = await ethers.getSigners();
    console.log("contract owner", account0.address)
    console.log("account1", account1.address)
    console.log("account2", account2.address)
    console.log("account3", account3.address)


    //Deploy 3 contract 
    const { weth9, factory, router } = await UniswapV2Deployer.deploy(account0)

    console.log("weth9 deployed at:", weth9.address)
    console.log("factory deployed at:", factory.address)
    console.log("router deployed at", router.address)
    //Deploy USDT mock
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock")
    const USDTMock = await ERC20Mock.deploy("USDT Mock", "USDT")
    await USDTMock.deployed();
    console.log("USDTMock deploy at:", USDTMock.address)



    //Deploy USDC mock
    const USDCMock = await ERC20Mock.deploy("USDC Mock", "USDC")
    await USDCMock.deployed();
    console.log("USDCMock deploy at:", USDCMock.address)


    //approve permission for router contract to transfer 10 USDT 
    await USDTMock.approve(router.address, ethers.constants.MaxUint256)
    //approve permission for router
    await weth9.approve(router.address, ethers.constants.MaxUint256)
    //approve permission for router contract to transfer 10 USDC 
    await USDCMock.approve(router.address, ethers.constants.MaxUint256)



    //Fund 100 USDT for account1 prepare before provide liquidity
    await USDTMock.connect(account0).mint(account1.address)
    var account1BalanceUSDT = await USDTMock.getBalance(account1.address)
    console.log("Balance USDT  accoun1", ethers.utils.formatEther(account1BalanceUSDT))

    //Fund 100 USDT for account1 prepare before stake
    await USDCMock.connect(account0).mint(account1.address)
    var account1BalanceUSDC = await USDCMock.getBalance(account1.address)
    console.log("Balance USDC  accoun1", ethers.utils.formatEther(account1BalanceUSDC))

    //---------------------------START LOGIC---------------------------------------
    //Create Pool
    await factory.createPair(USDCMock.address, USDTMock.address)
    const pairAddress = await factory.getPair(USDCMock.address, USDTMock.address)
    console.log("Pool address:", pairAddress)

    //approve pooladdress
    //approve permission for router contract to transfer 10 USDT 
    await USDTMock.approve(pairAddress, ethers.constants.MaxUint256)
    //approve permission for router
    await weth9.approve(pairAddress, ethers.constants.MaxUint256)
    //approve permission for router contract to transfer 10 USDC 
    await USDCMock.approve(pairAddress, ethers.constants.MaxUint256)



    //Account1 provide liquidity USDC/USDT
    //Params: address tokenA,address tokenB,uint amountADesired,uint amountBDesired,
    //uint amountAMin,uint amountBMin,address to,uint deadline
    // tx = await router.connect(account0).addLiquidity(
    //     USDCMock.address,
    //     USDTMock.address,
    //     ethers.utils.parseEther('10.0'),
    //     ethers.utils.parseEther('10.0'),
    //     0,
    //     0,
    //     account1.address,
    //     12432432432002,
    //     overrides
    // )
    // console.log("tx add liquidity:", tx)


    await router.connect(account1).addLiquidityETH(
        USDCMock.address,
        ethers.utils.parseEther('10.0'),
        0,
        0,
        account1.address,
        12432432432002,
        overrides
    )


    // await router.swapExactETHForTokens(
    //     0,
    //     [weth9.address, token.address],
    //     signer.address,
    //     constants.MaxUint256,
    //     { value: eth(1) }
    // )

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});