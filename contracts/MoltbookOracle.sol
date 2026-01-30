// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title MoltbookOracle
 * @notice Bridge between Moltbook AI agent votes and on-chain arbitration
 * @dev Aggregates votes from m/disputes and submits results to MoltbookArbitrator
 * 
 * MVP: Single relayer can submit results
 * V2: Multi-sig with multiple authorized relayers
 */
contract MoltbookOracle is Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;
    
    // ============ Structs ============
    
    struct VoteSubmission {
        uint256 disputeId;
        uint256 forClaimant;
        uint256 forRespondent;
        uint256 abstained;
        bytes32[] agentIds;
        uint256 timestamp;
        bool submitted;
    }
    
    // ============ State ============
    
    IMoltbookArbitratorOracle public arbitrator;
    
    // Authorized relayers (addresses that can submit votes)
    mapping(address => bool) public relayers;
    uint256 public relayerCount;
    
    // Multi-sig threshold (for v2)
    uint256 public threshold;
    
    // Vote submissions tracking
    mapping(uint256 => VoteSubmission) public submissions;
    mapping(uint256 => mapping(address => bool)) public relayerApprovals;
    mapping(uint256 => uint256) public approvalCount;
    
    // Agent verification (Moltbook agent ID => verified)
    mapping(bytes32 => bool) public verifiedAgents;
    
    // Nonce for replay protection
    mapping(bytes32 => uint256) public agentNonces;
    
    // ============ Events ============
    
    event RelayerAdded(address indexed relayer);
    event RelayerRemoved(address indexed relayer);
    event ThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event AgentVerified(bytes32 indexed agentId);
    event AgentUnverified(bytes32 indexed agentId);
    event VoteSubmitted(
        uint256 indexed disputeId,
        address indexed relayer,
        uint256 forClaimant,
        uint256 forRespondent,
        uint256 abstained
    );
    event VoteApproved(uint256 indexed disputeId, address indexed relayer);
    event VoteExecuted(uint256 indexed disputeId);
    
    // ============ Errors ============
    
    error NotRelayer();
    error AlreadyRelayer();
    error NotEnoughRelayers();
    error InvalidThreshold();
    error AlreadyApproved();
    error ThresholdNotMet();
    error AlreadySubmitted();
    error InvalidSignature();
    error AgentNotVerified();
    error InvalidAgentCount();
    error ZeroAddress();
    
    // ============ Modifiers ============
    
    modifier onlyRelayer() {
        if (!relayers[msg.sender]) revert NotRelayer();
        _;
    }
    
    // ============ Constructor ============
    
    constructor(address _arbitrator) Ownable(msg.sender) {
        if (_arbitrator == address(0)) revert ZeroAddress();
        arbitrator = IMoltbookArbitratorOracle(_arbitrator);
        
        // Owner is first relayer
        relayers[msg.sender] = true;
        relayerCount = 1;
        threshold = 1; // MVP: single relayer
        
        emit RelayerAdded(msg.sender);
    }
    
    // ============ Relayer Functions ============
    
    /**
     * @notice Submit aggregated vote results from Moltbook
     * @param _disputeId The dispute ID in the arbitrator
     * @param _forClaimant Number of votes for claimant
     * @param _forRespondent Number of votes for respondent
     * @param _abstained Number of abstained votes
     * @param _agentIds Array of Moltbook agent IDs who voted
     * @param _signatures Array of signatures from agents
     */
    function submitVotes(
        uint256 _disputeId,
        uint256 _forClaimant,
        uint256 _forRespondent,
        uint256 _abstained,
        bytes32[] calldata _agentIds,
        bytes[] calldata _signatures
    ) external onlyRelayer {
        // Allow re-submission if dispute was appealed (back to Open state)
        // The arbitrator.submitMoltbookResult will check if dispute is actually Open
        if (submissions[_disputeId].submitted) {
            // Reset submission tracking to allow appeal round voting
            delete submissions[_disputeId];
            delete approvalCount[_disputeId];
        }
        
        // Verify agent count matches vote count
        uint256 totalVotes = _forClaimant + _forRespondent + _abstained;
        if (_agentIds.length != totalVotes) revert InvalidAgentCount();
        if (_signatures.length != totalVotes) revert InvalidAgentCount();
        
        // Optional: Verify agent signatures (for production)
        // This validates that each agent actually voted
        // _verifyVoteSignatures(_disputeId, _agentIds, _signatures);
        
        // Store submission
        submissions[_disputeId] = VoteSubmission({
            disputeId: _disputeId,
            forClaimant: _forClaimant,
            forRespondent: _forRespondent,
            abstained: _abstained,
            agentIds: _agentIds,
            timestamp: block.timestamp,
            submitted: false
        });
        
        // Mark this relayer's approval
        relayerApprovals[_disputeId][msg.sender] = true;
        approvalCount[_disputeId] = 1;
        
        emit VoteSubmitted(_disputeId, msg.sender, _forClaimant, _forRespondent, _abstained);
        
        // If threshold is 1 (MVP), execute immediately
        if (threshold == 1) {
            _executeSubmission(_disputeId, _signatures);
        }
    }
    
    /**
     * @notice Approve a pending vote submission (multi-sig v2)
     * @param _disputeId The dispute ID to approve
     */
    function approveVotes(uint256 _disputeId) external onlyRelayer {
        if (relayerApprovals[_disputeId][msg.sender]) revert AlreadyApproved();
        if (submissions[_disputeId].submitted) revert AlreadySubmitted();
        
        relayerApprovals[_disputeId][msg.sender] = true;
        approvalCount[_disputeId]++;
        
        emit VoteApproved(_disputeId, msg.sender);
    }
    
    /**
     * @notice Execute submission after threshold is met
     * @param _disputeId The dispute ID
     * @param _signatures Signatures from agents
     */
    function executeSubmission(
        uint256 _disputeId,
        bytes[] calldata _signatures
    ) external onlyRelayer {
        if (approvalCount[_disputeId] < threshold) revert ThresholdNotMet();
        _executeSubmission(_disputeId, _signatures);
    }
    
    // ============ Internal Functions ============
    
    function _executeSubmission(
        uint256 _disputeId,
        bytes[] calldata _signatures
    ) internal {
        VoteSubmission storage sub = submissions[_disputeId];
        if (sub.submitted) revert AlreadySubmitted();
        
        sub.submitted = true;
        
        // Submit to arbitrator
        arbitrator.submitMoltbookResult(
            _disputeId,
            sub.forClaimant,
            sub.forRespondent,
            sub.abstained,
            sub.agentIds,
            _signatures
        );
        
        emit VoteExecuted(_disputeId);
    }
    
    /**
     * @notice Verify vote signatures from agents
     * @dev Each agent signs: keccak256(disputeId, vote, nonce)
     */
    function _verifyVoteSignatures(
        uint256 _disputeId,
        bytes32[] calldata _agentIds,
        bytes[] calldata _signatures
    ) internal view {
        for (uint256 i = 0; i < _agentIds.length; i++) {
            bytes32 agentId = _agentIds[i];
            
            // Check agent is verified
            if (!verifiedAgents[agentId]) revert AgentNotVerified();
            
            // Note: In production, we'd verify signatures here
            // This requires knowing the agent's signing address
            // For MVP, we trust the relayer
        }
    }
    
    // ============ Admin Functions ============
    
    function setArbitrator(address _arbitrator) external onlyOwner {
        if (_arbitrator == address(0)) revert ZeroAddress();
        arbitrator = IMoltbookArbitratorOracle(_arbitrator);
    }
    
    function addRelayer(address _relayer) external onlyOwner {
        if (_relayer == address(0)) revert ZeroAddress();
        if (relayers[_relayer]) revert AlreadyRelayer();
        
        relayers[_relayer] = true;
        relayerCount++;
        
        emit RelayerAdded(_relayer);
    }
    
    function removeRelayer(address _relayer) external onlyOwner {
        if (!relayers[_relayer]) revert NotRelayer();
        if (relayerCount <= threshold) revert NotEnoughRelayers();
        
        relayers[_relayer] = false;
        relayerCount--;
        
        emit RelayerRemoved(_relayer);
    }
    
    function setThreshold(uint256 _threshold) external onlyOwner {
        if (_threshold == 0 || _threshold > relayerCount) revert InvalidThreshold();
        
        emit ThresholdUpdated(threshold, _threshold);
        threshold = _threshold;
    }
    
    function verifyAgent(bytes32 _agentId) external onlyOwner {
        verifiedAgents[_agentId] = true;
        emit AgentVerified(_agentId);
    }
    
    function unverifyAgent(bytes32 _agentId) external onlyOwner {
        verifiedAgents[_agentId] = false;
        emit AgentUnverified(_agentId);
    }
    
    function batchVerifyAgents(bytes32[] calldata _agentIds) external onlyOwner {
        for (uint256 i = 0; i < _agentIds.length; i++) {
            verifiedAgents[_agentIds[i]] = true;
            emit AgentVerified(_agentIds[i]);
        }
    }
    
    // ============ View Functions ============
    
    function getSubmission(uint256 _disputeId) external view returns (VoteSubmission memory) {
        return submissions[_disputeId];
    }
    
    function isRelayer(address _address) external view returns (bool) {
        return relayers[_address];
    }
    
    function isAgentVerified(bytes32 _agentId) external view returns (bool) {
        return verifiedAgents[_agentId];
    }
}

/**
 * @title IMoltbookArbitratorOracle
 * @notice Interface for MoltbookArbitrator called by oracle
 */
interface IMoltbookArbitratorOracle {
    function submitMoltbookResult(
        uint256 _disputeId,
        uint256 _forClaimant,
        uint256 _forRespondent,
        uint256 _abstained,
        bytes32[] calldata _agentIds,
        bytes[] calldata _signatures
    ) external;
}
