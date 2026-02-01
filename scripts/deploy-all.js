/**
 * Full KaraDispute System Deployment
 * 
 * Deploys all contracts in the correct order:
 * 1. MoltbookArbitrator (temp oracle)
 * 2. MoltbookOracle (link to arbitrator)
 * 3. Update arbitrator oracle
 * 4. KaraEscrow (legacy escrow)
 * 5. KaraDisputeV2 (main dispute contract)
 * 6. KaraPayV2 (escrow with $KARA integration)
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-all.js --network baseMainnet
 *   npx hardhat run scripts/deploy-all.js --network baseSepolia
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// ============ Configuration ============

const CONFIG = {
  // $KARA token on Base mainnet
  karaToken: "0x99926046978e9fB6544140982fB32cddC7e86b07",
  
  // Fees and timing
  arbitrationFeeKara: hre.ethers.parseEther("100"),     // 100 KARA base fee
  arbitrationFeeEth: hre.ethers.parseEther("0.001"),    // 0.001 ETH legacy fee
  votingPeriod: 3 * 24 * 60 * 60,                       // 3 days
  minVotesInitial: 3,                                    // Min 3 votes
  appealMultiplier: 2,                                   // 2x votes on appeal
  minArbitratorStake: hre.ethers.parseEther("50000"),   // 50,000 KARA stake
  stakeLockPeriod: 7 * 24 * 60 * 60,                    // 7 days lock
  
  // KaraPay fee config
  baseFeeBps: 100,                                       // 1% base fee
  minFeeKara: hre.ethers.parseEther("10"),              // 10 KARA min fee
  maxFeeBps: 500,                                        // 5% max fee cap
};

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;
  const chainId = hre.network.config.chainId;
  
  console.log("=".repeat(70));
  console.log("KaraDispute Full Deployment");
  console.log("=".repeat(70));
  console.log(`Network: ${network} (Chain ID: ${chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${hre.ethers.formatEther(balance)} ETH`);
  
  // Check if we have enough balance
  const estimatedGas = hre.ethers.parseEther("0.002");
  if (balance < estimatedGas) {
    console.error(`\n❌ Insufficient balance! Need ~0.002 ETH, have ${hre.ethers.formatEther(balance)} ETH`);
    process.exit(1);
  }
  
  const karaToken = network === "hardhat" || network === "localhost" 
    ? "0x0000000000000000000000000000000000000001" // Mock for local
    : CONFIG.karaToken;
  
  console.log(`\nKARA Token: ${karaToken}`);
  console.log("=".repeat(70));
  
  const deployedContracts = {};
  
  // ============ Step 1: MoltbookArbitrator ============
  console.log("\n[1/6] Deploying MoltbookArbitrator...");
  
  const MoltbookArbitrator = await hre.ethers.getContractFactory("MoltbookArbitrator");
  const arbitrator = await MoltbookArbitrator.deploy(
    deployer.address,  // Temporary oracle (updated in step 3)
    CONFIG.arbitrationFeeEth,
    CONFIG.votingPeriod,
    CONFIG.minVotesInitial
  );
  await arbitrator.waitForDeployment();
  deployedContracts.MoltbookArbitrator = await arbitrator.getAddress();
  console.log(`   ✅ MoltbookArbitrator: ${deployedContracts.MoltbookArbitrator}`);
  
  // ============ Step 2: MoltbookOracle ============
  console.log("\n[2/6] Deploying MoltbookOracle...");
  
  const MoltbookOracle = await hre.ethers.getContractFactory("MoltbookOracle");
  const oracle = await MoltbookOracle.deploy(deployedContracts.MoltbookArbitrator);
  await oracle.waitForDeployment();
  deployedContracts.MoltbookOracle = await oracle.getAddress();
  console.log(`   ✅ MoltbookOracle: ${deployedContracts.MoltbookOracle}`);
  
  // ============ Step 3: Update Arbitrator Oracle ============
  console.log("\n[3/6] Linking arbitrator to oracle...");
  
  const setOracleTx = await arbitrator.setOracle(deployedContracts.MoltbookOracle);
  await setOracleTx.wait();
  console.log(`   ✅ Arbitrator oracle updated`);
  
  // ============ Step 4: KaraEscrow ============
  console.log("\n[4/6] Deploying KaraEscrow...");
  
  const KaraEscrow = await hre.ethers.getContractFactory("KaraEscrow");
  const escrow = await KaraEscrow.deploy(deployedContracts.MoltbookArbitrator);
  await escrow.waitForDeployment();
  deployedContracts.KaraEscrow = await escrow.getAddress();
  console.log(`   ✅ KaraEscrow: ${deployedContracts.KaraEscrow}`);
  
  // ============ Step 5: KaraDisputeV2 ============
  console.log("\n[5/6] Deploying KaraDisputeV2...");
  
  const KaraDisputeV2 = await hre.ethers.getContractFactory("KaraDisputeV2");
  const disputeV2 = await KaraDisputeV2.deploy(
    karaToken,                          // _karaToken
    deployedContracts.MoltbookOracle,   // _oracle
    deployer.address,                   // _treasury
    CONFIG.arbitrationFeeKara,          // _arbitrationFeeKara
    CONFIG.votingPeriod,                // _votingPeriod
    CONFIG.minVotesInitial              // _minVotesInitial
  );
  await disputeV2.waitForDeployment();
  deployedContracts.KaraDisputeV2 = await disputeV2.getAddress();
  console.log(`   ✅ KaraDisputeV2: ${deployedContracts.KaraDisputeV2}`);
  
  // Configure KaraDisputeV2
  console.log("   Configuring KaraDisputeV2...");
  await (await disputeV2.setMinArbitratorStake(CONFIG.minArbitratorStake)).wait();
  await (await disputeV2.setStakeLockPeriod(CONFIG.stakeLockPeriod)).wait();
  console.log(`   ✅ KaraDisputeV2 configured`);
  
  // ============ Step 6: KaraPayV2 ============
  console.log("\n[6/6] Deploying KaraPayV2...");
  
  const KaraPayV2 = await hre.ethers.getContractFactory("KaraPayV2");
  const payV2 = await KaraPayV2.deploy(
    karaToken,
    deployedContracts.KaraDisputeV2,
    deployer.address  // Treasury
  );
  await payV2.waitForDeployment();
  deployedContracts.KaraPayV2 = await payV2.getAddress();
  console.log(`   ✅ KaraPayV2: ${deployedContracts.KaraPayV2}`);
  
  // Configure KaraPayV2 fee structure
  console.log("   Configuring KaraPayV2 fees...");
  await (await payV2.setFeeConfig(CONFIG.baseFeeBps, CONFIG.minFeeKara, CONFIG.maxFeeBps)).wait();
  console.log(`   ✅ KaraPayV2 configured`);
  
  // ============ Summary ============
  console.log("\n" + "=".repeat(70));
  console.log("✅ DEPLOYMENT COMPLETE");
  console.log("=".repeat(70));
  
  console.log("\nDeployed Contracts:");
  for (const [name, address] of Object.entries(deployedContracts)) {
    console.log(`   ${name.padEnd(20)}: ${address}`);
  }
  
  // ============ Verification Commands ============
  console.log("\n" + "=".repeat(70));
  console.log("Verification Commands (run after deployment confirms):");
  console.log("=".repeat(70));
  
  console.log(`\nnpx hardhat verify --network ${network} ${deployedContracts.MoltbookArbitrator} "${deployer.address}" "${CONFIG.arbitrationFeeEth}" "${CONFIG.votingPeriod}" "${CONFIG.minVotesInitial}"`);
  console.log(`npx hardhat verify --network ${network} ${deployedContracts.MoltbookOracle} "${deployedContracts.MoltbookArbitrator}"`);
  console.log(`npx hardhat verify --network ${network} ${deployedContracts.KaraEscrow} "${deployedContracts.MoltbookArbitrator}"`);
  console.log(`npx hardhat verify --network ${network} ${deployedContracts.KaraDisputeV2} "${karaToken}" "${deployedContracts.MoltbookOracle}" "${deployer.address}" "${CONFIG.arbitrationFeeKara}" "${CONFIG.votingPeriod}" "${CONFIG.minVotesInitial}"`);
  console.log(`npx hardhat verify --network ${network} ${deployedContracts.KaraPayV2} "${karaToken}" "${deployedContracts.KaraDisputeV2}" "${deployer.address}"`);
  
  // ============ Save Deployment Info ============
  const deploymentInfo = {
    network,
    chainId,
    deployer: deployer.address,
    karaToken,
    contracts: deployedContracts,
    config: {
      arbitrationFeeKara: CONFIG.arbitrationFeeKara.toString(),
      arbitrationFeeEth: CONFIG.arbitrationFeeEth.toString(),
      votingPeriod: CONFIG.votingPeriod,
      minVotesInitial: CONFIG.minVotesInitial,
      minArbitratorStake: CONFIG.minArbitratorStake.toString(),
      stakeLockPeriod: CONFIG.stakeLockPeriod,
      baseFeeBps: CONFIG.baseFeeBps,
      minFeeKara: CONFIG.minFeeKara.toString(),
      maxFeeBps: CONFIG.maxFeeBps,
    },
    timestamp: new Date().toISOString(),
  };
  
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const filename = `${network}-full.json`;
  fs.writeFileSync(
    path.join(deploymentsDir, filename),
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`\n📁 Deployment info saved to: deployments/${filename}`);
  
  // ============ SDK Update Reminder ============
  console.log("\n" + "=".repeat(70));
  console.log("📝 NEXT STEPS");
  console.log("=".repeat(70));
  console.log("1. Verify contracts on BaseScan");
  console.log("2. Update sdk/src/constants.ts with deployed addresses:");
  console.log(`
export const BASE_MAINNET_ADDRESSES: ContractAddresses = {
  karaDispute: '${deployedContracts.KaraDisputeV2}' as Address,
  karaEscrow: '${deployedContracts.KaraEscrow}' as Address,
  karaPay: '${deployedContracts.KaraPayV2}' as Address,
  karaToken: '${karaToken}' as Address,
};
`);
  console.log("3. Publish SDK to npm: npm publish --access public");
  
  const finalBalance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`\nFinal balance: ${hre.ethers.formatEther(finalBalance)} ETH`);
  console.log(`Gas used: ~${hre.ethers.formatEther(balance - finalBalance)} ETH`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
