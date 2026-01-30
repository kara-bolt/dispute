// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MoltbookArbitrator
 * @notice Core arbitration contract for KaraDispute - AI-arbitrated dispute resolution
 * @dev Moltbook AI agents vote on disputes instead of human jurors
 */
contract MoltbookArbitrator is Ownable, ReentrancyGuard {
    
    // ============ Enums ============
    
    enum DisputeStatus {
        None,           // Dispute doesn't exist
        Open,           // Waiting for votes
        Voting,         // Oracle submitted, waiting for execution
        Resolved,       // Ruling executed
        Appealed        // Escalated to larger pool
    }
    
    enum Ruling {
        RefusedToArbitrate,  // 0 - No ruling / abstain
        Claimant,            // 1 - Claimant wins
        Respondent           // 2 - Respondent wins
    }
    
    // ============ Structs ============
    
    struct Dispute {
        address claimant;           // Party A
        address respondent;         // Party B
        address arbitrable;         // Contract that created the dispute
        uint256 amount;             // Amount at stake (in escrow)
        string evidenceURI;         // IPFS hash or URL to evidence
        DisputeStatus status;
        Ruling ruling;
        uint256 createdAt;
        uint256 resolvedAt;
        uint256 votingDeadline;
        uint8 appealRound;          // 0 = initial, 1+ = appeals
        uint256 requiredVotes;      // Quorum needed
    }
    
    struct VoteResult {
        uint256 forClaimant;        // Votes for ruling = 1
        uint256 forRespondent;      // Votes for ruling = 2
        uint256 abstained;          // Votes for ruling = 0
        bytes32[] agentIds;         // Moltbook agent identifiers who voted
        bytes[] signatures;         // Signatures from agents
    }
    
    // ============ State ============
    
    address public oracle;                          // MoltbookOracle address
    uint256 public disputeCount;                    // Total disputes created
    uint256 public arbitrationFee;                  // Fee to create dispute (in wei)
    uint256 public votingPeriod;                    // Time for voting (seconds)
    uint256 public minVotesInitial;                 // Minimum votes for initial round
    uint256 public appealMultiplier;                // Multiplier for appeal votes (2x by default)
    
    mapping(uint256 => Dispute) public disputes;
    mapping(uint256 => VoteResult) public voteResults;
    mapping(uint256 => mapping(bytes32 => bool)) public hasVoted; // disputeId => agentId => voted
    
    // ============ Events ============
    
    event DisputeCreated(
        uint256 indexed disputeId,
        address indexed claimant,
        address indexed respondent,
        address arbitrable,
        uint256 amount,
        string evidenceURI
    );
    
    event VotesSubmitted(
        uint256 indexed disputeId,
        uint256 forClaimant,
        uint256 forRespondent,
        uint256 abstained
    );
    
    event DisputeResolved(
        uint256 indexed disputeId,
        Ruling ruling,
        uint256 forClaimant,
        uint256 forRespondent
    );
    
    event DisputeAppealed(
        uint256 indexed disputeId,
        uint8 appealRound,
        uint256 newRequiredVotes
    );
    
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);
    event ArbitrationFeeUpdated(uint256 oldFee, uint256 newFee);
    
    // ============ Errors ============
    
    error DisputeNotFound();
    error DisputeNotOpen();
    error DisputeNotVoting();
    error DisputeAlreadyResolved();
    error OnlyOracle();
    error OnlyArbitrable();
    error InsufficientFee();
    error VotingPeriodNotEnded();
    error VotingPeriodEnded();
    error QuorumNotReached();
    error InvalidRuling();
    error AppealNotAllowed();
    error ZeroAddress();
    
    // ============ Modifiers ============
    
    modifier onlyOracle() {
        if (msg.sender != oracle) revert OnlyOracle();
        _;
    }
    
    // ============ Constructor ============
    
    constructor(
        address _oracle,
        uint256 _arbitrationFee,
        uint256 _votingPeriod,
        uint256 _minVotesInitial
    ) Ownable(msg.sender) {
        if (_oracle == address(0)) revert ZeroAddress();
        oracle = _oracle;
        arbitrationFee = _arbitrationFee;
        votingPeriod = _votingPeriod;
        minVotesInitial = _minVotesInitial;
        appealMultiplier = 2; // 2x votes on appeal
    }
    
    // ============ External Functions ============
    
    /**
     * @notice Create a new dispute
     * @param _claimant Address of the claimant
     * @param _respondent Address of the respondent
     * @param _amount Amount at stake
     * @param _evidenceURI URI to evidence (IPFS hash recommended)
     * @return disputeId The ID of the created dispute
     */
    function createDispute(
        address _claimant,
        address _respondent,
        uint256 _amount,
        string calldata _evidenceURI
    ) external payable returns (uint256 disputeId) {
        if (msg.value < arbitrationFee) revert InsufficientFee();
        if (_claimant == address(0) || _respondent == address(0)) revert ZeroAddress();
        
        disputeId = disputeCount++;
        
        disputes[disputeId] = Dispute({
            claimant: _claimant,
            respondent: _respondent,
            arbitrable: msg.sender,
            amount: _amount,
            evidenceURI: _evidenceURI,
            status: DisputeStatus.Open,
            ruling: Ruling.RefusedToArbitrate,
            createdAt: block.timestamp,
            resolvedAt: 0,
            votingDeadline: block.timestamp + votingPeriod,
            appealRound: 0,
            requiredVotes: minVotesInitial
        });
        
        emit DisputeCreated(
            disputeId,
            _claimant,
            _respondent,
            msg.sender,
            _amount,
            _evidenceURI
        );
    }
    
    /**
     * @notice Submit Moltbook voting results (called by oracle)
     * @param _disputeId The dispute ID
     * @param _forClaimant Votes for claimant
     * @param _forRespondent Votes for respondent
     * @param _abstained Abstained votes
     * @param _agentIds Array of agent identifiers who voted
     * @param _signatures Array of signatures from agents
     */
    function submitMoltbookResult(
        uint256 _disputeId,
        uint256 _forClaimant,
        uint256 _forRespondent,
        uint256 _abstained,
        bytes32[] calldata _agentIds,
        bytes[] calldata _signatures
    ) external onlyOracle {
        Dispute storage dispute = disputes[_disputeId];
        if (dispute.status != DisputeStatus.Open) revert DisputeNotOpen();
        if (block.timestamp > dispute.votingDeadline) revert VotingPeriodEnded();
        
        // Store vote results
        voteResults[_disputeId] = VoteResult({
            forClaimant: _forClaimant,
            forRespondent: _forRespondent,
            abstained: _abstained,
            agentIds: _agentIds,
            signatures: _signatures
        });
        
        // Mark agents as voted
        for (uint256 i = 0; i < _agentIds.length; i++) {
            hasVoted[_disputeId][_agentIds[i]] = true;
        }
        
        dispute.status = DisputeStatus.Voting;
        
        emit VotesSubmitted(_disputeId, _forClaimant, _forRespondent, _abstained);
    }
    
    /**
     * @notice Execute the ruling after voting period ends
     * @param _disputeId The dispute ID
     */
    function resolveDispute(uint256 _disputeId) external nonReentrant {
        Dispute storage dispute = disputes[_disputeId];
        if (dispute.status != DisputeStatus.Voting) revert DisputeNotVoting();
        
        VoteResult storage result = voteResults[_disputeId];
        uint256 totalVotes = result.forClaimant + result.forRespondent + result.abstained;
        
        // Check quorum
        if (totalVotes < dispute.requiredVotes) revert QuorumNotReached();
        
        // Determine ruling
        Ruling ruling;
        if (result.forClaimant > result.forRespondent) {
            ruling = Ruling.Claimant;
        } else if (result.forRespondent > result.forClaimant) {
            ruling = Ruling.Respondent;
        } else {
            // Tie - refuse to arbitrate (funds return to both or stay locked)
            ruling = Ruling.RefusedToArbitrate;
        }
        
        dispute.ruling = ruling;
        dispute.status = DisputeStatus.Resolved;
        dispute.resolvedAt = block.timestamp;
        
        // Notify arbitrable contract
        IArbitrable(dispute.arbitrable).rule(_disputeId, uint256(ruling));
        
        emit DisputeResolved(_disputeId, ruling, result.forClaimant, result.forRespondent);
    }
    
    /**
     * @notice Appeal a dispute to escalate to larger agent pool
     * @param _disputeId The dispute ID
     */
    function appeal(uint256 _disputeId) external payable {
        Dispute storage dispute = disputes[_disputeId];
        if (dispute.status != DisputeStatus.Voting && dispute.status != DisputeStatus.Resolved) {
            revert AppealNotAllowed();
        }
        if (msg.sender != dispute.claimant && msg.sender != dispute.respondent) {
            revert AppealNotAllowed();
        }
        if (msg.value < arbitrationFee * 2) revert InsufficientFee(); // Appeal costs 2x
        
        // Reset for new voting round
        dispute.status = DisputeStatus.Open;
        dispute.appealRound++;
        dispute.requiredVotes = dispute.requiredVotes * appealMultiplier;
        dispute.votingDeadline = block.timestamp + votingPeriod;
        
        // Clear previous votes
        delete voteResults[_disputeId];
        
        emit DisputeAppealed(_disputeId, dispute.appealRound, dispute.requiredVotes);
    }
    
    // ============ View Functions ============
    
    function getDispute(uint256 _disputeId) external view returns (Dispute memory) {
        return disputes[_disputeId];
    }
    
    function getVoteResult(uint256 _disputeId) external view returns (VoteResult memory) {
        return voteResults[_disputeId];
    }
    
    function arbitrationCost() external view returns (uint256) {
        return arbitrationFee;
    }
    
    function currentRuling(uint256 _disputeId) external view returns (
        uint256 ruling,
        bool tied,
        bool resolved
    ) {
        Dispute storage dispute = disputes[_disputeId];
        VoteResult storage result = voteResults[_disputeId];
        
        ruling = uint256(dispute.ruling);
        tied = result.forClaimant == result.forRespondent;
        resolved = dispute.status == DisputeStatus.Resolved;
    }
    
    // ============ Admin Functions ============
    
    function setOracle(address _oracle) external onlyOwner {
        if (_oracle == address(0)) revert ZeroAddress();
        emit OracleUpdated(oracle, _oracle);
        oracle = _oracle;
    }
    
    function setArbitrationFee(uint256 _fee) external onlyOwner {
        emit ArbitrationFeeUpdated(arbitrationFee, _fee);
        arbitrationFee = _fee;
    }
    
    function setVotingPeriod(uint256 _period) external onlyOwner {
        votingPeriod = _period;
    }
    
    function setMinVotesInitial(uint256 _minVotes) external onlyOwner {
        minVotesInitial = _minVotes;
    }
    
    function setAppealMultiplier(uint256 _multiplier) external onlyOwner {
        appealMultiplier = _multiplier;
    }
    
    function withdrawFees(address payable _to) external onlyOwner {
        (bool success, ) = _to.call{value: address(this).balance}("");
        require(success, "Transfer failed");
    }
}

/**
 * @title IArbitrable
 * @notice Interface for contracts that can receive rulings
 */
interface IArbitrable {
    function rule(uint256 _disputeId, uint256 _ruling) external;
}
