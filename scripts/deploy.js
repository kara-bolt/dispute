const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());
  
  // Configuration
  const ARBITRATION_FEE = hre.ethers.parseEther("0.001"); // 0.001 ETH
  const VOTING_PERIOD = 3 * 24 * 60 * 60; // 3 days
  const MIN_VOTES_INITIAL = 3; // Minimum 3 agents to vote
  
  console.log("\n--- Deploying MoltbookArbitrator ---");
  
  // Deploy MoltbookArbitrator first (will set oracle later)
  const MoltbookArbitrator = await hre.ethers.getContractFactory("MoltbookArbitrator");
  
  // Deploy with deployer as temporary oracle
  const arbitrator = await MoltbookArbitrator.deploy(
    deployer.address, // Temporary oracle (will be updated)
    ARBITRATION_FEE,
    VOTING_PERIOD,
    MIN_VOTES_INITIAL
  );
  await arbitrator.waitForDeployment();
  const arbitratorAddress = await arbitrator.getAddress();
  console.log("MoltbookArbitrator deployed to:", arbitratorAddress);
  
  console.log("\n--- Deploying MoltbookOracle ---");
  
  // Deploy MoltbookOracle
  const MoltbookOracle = await hre.ethers.getContractFactory("MoltbookOracle");
  const oracle = await MoltbookOracle.deploy(arbitratorAddress);
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log("MoltbookOracle deployed to:", oracleAddress);
  
  // Update arbitrator to use the real oracle
  console.log("\n--- Updating Arbitrator Oracle ---");
  const setOracleTx = await arbitrator.setOracle(oracleAddress);
  await setOracleTx.wait();
  console.log("Arbitrator oracle set to:", oracleAddress);
  
  console.log("\n--- Deploying KaraEscrow ---");
  
  // Deploy KaraEscrow
  const KaraEscrow = await hre.ethers.getContractFactory("KaraEscrow");
  const escrow = await KaraEscrow.deploy(arbitratorAddress);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log("KaraEscrow deployed to:", escrowAddress);
  
  console.log("\n=== Deployment Complete ===");
  console.log("MoltbookArbitrator:", arbitratorAddress);
  console.log("MoltbookOracle:", oracleAddress);
  console.log("KaraEscrow:", escrowAddress);
  
  // Output for verification
  console.log("\n=== Verification Commands ===");
  console.log(`npx hardhat verify --network baseSepolia ${arbitratorAddress} "${deployer.address}" "${ARBITRATION_FEE}" "${VOTING_PERIOD}" "${MIN_VOTES_INITIAL}"`);
  console.log(`npx hardhat verify --network baseSepolia ${oracleAddress} "${arbitratorAddress}"`);
  console.log(`npx hardhat verify --network baseSepolia ${escrowAddress} "${arbitratorAddress}"`);
  
  // Save deployment addresses
  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployer: deployer.address,
    contracts: {
      MoltbookArbitrator: arbitratorAddress,
      MoltbookOracle: oracleAddress,
      KaraEscrow: escrowAddress
    },
    config: {
      arbitrationFee: ARBITRATION_FEE.toString(),
      votingPeriod: VOTING_PERIOD,
      minVotesInitial: MIN_VOTES_INITIAL
    },
    timestamp: new Date().toISOString()
  };
  
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  fs.writeFileSync(
    path.join(deploymentsDir, `${hre.network.name}.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`\nDeployment info saved to deployments/${hre.network.name}.json`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
