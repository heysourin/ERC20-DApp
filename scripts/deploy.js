const { ethers, run, network } = require("hardhat");
//run allows to run any hardhat test

async function main() {
  const SimpleStorageFactory = await ethers.getContractFactory("Token");
  console.log("Deploying contract...");
  const token = await SimpleStorageFactory.deploy();
  await token.deployed();
  console.log(`Contract deployed to ${token.address}`);
  if (network.config.chainId === 5 && process.env.ETHERSCAN_API_KEY) {
    await token.deployTransaction.wait(6);
    await verify(token.address, []);
  }
}

const verify = async (contractAddress, args) => {
  console.log("Verifying contract...")
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: args,
    })
  } catch (e) {
    if (e.message.toLowerCase().includes("already verified")) {
      console.log("Already Verified!")
    } else {
      console.log(e)
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});