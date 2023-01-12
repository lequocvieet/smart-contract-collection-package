var assert = require('assert')

module.exports.expectThrow = async function (promise, error_name) {
  try {
    await promise;
  } catch (error) {
    assert(
      error.message.search(error_name) != -1,
      "Expected throw " + error_name + " got " + error + "' instead",
    );
    return;
  }
  assert.fail('Expected throw not received');
}

module.exports.compareBalance = function (previousBalance, currentBalance, amount) {
  var strPrevBalance = String(previousBalance);
  var digitsToCompare = 10;
  var subPrevBalance = strPrevBalance.substr(strPrevBalance.length - digitsToCompare, strPrevBalance.length);
  var strBalance = String(currentBalance);
  var subCurrBalance = strBalance.substr(strBalance.length - digitsToCompare, strBalance.length);
  console.log("Comparing only least significant digits: " + subPrevBalance + " vs. " + subCurrBalance);
  assert.equal(Number(subCurrBalance), Number(subPrevBalance) + amount, "Account 1 balance incorrect after withdrawal.");
};

module.exports.EpochTimeToDate = function (epochTime) {
  let today = new Date(epochTime * 1000)
  let time = today.toDateString().slice(4) + " " + today.getHours() + ':' + today.getMinutes()
  return time
};
