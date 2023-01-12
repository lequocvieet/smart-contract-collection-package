const { expect } = require("chai");
const { ethers } = require("hardhat");
var assert = require('assert')
const { expectThrow, compareBalance } = require("../helper-function/helper-function")
require("@nomiclabs/hardhat-waffle");

describe("CryptoPunk Set Initial", function () {
    beforeEach(async function () {
        //set up variables test
        [account0, account1, account2, account3] = await ethers.getSigners();
        indexOverflow=1000000;
        //Deploy CryptoPunksMarket contracts
        CryptoPunksMarket = await hre.ethers.getContractFactory("CryptoPunksMarket")
        cryptoPunksMarket = await CryptoPunksMarket.deploy();
        await cryptoPunksMarket.deployed();
    });

    it("Should start with 0 balance", async function () {
        await cryptoPunksMarket.connect(account0).setInitialOwner(account1.address, 0);
        var numberPunkAccount1 = await cryptoPunksMarket.getNumberPunkOfAddress(account1.address);
        assert.equal(numberPunkAccount1, 1, "Didn't get the initial punk");
        var owner = await cryptoPunksMarket.getAddressByPunkIndex(0);
        assert.equal(owner, account1.address, "Ownership array wrong");
        var remaining = await cryptoPunksMarket.getPunkRemainToAssign();
        assert.equal(9999, remaining);
        // todo Set this back to 10000 for final runs
        var assignCoins = 100;
        for (var i = 1; i <= assignCoins; i++) {
            await cryptoPunksMarket.connect(account0).setInitialOwner(account2.address, i);
        }
        var numberPunkAccount2 = await cryptoPunksMarket.getNumberPunkOfAddress(account2.address);
        expect(numberPunkAccount2.sub(assignCoins)).to.equal(0);
    });

    it("can not pass an invalid index to assign initial", async function () {
        await expectThrow(cryptoPunksMarket.connect(account0).setInitialOwner(account1.address, indexOverflow), "Index out of range punks")
    });
    it("only owner can assign initial", async function () {
        //call setInitialOwner using another account
        await expectThrow(cryptoPunksMarket.connect(account1).setInitialOwner(account2.address, 0), "must be contract owner to set initial")

    });
    it("Can not claim punk after set initial owners assigned", async function () {
        await cryptoPunksMarket.connect(account0).allInitialOwnersAssigned();
        //after all initial owner assigned set the setInitialOwner will return error
        await expectThrow(cryptoPunksMarket.connect(account0).setInitialOwner(account1.address, 0), "All punks must not be assigned before")

    });

});