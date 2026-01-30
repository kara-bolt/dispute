const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("KaraDispute", function () {
  let arbitrator;
  let oracle;
  let escrow;
  let owner;
  let relayer;
  let claimant;
  let respondent;
  let other;

  const ARBITRATION_FEE = ethers.parseEther("0.001");
  const VOTING_PERIOD = 3 * 24 * 60 * 60; // 3 days
  const MIN_VOTES = 3;
  const ESCROW_AMOUNT = ethers.parseEther("1");

  beforeEach(async function () {
    [owner, relayer, claimant, respondent, other] = await ethers.getSigners();

    // Deploy MoltbookArbitrator with owner as temporary oracle
    const MoltbookArbitrator = await ethers.getContractFactory("MoltbookArbitrator");
    arbitrator = await MoltbookArbitrator.deploy(
      owner.address,
      ARBITRATION_FEE,
      VOTING_PERIOD,
      MIN_VOTES
    );
    await arbitrator.waitForDeployment();

    // Deploy MoltbookOracle
    const MoltbookOracle = await ethers.getContractFactory("MoltbookOracle");
    oracle = await MoltbookOracle.deploy(await arbitrator.getAddress());
    await oracle.waitForDeployment();

    // Update arbitrator oracle
    await arbitrator.setOracle(await oracle.getAddress());

    // Deploy KaraEscrow
    const KaraEscrow = await ethers.getContractFactory("KaraEscrow");
    escrow = await KaraEscrow.deploy(await arbitrator.getAddress());
    await escrow.waitForDeployment();

    // Add relayer to oracle
    await oracle.addRelayer(relayer.address);
  });

  describe("MoltbookArbitrator", function () {
    describe("Deployment", function () {
      it("Should set the correct owner", async function () {
        expect(await arbitrator.owner()).to.equal(owner.address);
      });

      it("Should set the correct oracle", async function () {
        expect(await arbitrator.oracle()).to.equal(await oracle.getAddress());
      });

      it("Should set the correct arbitration fee", async function () {
        expect(await arbitrator.arbitrationFee()).to.equal(ARBITRATION_FEE);
      });

      it("Should set the correct voting period", async function () {
        expect(await arbitrator.votingPeriod()).to.equal(VOTING_PERIOD);
      });

      it("Should set the correct min votes", async function () {
        expect(await arbitrator.minVotesInitial()).to.equal(MIN_VOTES);
      });
    });

    describe("Create Dispute", function () {
      it("Should create a dispute when called with sufficient fee", async function () {
        const tx = await arbitrator.createDispute(
          claimant.address,
          respondent.address,
          ESCROW_AMOUNT,
          "ipfs://evidence",
          { value: ARBITRATION_FEE }
        );

        await expect(tx)
          .to.emit(arbitrator, "DisputeCreated")
          .withArgs(0, claimant.address, respondent.address, owner.address, ESCROW_AMOUNT, "ipfs://evidence");

        const dispute = await arbitrator.getDispute(0);
        expect(dispute.claimant).to.equal(claimant.address);
        expect(dispute.respondent).to.equal(respondent.address);
        expect(dispute.amount).to.equal(ESCROW_AMOUNT);
        expect(dispute.status).to.equal(1); // Open
      });

      it("Should revert if fee is insufficient", async function () {
        await expect(
          arbitrator.createDispute(
            claimant.address,
            respondent.address,
            ESCROW_AMOUNT,
            "ipfs://evidence",
            { value: ARBITRATION_FEE - 1n }
          )
        ).to.be.revertedWithCustomError(arbitrator, "InsufficientFee");
      });

      it("Should revert if claimant is zero address", async function () {
        await expect(
          arbitrator.createDispute(
            ethers.ZeroAddress,
            respondent.address,
            ESCROW_AMOUNT,
            "ipfs://evidence",
            { value: ARBITRATION_FEE }
          )
        ).to.be.revertedWithCustomError(arbitrator, "ZeroAddress");
      });
    });

    describe("Submit Votes", function () {
      beforeEach(async function () {
        // Create a dispute
        await arbitrator.createDispute(
          claimant.address,
          respondent.address,
          ESCROW_AMOUNT,
          "ipfs://evidence",
          { value: ARBITRATION_FEE }
        );
      });

      it("Should submit votes through oracle", async function () {
        const agentIds = [
          ethers.id("agent1"),
          ethers.id("agent2"),
          ethers.id("agent3")
        ];
        const signatures = ["0x", "0x", "0x"];

        await oracle.connect(relayer).submitVotes(
          0, // disputeId
          2, // forClaimant
          1, // forRespondent
          0, // abstained
          agentIds,
          signatures
        );

        const dispute = await arbitrator.getDispute(0);
        expect(dispute.status).to.equal(2); // Voting

        const result = await arbitrator.getVoteResult(0);
        expect(result.forClaimant).to.equal(2);
        expect(result.forRespondent).to.equal(1);
      });

      it("Should revert if not called by oracle", async function () {
        await expect(
          arbitrator.submitMoltbookResult(0, 2, 1, 0, [], [])
        ).to.be.revertedWithCustomError(arbitrator, "OnlyOracle");
      });
    });

    describe("Resolve Dispute", function () {
      beforeEach(async function () {
        // Create dispute through escrow
        await escrow.connect(claimant).createTransaction(
          respondent.address,
          ethers.ZeroAddress,
          ESCROW_AMOUNT,
          "Test transaction",
          (await time.latest()) + 7 * 24 * 60 * 60,
          { value: ESCROW_AMOUNT }
        );

        // Raise dispute
        await escrow.connect(claimant).raiseDispute(0, "ipfs://evidence", { value: ARBITRATION_FEE });

        // Submit votes (3 for claimant, 0 for respondent)
        const agentIds = [
          ethers.id("agent1"),
          ethers.id("agent2"),
          ethers.id("agent3")
        ];
        const signatures = ["0x", "0x", "0x"];

        await oracle.connect(relayer).submitVotes(0, 3, 0, 0, agentIds, signatures);
      });

      it("Should resolve dispute in favor of claimant", async function () {
        const claimantBalanceBefore = await ethers.provider.getBalance(claimant.address);

        await arbitrator.resolveDispute(0);

        const dispute = await arbitrator.getDispute(0);
        expect(dispute.status).to.equal(3); // Resolved
        expect(dispute.ruling).to.equal(1); // Claimant

        const claimantBalanceAfter = await ethers.provider.getBalance(claimant.address);
        expect(claimantBalanceAfter - claimantBalanceBefore).to.equal(ESCROW_AMOUNT);
      });

      it("Should emit DisputeResolved event", async function () {
        await expect(arbitrator.resolveDispute(0))
          .to.emit(arbitrator, "DisputeResolved")
          .withArgs(0, 1, 3, 0); // disputeId, ruling, forClaimant, forRespondent
      });
    });

    describe("Appeal", function () {
      beforeEach(async function () {
        // Create and resolve dispute
        await escrow.connect(claimant).createTransaction(
          respondent.address,
          ethers.ZeroAddress,
          ESCROW_AMOUNT,
          "Test transaction",
          (await time.latest()) + 7 * 24 * 60 * 60,
          { value: ESCROW_AMOUNT }
        );

        await escrow.connect(claimant).raiseDispute(0, "ipfs://evidence", { value: ARBITRATION_FEE });

        const agentIds = [
          ethers.id("agent1"),
          ethers.id("agent2"),
          ethers.id("agent3")
        ];
        await oracle.connect(relayer).submitVotes(0, 1, 2, 0, agentIds, ["0x", "0x", "0x"]);
      });

      it("Should allow claimant to appeal", async function () {
        // Claimant lost (1 vs 2), can appeal
        await expect(
          arbitrator.connect(claimant).appeal(0, { value: ARBITRATION_FEE * 2n })
        )
          .to.emit(arbitrator, "DisputeAppealed")
          .withArgs(0, 1, MIN_VOTES * 2);

        const dispute = await arbitrator.getDispute(0);
        expect(dispute.status).to.equal(1); // Back to Open
        expect(dispute.appealRound).to.equal(1);
        expect(dispute.requiredVotes).to.equal(MIN_VOTES * 2);
      });

      it("Should revert if not a party", async function () {
        await expect(
          arbitrator.connect(other).appeal(0, { value: ARBITRATION_FEE * 2n })
        ).to.be.revertedWithCustomError(arbitrator, "AppealNotAllowed");
      });

      it("Should revert if insufficient fee", async function () {
        await expect(
          arbitrator.connect(claimant).appeal(0, { value: ARBITRATION_FEE })
        ).to.be.revertedWithCustomError(arbitrator, "InsufficientFee");
      });
    });
  });

  describe("MoltbookOracle", function () {
    describe("Deployment", function () {
      it("Should set owner as first relayer", async function () {
        expect(await oracle.relayers(owner.address)).to.equal(true);
      });

      it("Should set correct arbitrator", async function () {
        expect(await oracle.arbitrator()).to.equal(await arbitrator.getAddress());
      });
    });

    describe("Relayer Management", function () {
      it("Should add relayer", async function () {
        await oracle.addRelayer(other.address);
        expect(await oracle.relayers(other.address)).to.equal(true);
        expect(await oracle.relayerCount()).to.equal(3); // owner + relayer + other
      });

      it("Should remove relayer", async function () {
        await oracle.removeRelayer(relayer.address);
        expect(await oracle.relayers(relayer.address)).to.equal(false);
      });

      it("Should revert if non-owner tries to add relayer", async function () {
        await expect(
          oracle.connect(other).addRelayer(other.address)
        ).to.be.revertedWithCustomError(oracle, "OwnableUnauthorizedAccount");
      });
    });

    describe("Vote Submission", function () {
      beforeEach(async function () {
        await arbitrator.createDispute(
          claimant.address,
          respondent.address,
          ESCROW_AMOUNT,
          "ipfs://evidence",
          { value: ARBITRATION_FEE }
        );
      });

      it("Should submit votes as relayer", async function () {
        const agentIds = [ethers.id("a1"), ethers.id("a2"), ethers.id("a3")];
        const signatures = ["0x", "0x", "0x"];

        await expect(
          oracle.connect(relayer).submitVotes(0, 2, 1, 0, agentIds, signatures)
        )
          .to.emit(oracle, "VoteSubmitted")
          .withArgs(0, relayer.address, 2, 1, 0);
      });

      it("Should revert if not relayer", async function () {
        await expect(
          oracle.connect(other).submitVotes(0, 2, 1, 0, [], [])
        ).to.be.revertedWithCustomError(oracle, "NotRelayer");
      });

      it("Should revert if vote count mismatch", async function () {
        const agentIds = [ethers.id("a1"), ethers.id("a2")]; // Only 2 agents
        const signatures = ["0x", "0x"];

        await expect(
          oracle.connect(relayer).submitVotes(0, 2, 1, 0, agentIds, signatures) // But 3 votes
        ).to.be.revertedWithCustomError(oracle, "InvalidAgentCount");
      });
    });
  });

  describe("KaraEscrow", function () {
    describe("Deployment", function () {
      it("Should set correct arbitrator", async function () {
        expect(await escrow.arbitrator()).to.equal(await arbitrator.getAddress());
      });
    });

    describe("Create Transaction", function () {
      it("Should create and fund ETH transaction", async function () {
        const deadline = (await time.latest()) + 7 * 24 * 60 * 60;

        await expect(
          escrow.connect(claimant).createTransaction(
            respondent.address,
            ethers.ZeroAddress,
            ESCROW_AMOUNT,
            "Payment for work",
            deadline,
            { value: ESCROW_AMOUNT }
          )
        )
          .to.emit(escrow, "TransactionCreated")
          .withArgs(0, claimant.address, respondent.address, ethers.ZeroAddress, ESCROW_AMOUNT, "Payment for work", deadline);

        const txn = await escrow.getTransaction(0);
        expect(txn.payer).to.equal(claimant.address);
        expect(txn.payee).to.equal(respondent.address);
        expect(txn.amount).to.equal(ESCROW_AMOUNT);
        expect(txn.status).to.equal(2); // Funded
      });

      it("Should revert with zero amount", async function () {
        await expect(
          escrow.connect(claimant).createTransaction(
            respondent.address,
            ethers.ZeroAddress,
            0,
            "Test",
            (await time.latest()) + 86400
          )
        ).to.be.revertedWithCustomError(escrow, "InvalidAmount");
      });
    });

    describe("Release", function () {
      beforeEach(async function () {
        await escrow.connect(claimant).createTransaction(
          respondent.address,
          ethers.ZeroAddress,
          ESCROW_AMOUNT,
          "Test",
          (await time.latest()) + 7 * 24 * 60 * 60,
          { value: ESCROW_AMOUNT }
        );
      });

      it("Should allow payer to release", async function () {
        const respondentBalanceBefore = await ethers.provider.getBalance(respondent.address);

        await escrow.connect(claimant).release(0);

        const respondentBalanceAfter = await ethers.provider.getBalance(respondent.address);
        expect(respondentBalanceAfter - respondentBalanceBefore).to.equal(ESCROW_AMOUNT);

        const txn = await escrow.getTransaction(0);
        expect(txn.status).to.equal(4); // Resolved
      });

      it("Should allow release after deadline by anyone", async function () {
        // Move time past deadline
        await time.increase(8 * 24 * 60 * 60);

        const respondentBalanceBefore = await ethers.provider.getBalance(respondent.address);

        await escrow.connect(other).release(0);

        const respondentBalanceAfter = await ethers.provider.getBalance(respondent.address);
        expect(respondentBalanceAfter - respondentBalanceBefore).to.equal(ESCROW_AMOUNT);
      });

      it("Should revert if non-payer tries before deadline", async function () {
        await expect(
          escrow.connect(other).release(0)
        ).to.be.revertedWithCustomError(escrow, "OnlyPayer");
      });
    });

    describe("Raise Dispute", function () {
      beforeEach(async function () {
        await escrow.connect(claimant).createTransaction(
          respondent.address,
          ethers.ZeroAddress,
          ESCROW_AMOUNT,
          "Test",
          (await time.latest()) + 7 * 24 * 60 * 60,
          { value: ESCROW_AMOUNT }
        );
      });

      it("Should raise dispute with sufficient fee", async function () {
        await expect(
          escrow.connect(claimant).raiseDispute(0, "ipfs://evidence", { value: ARBITRATION_FEE })
        )
          .to.emit(escrow, "DisputeRaised")
          .withArgs(0, 0, "ipfs://evidence");

        const txn = await escrow.getTransaction(0);
        expect(txn.status).to.equal(3); // Disputed
        expect(txn.disputeId).to.equal(0);
      });

      it("Should revert if insufficient fee", async function () {
        await expect(
          escrow.connect(claimant).raiseDispute(0, "ipfs://evidence", { value: ARBITRATION_FEE - 1n })
        ).to.be.revertedWithCustomError(escrow, "InsufficientPayment");
      });

      it("Should revert if past deadline", async function () {
        await time.increase(8 * 24 * 60 * 60);

        await expect(
          escrow.connect(claimant).raiseDispute(0, "ipfs://evidence", { value: ARBITRATION_FEE })
        ).to.be.revertedWithCustomError(escrow, "DeadlinePassed");
      });
    });

    describe("Ruling Execution", function () {
      beforeEach(async function () {
        await escrow.connect(claimant).createTransaction(
          respondent.address,
          ethers.ZeroAddress,
          ESCROW_AMOUNT,
          "Test",
          (await time.latest()) + 7 * 24 * 60 * 60,
          { value: ESCROW_AMOUNT }
        );

        await escrow.connect(claimant).raiseDispute(0, "ipfs://evidence", { value: ARBITRATION_FEE });
      });

      it("Should execute ruling for claimant", async function () {
        // Submit votes in favor of claimant
        const agentIds = [ethers.id("a1"), ethers.id("a2"), ethers.id("a3")];
        await oracle.connect(relayer).submitVotes(0, 3, 0, 0, agentIds, ["0x", "0x", "0x"]);

        const claimantBalanceBefore = await ethers.provider.getBalance(claimant.address);

        await arbitrator.resolveDispute(0);

        const claimantBalanceAfter = await ethers.provider.getBalance(claimant.address);
        expect(claimantBalanceAfter - claimantBalanceBefore).to.equal(ESCROW_AMOUNT);
      });

      it("Should execute ruling for respondent", async function () {
        // Submit votes in favor of respondent
        const agentIds = [ethers.id("a1"), ethers.id("a2"), ethers.id("a3")];
        await oracle.connect(relayer).submitVotes(0, 0, 3, 0, agentIds, ["0x", "0x", "0x"]);

        const respondentBalanceBefore = await ethers.provider.getBalance(respondent.address);

        await arbitrator.resolveDispute(0);

        const respondentBalanceAfter = await ethers.provider.getBalance(respondent.address);
        expect(respondentBalanceAfter - respondentBalanceBefore).to.equal(ESCROW_AMOUNT);
      });

      it("Should split funds on tie", async function () {
        // Submit tied votes
        const agentIds = [ethers.id("a1"), ethers.id("a2"), ethers.id("a3"), ethers.id("a4")];
        await oracle.connect(relayer).submitVotes(0, 2, 2, 0, agentIds, ["0x", "0x", "0x", "0x"]);

        const claimantBalanceBefore = await ethers.provider.getBalance(claimant.address);
        const respondentBalanceBefore = await ethers.provider.getBalance(respondent.address);

        await arbitrator.resolveDispute(0);

        const claimantBalanceAfter = await ethers.provider.getBalance(claimant.address);
        const respondentBalanceAfter = await ethers.provider.getBalance(respondent.address);

        // Each should receive half
        const expectedHalf = ESCROW_AMOUNT / 2n;
        expect(claimantBalanceAfter - claimantBalanceBefore).to.equal(expectedHalf);
        expect(respondentBalanceAfter - respondentBalanceBefore).to.equal(ESCROW_AMOUNT - expectedHalf);
      });
    });

    describe("Cancel", function () {
      it("Should cancel unfunded transaction", async function () {
        // Create without funding
        const tx = await escrow.connect(claimant).createTransaction(
          respondent.address,
          ethers.ZeroAddress,
          ESCROW_AMOUNT,
          "Test",
          (await time.latest()) + 86400
        );

        await expect(escrow.connect(claimant).cancel(0))
          .to.emit(escrow, "TransactionCancelled")
          .withArgs(0);

        const txn = await escrow.getTransaction(0);
        expect(txn.status).to.equal(5); // Cancelled
      });

      it("Should revert if already funded", async function () {
        await escrow.connect(claimant).createTransaction(
          respondent.address,
          ethers.ZeroAddress,
          ESCROW_AMOUNT,
          "Test",
          (await time.latest()) + 86400,
          { value: ESCROW_AMOUNT }
        );

        await expect(
          escrow.connect(claimant).cancel(0)
        ).to.be.revertedWithCustomError(escrow, "InvalidStatus");
      });
    });
  });

  describe("Integration", function () {
    it("Should complete full dispute flow", async function () {
      // 1. Create escrow
      const deadline = (await time.latest()) + 7 * 24 * 60 * 60;
      await escrow.connect(claimant).createTransaction(
        respondent.address,
        ethers.ZeroAddress,
        ESCROW_AMOUNT,
        "Service payment",
        deadline,
        { value: ESCROW_AMOUNT }
      );

      // 2. Raise dispute
      await escrow.connect(claimant).raiseDispute(0, "ipfs://QmEvidence", { value: ARBITRATION_FEE });

      // Verify dispute created
      const dispute = await arbitrator.getDispute(0);
      expect(dispute.status).to.equal(1); // Open

      // 3. Submit votes via oracle
      const agentIds = [ethers.id("agent1"), ethers.id("agent2"), ethers.id("agent3")];
      await oracle.connect(relayer).submitVotes(
        0,
        2, // forClaimant
        1, // forRespondent
        0, // abstained
        agentIds,
        ["0x", "0x", "0x"]
      );

      // Verify votes submitted
      const disputeAfterVotes = await arbitrator.getDispute(0);
      expect(disputeAfterVotes.status).to.equal(2); // Voting

      // 4. Resolve dispute
      const claimantBalanceBefore = await ethers.provider.getBalance(claimant.address);

      await arbitrator.resolveDispute(0);

      // Verify resolution
      const finalDispute = await arbitrator.getDispute(0);
      expect(finalDispute.status).to.equal(3); // Resolved
      expect(finalDispute.ruling).to.equal(1); // Claimant wins

      const claimantBalanceAfter = await ethers.provider.getBalance(claimant.address);
      expect(claimantBalanceAfter - claimantBalanceBefore).to.equal(ESCROW_AMOUNT);
    });

    it("Should handle appeal flow", async function () {
      // Create and dispute
      await escrow.connect(claimant).createTransaction(
        respondent.address,
        ethers.ZeroAddress,
        ESCROW_AMOUNT,
        "Service",
        (await time.latest()) + 7 * 24 * 60 * 60,
        { value: ESCROW_AMOUNT }
      );
      await escrow.connect(claimant).raiseDispute(0, "ipfs://evidence", { value: ARBITRATION_FEE });

      // First round - respondent wins
      const agentIds = [ethers.id("a1"), ethers.id("a2"), ethers.id("a3")];
      await oracle.connect(relayer).submitVotes(0, 1, 2, 0, agentIds, ["0x", "0x", "0x"]);

      // Claimant appeals
      await arbitrator.connect(claimant).appeal(0, { value: ARBITRATION_FEE * 2n });

      const appealedDispute = await arbitrator.getDispute(0);
      expect(appealedDispute.status).to.equal(1); // Back to Open
      expect(appealedDispute.appealRound).to.equal(1);
      expect(appealedDispute.requiredVotes).to.equal(MIN_VOTES * 2);

      // Second round - claimant wins this time
      const moreAgentIds = [
        ethers.id("a1"), ethers.id("a2"), ethers.id("a3"),
        ethers.id("a4"), ethers.id("a5"), ethers.id("a6")
      ];
      await oracle.connect(relayer).submitVotes(
        0, 4, 2, 0,
        moreAgentIds,
        ["0x", "0x", "0x", "0x", "0x", "0x"]
      );

      // Resolve
      const claimantBalanceBefore = await ethers.provider.getBalance(claimant.address);
      await arbitrator.resolveDispute(0);

      const finalDispute = await arbitrator.getDispute(0);
      expect(finalDispute.status).to.equal(3); // Resolved
      expect(finalDispute.ruling).to.equal(1); // Claimant wins on appeal

      const claimantBalanceAfter = await ethers.provider.getBalance(claimant.address);
      expect(claimantBalanceAfter - claimantBalanceBefore).to.equal(ESCROW_AMOUNT);
    });
  });
});
