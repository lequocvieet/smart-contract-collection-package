const { expect } = require("chai");
const { ethers } = require("hardhat");
var assert = require('assert')
const { expectThrow, compareBalance } = require("../helper-function/helper-function")
require("@nomiclabs/hardhat-waffle");

describe("CryptoPunk Bid", function () {
    beforeEach(async function () {
        //set up variables test
        [account0, account1, account2, account3] = await ethers.getSigners();
        provider = ethers.getDefaultProvider();
        bidValue1 = 10; //10 ether
        bidValue2=5;
        highAcceptBidValue=100;
        acceptBidValue=7;
        offerPunkForSalePrice=4;

        //Deploy CryptoPunksMarket contracts
        CryptoPunksMarket = await hre.ethers.getContractFactory("CryptoPunksMarket")
        cryptoPunksMarket = await CryptoPunksMarket.deploy();
        await cryptoPunksMarket.deployed();
    });

    it("attempt to bid on an unclaimed to punk", async function () {
        await cryptoPunksMarket.connect(account0).allInitialOwnersAssigned();
        await cryptoPunksMarket.connect(account0).getPunk(0);
        await cryptoPunksMarket.connect(account1).getPunk(1);
        await expectThrow(cryptoPunksMarket.connect(account0).enterBidForPunk(2, { value: 1 }), "Unclaimed punk")
    });

    it("attempt to bid on your own punk", async function () {
        await cryptoPunksMarket.connect(account0).allInitialOwnersAssigned();
        await cryptoPunksMarket.connect(account0).getPunk(0);
        await expectThrow(cryptoPunksMarket.connect(account0).enterBidForPunk(0, { value: 1 }), "Cannot bid your own punk");
    });
    it("attempt to bid with zero value", async function () {
        await cryptoPunksMarket.connect(account0).allInitialOwnersAssigned();
        await cryptoPunksMarket.connect(account0).getPunk(0);
        await expectThrow(cryptoPunksMarket.connect(account1).enterBidForPunk(0, { value: 0 }), "Cannot bit with zero value");
    });

    it("do a real bid", async function () {
        await cryptoPunksMarket.connect(account0).allInitialOwnersAssigned();
        await cryptoPunksMarket.connect(account0).getPunk(0);
        tx = await cryptoPunksMarket.connect(account1).enterBidForPunk(0, { value: 1000 });
        await expect(tx).to.emit(cryptoPunksMarket, "PunkBidEntered").withArgs(
            0,
            1000,
            account1.address
        )
    });
    it("wrong address tries to cancel bid", async function () {
        await cryptoPunksMarket.connect(account0).allInitialOwnersAssigned();
        await cryptoPunksMarket.connect(account0).getPunk(0);
        await expectThrow(cryptoPunksMarket.connect(account2).withdrawBidForPunk(0), "caller is not a bidder");
    });
    it("cancel bid", async function () {
        
        await cryptoPunksMarket.connect(account0).allInitialOwnersAssigned();
        await cryptoPunksMarket.connect(account2).getPunk(0);
        await cryptoPunksMarket.connect(account1).enterBidForPunk(0, { value: ethers.utils.parseEther(bidValue1.toString()) });
        var account0BalancePrev = await cryptoPunksMarket.connect(account1).getAccountBalance();
        await cryptoPunksMarket.connect(account1).withdrawBidForPunk(0);
        var account0BalanceAfter = await cryptoPunksMarket.connect(account1).getAccountBalance();
        console.log("account 1 before: ",account0BalancePrev)
        console.log("account 1 after: ",account0BalanceAfter)
        expect(account0BalanceAfter.sub(account0BalancePrev)).to.lessThanOrEqual(
            ethers.utils.parseEther(bidValue1.toString()) //because include transaction fee
          );
        var bid = await cryptoPunksMarket.getPunkBids(0)
        // Make sure bid is cleared
        assert.equal(false, bid[0]);
    });
      it("bid underneath an existing bid", async function () {
        await cryptoPunksMarket.connect(account0).allInitialOwnersAssigned();
        await cryptoPunksMarket.connect(account1).getPunk(0);
        await cryptoPunksMarket.connect(account2).enterBidForPunk(0, { value: ethers.utils.parseEther(bidValue2.toString()) });
        tx=await cryptoPunksMarket.connect(account3).enterBidForPunk(0, { value: ethers.utils.parseEther(bidValue1.toString()) });
        await expect(tx).to.emit(cryptoPunksMarket, "PunkBidEntered").withArgs(
            0,
            ethers.utils.parseEther(bidValue1.toString()),
            account3.address
        )
    });
      it("outbid", async function () {
        await cryptoPunksMarket.connect(account0).allInitialOwnersAssigned();
        await cryptoPunksMarket.connect(account1).getPunk(0);
        await cryptoPunksMarket.connect(account2).enterBidForPunk(0, { value: ethers.utils.parseEther(bidValue2.toString()) });
        var amountBefore=await cryptoPunksMarket.getPendingWithdrawals(account2.address)
        await cryptoPunksMarket.connect(account3).enterBidForPunk(0, { value: ethers.utils.parseEther(bidValue1.toString()) });
        var amountAfter=await cryptoPunksMarket.getPendingWithdrawals(account2.address)
        //make sure account2 was refund because account3 bid with higher value
        expect(amountAfter.sub(amountBefore)).to.equal(ethers.utils.parseEther(bidValue2.toString()));
        //make sure with draw works
        await cryptoPunksMarket.connect(account2).withdraw();
        var newAmount = await cryptoPunksMarket.getPendingWithdrawals(account2.address);
        assert.equal(0, newAmount);
      });
      it("wrong owner tries to accept bid", async function () {
        await cryptoPunksMarket.connect(account0).allInitialOwnersAssigned();
        await cryptoPunksMarket.connect(account1).getPunk(0);
        await expectThrow(cryptoPunksMarket.connect(account3).acceptBidForPunk(1, 3000),"you not own this punk");
      });
      it("try to accept bid for a punk that has no bid", async function () {
        await cryptoPunksMarket.connect(account0).allInitialOwnersAssigned();
        await cryptoPunksMarket.connect(account1).getPunk(0);
        await expectThrow(cryptoPunksMarket.connect(account1).acceptBidForPunk(0, 3000),"punk has no bid");
      });
      it("try to accept bid for a punk with too high an accept value", async function () {
        await cryptoPunksMarket.connect(account0).allInitialOwnersAssigned();
        await cryptoPunksMarket.connect(account1).getPunk(0);
        await cryptoPunksMarket.connect(account2).enterBidForPunk(0, { value: ethers.utils.parseEther(bidValue1.toString()) });
        //try to accept a bid with too high value
        await expectThrow(cryptoPunksMarket.connect(account1).acceptBidForPunk(0,ethers.utils.parseEther(highAcceptBidValue.toString()) ),"bid.value < minPrice");
      });
      it("accept bid from A3", async function () {
        await cryptoPunksMarket.connect(account0).allInitialOwnersAssigned();
        await cryptoPunksMarket.connect(account1).getPunk(0);
        //A2 enter bid with value 5 ether
        await cryptoPunksMarket.connect(account2).enterBidForPunk(0, { value: ethers.utils.parseEther(bidValue2.toString()) });
        
        //A3 enter bid with value 10 ether
        await cryptoPunksMarket.connect(account3).enterBidForPunk(0, { value: ethers.utils.parseEther(bidValue1.toString()) });
        
        //A1 own punk, accept bit  value 7 ether
        await cryptoPunksMarket.connect(account1).acceptBidForPunk(0,ethers.utils.parseEther(acceptBidValue.toString()));
        //So A3 should win bid and own this punk, A2 lost bid and repayed value
        // Was A2 paid?
        var amount=await cryptoPunksMarket.getPendingWithdrawals(account2.address)
        expect(amount.sub(ethers.utils.parseEther(bidValue2.toString()))).to.equal(0)
        // Does A3 own the punk
        var owner = await cryptoPunksMarket.getAddressByPunkIndex(0);
        assert.equal(owner, account3.address);
        // Ensure bid object has been zeroed out
        var bid = await cryptoPunksMarket.getPunkBids(0);
        assert.equal(false, bid[0]);
      });
      it("offer up a punk for sale, then get a lower bid, accept that bid", async function () {
        await cryptoPunksMarket.connect(account0).allInitialOwnersAssigned();
        await cryptoPunksMarket.connect(account1).getPunk(0);
        await cryptoPunksMarket.connect(account1).offerPunkForSale(0,ethers.utils.parseEther(offerPunkForSalePrice.toString()))
        await cryptoPunksMarket.connect(account2).enterBidForPunk(0, { value: ethers.utils.parseEther(bidValue1.toString()) });
        await cryptoPunksMarket.connect(account1).acceptBidForPunk(0,ethers.utils.parseEther(acceptBidValue.toString()));
        // Make sure transaction went through at 5000 price level
        var owner = await cryptoPunksMarket.getAddressByPunkIndex(0);
        assert.equal(owner, account2.address);
        // Ensure offer object has been zeroed out
         var offer = await cryptoPunksMarket.getPunkOfferForSale(0);
        assert.equal(false, offer[0]);
      });


});
