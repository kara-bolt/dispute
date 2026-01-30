// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IKARA.sol";

/**
 * @title KaraDisputeV2
 * @notice Core arbitration contract for KaraDispute with $KARA token integration
 * @dev Moltbook AI agents vote on disputes. $KARA is used for arbitration fees and arbitrator staking.
 * 
 * $KARA Integration:
 * - Arbitration fees paid in $KARA (with holder discounts)
 * - Arbitrators must stake $KARA to participate
 * - Staked KARA can be slashed for misbehavior
 */
contract KaraDisputeV2 is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
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
        uint256 karaFeePaid;        // Amount of KARA paid as fee
    }
    
    struct VoteResult {
        uint256 forClaimant;        // Votes for ruling = 1
        uint256 forRespondent;      // Votes for ruling = 2
        uint256 abstained;          // Votes for ruling = 0
        bytes32[] agentIds;         // Moltbook agent identifiers who voted
        bytes[] signatures;         // Signatures from agents
    }
    
    struct ArbitratorStake {
        uint256 amount;             // Amount of KARA staked
        uint256 stakedAt;           // When staking started
        uint256 lockedUntil;        // Lock period end
        uint256 slashedAmount;      // Total amount slashed
        bool active;                // Is actively staking
    }
    
    // ============ State ============
    
    /// @notice $KARA token contract
    IERC20 public immutable karaToken;
    
    address public oracle;                          // MoltbookOracle address
    uint256 public disputeCount;                    // Total disputes created
    uint256 public arbitrationFeeKara;              // Base fee in KARA tokens
    uint256 public votingPeriod;                    // Time for voting (seconds)
    uint256 public minVotesInitial;                 // Minimum votes for initial round
    uint256 public appealMultiplier;                // Multiplier for appeal votes (2x by default)
    
    /// @notice Minimum KARA stake required for arbitrators
    uint256 public minArbitratorStake;
    
    /// @notice Lock period for staked KARA (default 7 days)
    uint256 public stakeLockPeriod;
    
    /// @notice Treasury address for collecting fees
    address public treasury;
    
    /// @notice Total KARA collected in fees
    uint256 public totalFeesCollected;
    
    /// @notice Whether ETH payments are still accepted (for migration period)
    bool public acceptEthPayments;
    uint256 public arbitrationFeeEth;              // Legacy ETH fee
    
    mapping(uint256 => Dispute) public disputes;
    mapping(uint256 => VoteResult) public voteResults;
    mapping(uint256 => mapping(bytes32 => bool)) public hasVoted; // disputeId => agentId => voted
    
    /// @notice Arbitrator stakes: address => ArbitratorStake
    mapping(address => ArbitratorStake) public arbitratorStakes;
    
    /// @notice Total KARA staked by arbitrators
    uint256 public totalStaked;
    
    // ============ Events ============
    
    event DisputeCreated(
        uint256 indexed disputeId,
        address indexed claimant,
        address indexed respondent,
        address arbitrable,
        uint256 amount,
        string evidenceURI,
        uint256 karaFeePaid
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
    
    event ArbitratorStaked(
        address indexed arbitrator,
        uint256 amount,
        uint256 totalStaked
    );
    
    event ArbitratorUnstaked(
        address indexed arbitrator,
        uint256 amount
    );
    
    event ArbitratorSlashed(
        address indexed arbitrator,
        uint256 amount,
        string reason
    );
    
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);
    event ArbitrationFeeUpdated(uint256 oldFee, uint256 newFee);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    
    // ============ Errors ============
    
    error DisputeNotFound();
    error DisputeNotOpen();
    error DisputeNotVoting();
    error DisputeAlreadyResolved();
    error OnlyOracle();
    error OnlyArbitrable();
    error InsufficientFee();
    error InsufficientStake();
    error StakeLocked();
    error VotingPeriodNotEnded();
    error VotingPeriodEnded();
    error QuorumNotReached();
    error InvalidRuling();
    error AppealNotAllowed();
    error ZeroAddress();
    error ZeroAmount();
    error NotStaking();
    error AlreadyStaking();
    error EthPaymentsDisabled();
    
    // ============ Modifiers ============
    
    modifier onlyOracle() {
        if (msg.sender != oracle) revert OnlyOracle();
        _;
    }
    
    modifier onlyStakedArbitrator() {
        if (!arbitratorStakes[msg.sender].active) revert NotStaking();
        if (arbitratorStakes[msg.sender].amount < minArbitratorStake) revert InsufficientStake();
        _;
    }
    
    // ============ Constructor ============
    
    constructor(
        address _karaToken,
        address _oracle,
        address _treasury,
        uint256 _arbitrationFeeKara,
        uint256 _votingPeriod,
        uint256 _minVotesInitial
    ) Ownable(msg.sender) {
        if (_karaToken == address(0)) revert ZeroAddress();
        if (_oracle == address(0)) revert ZeroAddress();
        if (_treasury == address(0)) revert ZeroAddress();
        
        karaToken = IERC20(_karaToken);
        oracle = _oracle;
        treasury = _treasury;
        arbitrationFeeKara = _arbitrationFeeKara;
        votingPeriod = _votingPeriod;
        minVotesInitial = _minVotesInitial;
        appealMultiplier = 2;
        minArbitratorStake = KARAConstants.MIN_ARBITRATOR_STAKE;
        stakeLockPeriod = 7 days;
        acceptEthPayments = true; // Allow ETH during migration
    }
    
    // ============ Staking Functions ============
    
    /**
     * @notice Stake KARA to become an arbitrator
     * @param _amount Amount of KARA to stake
     */
    function stakeKara(uint256 _amount) external nonReentrant {
        if (_amount == 0) revert ZeroAmount();
        
        ArbitratorStake storage stake = arbitratorStakes[msg.sender];
        
        // Transfer KARA from sender
        karaToken.safeTransferFrom(msg.sender, address(this), _amount);
        
        stake.amount += _amount;
        stake.stakedAt = block.timestamp;
        stake.lockedUntil = block.timestamp + stakeLockPeriod;
        stake.active = true;
        
        totalStaked += _amount;
        
        emit ArbitratorStaked(msg.sender, _amount, stake.amount);
    }
    
    /**
     * @notice Unstake KARA (after lock period)
     * @param _amount Amount to unstake
     */
    function unstakeKara(uint256 _amount) external nonReentrant {
        ArbitratorStake storage stake = arbitratorStakes[msg.sender];
        
        if (!stake.active) revert NotStaking();
        if (block.timestamp < stake.lockedUntil) revert StakeLocked();
        if (_amount > stake.amount) revert InsufficientStake();
        
        stake.amount -= _amount;
        totalStaked -= _amount;
        
        if (stake.amount == 0) {
            stake.active = false;
        }
        
        karaToken.safeTransfer(msg.sender, _amount);
        
        emit ArbitratorUnstaked(msg.sender, _amount);
    }
    
    /**
     * @notice Slash an arbitrator's stake (only owner)
     * @param _arbitrator Address to slash
     * @param _amount Amount to slash
     * @param _reason Reason for slashing
     */
    function slashArbitrator(
        address _arbitrator,
        uint256 _amount,
        string calldata _reason
    ) external onlyOwner {
        ArbitratorStake storage stake = arbitratorStakes[_arbitrator];
        
        if (!stake.active) revert NotStaking();
        
        uint256 slashAmount = _amount > stake.amount ? stake.amount : _amount;
        stake.amount -= slashAmount;
        stake.slashedAmount += slashAmount;
        totalStaked -= slashAmount;
        
        // Send slashed KARA to treasury
        karaToken.safeTransfer(treasury, slashAmount);
        
        if (stake.amount == 0) {
            stake.active = false;
        }
        
        emit ArbitratorSlashed(_arbitrator, slashAmount, _reason);
    }
    
    // ============ Dispute Functions ============
    
    /**
     * @notice Create a new dispute with KARA fee
     * @param _claimant Address of the claimant
     * @param _respondent Address of the respondent
     * @param _amount Amount at stake
     * @param _evidenceURI URI to evidence (IPFS hash recommended)
     * @return disputeId The ID of the created dispute
     */
    function createDisputeWithKara(
        address _claimant,
        address _respondent,
        uint256 _amount,
        string calldata _evidenceURI
    ) external nonReentrant returns (uint256 disputeId) {
        if (_claimant == address(0) || _respondent == address(0)) revert ZeroAddress();
        
        // Calculate fee with holder discount
        uint256 fee = getArbitrationCostKara(msg.sender);
        
        // Transfer KARA fee
        karaToken.safeTransferFrom(msg.sender, address(this), fee);
        
        // Send fee to treasury
        karaToken.safeTransfer(treasury, fee);
        totalFeesCollected += fee;
        
        disputeId = _createDispute(_claimant, _respondent, _amount, _evidenceURI, fee);
    }
    
    /**
     * @notice Create a new dispute with ETH (legacy, migration period only)
     */
    function createDispute(
        address _claimant,
        address _respondent,
        uint256 _amount,
        string calldata _evidenceURI
    ) external payable returns (uint256 disputeId) {
        if (!acceptEthPayments) revert EthPaymentsDisabled();
        if (msg.value < arbitrationFeeEth) revert InsufficientFee();
        if (_claimant == address(0) || _respondent == address(0)) revert ZeroAddress();
        
        // Send ETH to treasury
        (bool success, ) = treasury.call{value: msg.value}("");
        require(success, "ETH transfer failed");
        
        disputeId = _createDispute(_claimant, _respondent, _amount, _evidenceURI, 0);
    }
    
    function _createDispute(
        address _claimant,
        address _respondent,
        uint256 _amount,
        string calldata _evidenceURI,
        uint256 _karaFeePaid
    ) internal returns (uint256 disputeId) {
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
            requiredVotes: minVotesInitial,
            karaFeePaid: _karaFeePaid
        });
        
        emit DisputeCreated(
            disputeId,
            _claimant,
            _respondent,
            msg.sender,
            _amount,
            _evidenceURI,
            _karaFeePaid
        );
    }
    
    /**
     * @notice Submit Moltbook voting results (called by oracle)
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
        
        voteResults[_disputeId] = VoteResult({
            forClaimant: _forClaimant,
            forRespondent: _forRespondent,
            abstained: _abstained,
            agentIds: _agentIds,
            signatures: _signatures
        });
        
        for (uint256 i = 0; i < _agentIds.length; i++) {
            hasVoted[_disputeId][_agentIds[i]] = true;
        }
        
        dispute.status = DisputeStatus.Voting;
        
        emit VotesSubmitted(_disputeId, _forClaimant, _forRespondent, _abstained);
    }
    
    /**
     * @notice Execute the ruling after voting period ends
     */
    function resolveDispute(uint256 _disputeId) external nonReentrant {
        Dispute storage dispute = disputes[_disputeId];
        if (dispute.status != DisputeStatus.Voting) revert DisputeNotVoting();
        
        VoteResult storage result = voteResults[_disputeId];
        uint256 totalVotes = result.forClaimant + result.forRespondent + result.abstained;
        
        if (totalVotes < dispute.requiredVotes) revert QuorumNotReached();
        
        Ruling ruling;
        if (result.forClaimant > result.forRespondent) {
            ruling = Ruling.Claimant;
        } else if (result.forRespondent > result.forClaimant) {
            ruling = Ruling.Respondent;
        } else {
            ruling = Ruling.RefusedToArbitrate;
        }
        
        dispute.ruling = ruling;
        dispute.status = DisputeStatus.Resolved;
        dispute.resolvedAt = block.timestamp;
        
        IArbitrable(dispute.arbitrable).rule(_disputeId, uint256(ruling));
        
        emit DisputeResolved(_disputeId, ruling, result.forClaimant, result.forRespondent);
    }
    
    /**
     * @notice Appeal a dispute with KARA fee
     */
    function appealWithKara(uint256 _disputeId) external nonReentrant {
        Dispute storage dispute = disputes[_disputeId];
        if (dispute.status != DisputeStatus.Voting && dispute.status != DisputeStatus.Resolved) {
            revert AppealNotAllowed();
        }
        if (msg.sender != dispute.claimant && msg.sender != dispute.respondent) {
            revert AppealNotAllowed();
        }
        
        // Appeal costs 2x base fee
        uint256 appealFee = getArbitrationCostKara(msg.sender) * 2;
        karaToken.safeTransferFrom(msg.sender, address(this), appealFee);
        karaToken.safeTransfer(treasury, appealFee);
        totalFeesCollected += appealFee;
        
        _processAppeal(_disputeId, dispute);
    }
    
    /**
     * @notice Appeal with ETH (legacy)
     */
    function appeal(uint256 _disputeId) external payable {
        if (!acceptEthPayments) revert EthPaymentsDisabled();
        
        Dispute storage dispute = disputes[_disputeId];
        if (dispute.status != DisputeStatus.Voting && dispute.status != DisputeStatus.Resolved) {
            revert AppealNotAllowed();
        }
        if (msg.sender != dispute.claimant && msg.sender != dispute.respondent) {
            revert AppealNotAllowed();
        }
        if (msg.value < arbitrationFeeEth * 2) revert InsufficientFee();
        
        (bool success, ) = treasury.call{value: msg.value}("");
        require(success, "ETH transfer failed");
        
        _processAppeal(_disputeId, dispute);
    }
    
    function _processAppeal(uint256 _disputeId, Dispute storage dispute) internal {
        dispute.status = DisputeStatus.Open;
        dispute.appealRound++;
        dispute.requiredVotes = dispute.requiredVotes * appealMultiplier;
        dispute.votingDeadline = block.timestamp + votingPeriod;
        
        delete voteResults[_disputeId];
        
        emit DisputeAppealed(_disputeId, dispute.appealRound, dispute.requiredVotes);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get arbitration cost in KARA with holder discount
     * @param _holder Address to check for discount
     */
    function getArbitrationCostKara(address _holder) public view returns (uint256) {
        uint256 baseFee = arbitrationFeeKara;
        uint256 discount = getHolderDiscount(_holder);
        
        return baseFee - (baseFee * discount / KARAConstants.BASIS_POINTS);
    }
    
    /**
     * @notice Get discount for KARA holder (in basis points)
     */
    function getHolderDiscount(address _holder) public view returns (uint256) {
        uint256 balance = karaToken.balanceOf(_holder);
        
        if (balance >= KARAConstants.TIER4_THRESHOLD) {
            return KARAConstants.TIER4_DISCOUNT; // 30%
        } else if (balance >= KARAConstants.TIER3_THRESHOLD) {
            return KARAConstants.TIER3_DISCOUNT; // 20%
        } else if (balance >= KARAConstants.TIER2_THRESHOLD) {
            return KARAConstants.TIER2_DISCOUNT; // 10%
        } else if (balance >= KARAConstants.TIER1_THRESHOLD) {
            return KARAConstants.TIER1_DISCOUNT; // 5%
        }
        
        return 0;
    }
    
    function getDispute(uint256 _disputeId) external view returns (Dispute memory) {
        return disputes[_disputeId];
    }
    
    function getVoteResult(uint256 _disputeId) external view returns (VoteResult memory) {
        return voteResults[_disputeId];
    }
    
    function getArbitratorStake(address _arbitrator) external view returns (ArbitratorStake memory) {
        return arbitratorStakes[_arbitrator];
    }
    
    function arbitrationCost() external view returns (uint256) {
        return arbitrationFeeEth;
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
    
    function isArbitratorActive(address _arbitrator) external view returns (bool) {
        return arbitratorStakes[_arbitrator].active && 
               arbitratorStakes[_arbitrator].amount >= minArbitratorStake;
    }
    
    // ============ Admin Functions ============
    
    function setOracle(address _oracle) external onlyOwner {
        if (_oracle == address(0)) revert ZeroAddress();
        emit OracleUpdated(oracle, _oracle);
        oracle = _oracle;
    }
    
    function setArbitrationFeeKara(uint256 _fee) external onlyOwner {
        emit ArbitrationFeeUpdated(arbitrationFeeKara, _fee);
        arbitrationFeeKara = _fee;
    }
    
    function setArbitrationFeeEth(uint256 _fee) external onlyOwner {
        arbitrationFeeEth = _fee;
    }
    
    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, _treasury);
        treasury = _treasury;
    }
    
    function setMinArbitratorStake(uint256 _minStake) external onlyOwner {
        minArbitratorStake = _minStake;
    }
    
    function setStakeLockPeriod(uint256 _period) external onlyOwner {
        stakeLockPeriod = _period;
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
    
    function setAcceptEthPayments(bool _accept) external onlyOwner {
        acceptEthPayments = _accept;
    }
    
    function withdrawFees(address payable _to) external onlyOwner {
        (bool success, ) = _to.call{value: address(this).balance}("");
        require(success, "Transfer failed");
    }
    
    function emergencyWithdrawKara(address _to, uint256 _amount) external onlyOwner {
        karaToken.safeTransfer(_to, _amount);
    }
}

/**
 * @title IArbitrable
 * @notice Interface for contracts that can receive rulings
 */
interface IArbitrable {
    function rule(uint256 _disputeId, uint256 _ruling) external;
}
