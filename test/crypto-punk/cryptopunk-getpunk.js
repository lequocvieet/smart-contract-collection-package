const { expect } = require("chai");
const { ethers } = require("hardhat");
var assert = require('assert')
const { expectThrow, compareBalance } = require("../helper-function/helper-function")
require("@nomiclabs/hardhat-waffle");

describe("CryptoPunk Get punk", function () {
    beforeEach(async function () {
        //set up variables test
        [account0, account1, account2, account3] = await ethers.getSigners();
        //Deploy CryptoPunksMarket contracts
        CryptoPunksMarket = await hre.ethers.getContractFactory("CryptoPunksMarket")
        cryptoPunksMarket = await CryptoPunksMarket.deploy();
        await cryptoPunksMarket.deployed();
    });

    it("can not get punks while allPunksAssigned = false", async function () {
        var allPunksAssigned=await cryptoPunksMarket.getAllPunksAssignedValue();
        assert.equal(false, allPunksAssigned, "allAssigned should be false to start.");
        await expectThrow(cryptoPunksMarket.connect(account1).getPunk(1), "All punks must be assigned")
    });

    it("can get a punk but no one else can get it after", async function () {
    
        await cryptoPunksMarket.connect(account0).allInitialOwnersAssigned();
        await cryptoPunksMarket.connect(account1).getPunk(0);
        var owner = await cryptoPunksMarket.getAddressByPunkIndex(0);
        assert.equal(owner, account1.address, "Ownership array wrong");
        
        var remaining = await cryptoPunksMarket.getPunkRemainToAssign();
        assert.equal(9999, remaining);
        //cannot get punk later => cause revert
        await expectThrow( cryptoPunksMarket.connect(account1).getPunk(0),"Punk has claimed before");
    
      })
});