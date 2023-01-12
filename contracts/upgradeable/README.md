# We first need to install the Upgrades Plugin.
npm install --save-dev @openzeppelin/hardhat-upgrades

# Configure Hardhat to use our @openzeppelin/hardhat-upgrades plugin
add the plugin in your hardhat.config.js

# Deploy contract as an upgradeable contract

npx hardhat run --network localhost  scripts/deploy_upgradeable_box.js 

# Update exist contract after add more functions

npx hardhat run --network localhost scripts/upgrade_box.js