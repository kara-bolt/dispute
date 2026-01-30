// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title KaraEscrow
 * @notice Escrow contract for KaraDispute - holds funds during arbitration
 * @dev Integrates with MoltbookArbitrator for dispute resolution
 */
contract KaraEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ============ Enums ============
    
    enum TransactionStatus {
        None,
        Created,
        Funded,
        Disputed,
        Resolved,
        Cancelled
    }
    
    // ============ Structs ============
    
    struct Transaction {
        address payer;              // Party paying into escrow
        address payee;              // Party receiving from escrow
        address token;              // ERC20 token (address(0) for ETH)
        uint256 amount;             // Amount in escrow
        TransactionStatus status;
        uint256 disputeId;          // ID in MoltbookArbitrator (0 if no dispute)
        string description;         // Transaction description
        uint256 deadline;           // Deadline for payer to dispute
        uint256 createdAt;
    }
    
    // ============ State ============
    
    IMoltbookArbitrator public immutable arbitrator;
    uint256 public transactionCount;
    
    mapping(uint256 => Transaction) public transactions;
    mapping(uint256 => uint256) public disputeToTransaction; // arbitrator disputeId => transactionId
    
    // ============ Events ============
    
    event TransactionCreated(
        uint256 indexed transactionId,
        address indexed payer,
        address indexed payee,
        address token,
        uint256 amount,
        string description,
        uint256 deadline
    );
    
    event TransactionFunded(
        uint256 indexed transactionId,
        uint256 amount
    );
    
    event PaymentReleased(
        uint256 indexed transactionId,
        address indexed recipient,
        uint256 amount
    );
    
    event DisputeRaised(
        uint256 indexed transactionId,
        uint256 indexed disputeId,
        string evidenceURI
    );
    
    event TransactionResolved(
        uint256 indexed transactionId,
        uint256 ruling,
        address recipient
    );
    
    event TransactionCancelled(
        uint256 indexed transactionId
    );
    
    // ============ Errors ============
    
    error InvalidStatus();
    error InvalidAmount();
    error DeadlinePassed();
    error DeadlineNotPassed();
    error OnlyPayer();
    error OnlyPayee();
    error OnlyArbitrator();
    error ZeroAddress();
    error TransferFailed();
    error InsufficientPayment();
    
    // ============ Constructor ============
    
    constructor(address _arbitrator) {
        if (_arbitrator == address(0)) revert ZeroAddress();
        arbitrator = IMoltbookArbitrator(_arbitrator);
    }
    
    // ============ External Functions ============
    
    /**
     * @notice Create a new escrow transaction
     * @param _payee Recipient of funds if no dispute
     * @param _token Token address (address(0) for ETH)
     * @param _amount Amount to be escrowed
     * @param _description Description of the transaction
     * @param _disputeDeadline Time until payer can no longer dispute
     * @return transactionId The ID of the created transaction
     */
    function createTransaction(
        address _payee,
        address _token,
        uint256 _amount,
        string calldata _description,
        uint256 _disputeDeadline
    ) external payable returns (uint256 transactionId) {
        if (_payee == address(0)) revert ZeroAddress();
        if (_amount == 0) revert InvalidAmount();
        
        transactionId = transactionCount++;
        
        transactions[transactionId] = Transaction({
            payer: msg.sender,
            payee: _payee,
            token: _token,
            amount: _amount,
            status: TransactionStatus.Created,
            disputeId: 0,
            description: _description,
            deadline: _disputeDeadline,
            createdAt: block.timestamp
        });
        
        emit TransactionCreated(
            transactionId,
            msg.sender,
            _payee,
            _token,
            _amount,
            _description,
            _disputeDeadline
        );
        
        // Auto-fund if ETH is sent
        if (msg.value > 0) {
            if (_token != address(0)) revert InvalidAmount();
            _fund(transactionId, msg.value);
        }
    }
    
    /**
     * @notice Fund an existing transaction
     * @param _transactionId Transaction to fund
     */
    function fund(uint256 _transactionId) external payable nonReentrant {
        Transaction storage txn = transactions[_transactionId];
        if (txn.status != TransactionStatus.Created) revert InvalidStatus();
        
        if (txn.token == address(0)) {
            _fund(_transactionId, msg.value);
        } else {
            IERC20(txn.token).safeTransferFrom(msg.sender, address(this), txn.amount);
            _fund(_transactionId, txn.amount);
        }
    }
    
    /**
     * @notice Release funds to payee (called by payer or after deadline)
     * @param _transactionId Transaction to release
     */
    function release(uint256 _transactionId) external nonReentrant {
        Transaction storage txn = transactions[_transactionId];
        if (txn.status != TransactionStatus.Funded) revert InvalidStatus();
        
        // Either payer releases voluntarily, or deadline has passed
        if (msg.sender != txn.payer && block.timestamp < txn.deadline) {
            revert OnlyPayer();
        }
        
        txn.status = TransactionStatus.Resolved;
        _transfer(txn.token, txn.payee, txn.amount);
        
        emit PaymentReleased(_transactionId, txn.payee, txn.amount);
    }
    
    /**
     * @notice Raise a dispute (only payer, before deadline)
     * @param _transactionId Transaction to dispute
     * @param _evidenceURI URI to evidence supporting the dispute
     */
    function raiseDispute(
        uint256 _transactionId,
        string calldata _evidenceURI
    ) external payable nonReentrant {
        Transaction storage txn = transactions[_transactionId];
        if (txn.status != TransactionStatus.Funded) revert InvalidStatus();
        if (msg.sender != txn.payer) revert OnlyPayer();
        if (block.timestamp >= txn.deadline) revert DeadlinePassed();
        
        // Get arbitration cost
        uint256 arbitrationCost = arbitrator.arbitrationCost();
        if (msg.value < arbitrationCost) revert InsufficientPayment();
        
        // Create dispute in arbitrator
        uint256 disputeId = arbitrator.createDispute{value: arbitrationCost}(
            txn.payer,      // claimant
            txn.payee,      // respondent
            txn.amount,
            _evidenceURI
        );
        
        txn.status = TransactionStatus.Disputed;
        txn.disputeId = disputeId;
        disputeToTransaction[disputeId] = _transactionId;
        
        // Refund excess
        if (msg.value > arbitrationCost) {
            (bool success, ) = msg.sender.call{value: msg.value - arbitrationCost}("");
            require(success, "Refund failed");
        }
        
        emit DisputeRaised(_transactionId, disputeId, _evidenceURI);
    }
    
    /**
     * @notice Receive ruling from arbitrator
     * @param _disputeId The dispute ID from arbitrator
     * @param _ruling The ruling (0 = refused, 1 = claimant/payer, 2 = respondent/payee)
     */
    function rule(uint256 _disputeId, uint256 _ruling) external {
        if (msg.sender != address(arbitrator)) revert OnlyArbitrator();
        
        uint256 transactionId = disputeToTransaction[_disputeId];
        Transaction storage txn = transactions[transactionId];
        
        if (txn.status != TransactionStatus.Disputed) revert InvalidStatus();
        
        txn.status = TransactionStatus.Resolved;
        
        address recipient;
        if (_ruling == 1) {
            // Claimant (payer) wins - refund
            recipient = txn.payer;
        } else if (_ruling == 2) {
            // Respondent (payee) wins - release payment
            recipient = txn.payee;
        } else {
            // Refused to arbitrate - split 50/50
            uint256 half = txn.amount / 2;
            _transfer(txn.token, txn.payer, half);
            _transfer(txn.token, txn.payee, txn.amount - half);
            emit TransactionResolved(transactionId, _ruling, address(0));
            return;
        }
        
        _transfer(txn.token, recipient, txn.amount);
        emit TransactionResolved(transactionId, _ruling, recipient);
    }
    
    /**
     * @notice Cancel a transaction (only before funding)
     * @param _transactionId Transaction to cancel
     */
    function cancel(uint256 _transactionId) external {
        Transaction storage txn = transactions[_transactionId];
        if (txn.status != TransactionStatus.Created) revert InvalidStatus();
        if (msg.sender != txn.payer) revert OnlyPayer();
        
        txn.status = TransactionStatus.Cancelled;
        emit TransactionCancelled(_transactionId);
    }
    
    // ============ View Functions ============
    
    function getTransaction(uint256 _transactionId) external view returns (Transaction memory) {
        return transactions[_transactionId];
    }
    
    function getTransactionByDispute(uint256 _disputeId) external view returns (Transaction memory) {
        return transactions[disputeToTransaction[_disputeId]];
    }
    
    // ============ Internal Functions ============
    
    function _fund(uint256 _transactionId, uint256 _amount) internal {
        Transaction storage txn = transactions[_transactionId];
        if (_amount < txn.amount) revert InsufficientPayment();
        
        txn.status = TransactionStatus.Funded;
        emit TransactionFunded(_transactionId, _amount);
    }
    
    function _transfer(address _token, address _to, uint256 _amount) internal {
        if (_token == address(0)) {
            (bool success, ) = _to.call{value: _amount}("");
            if (!success) revert TransferFailed();
        } else {
            IERC20(_token).safeTransfer(_to, _amount);
        }
    }
    
    // ============ Receive ============
    
    receive() external payable {}
}

/**
 * @title IMoltbookArbitrator
 * @notice Interface for the MoltbookArbitrator contract
 */
interface IMoltbookArbitrator {
    function createDispute(
        address _claimant,
        address _respondent,
        uint256 _amount,
        string calldata _evidenceURI
    ) external payable returns (uint256);
    
    function arbitrationCost() external view returns (uint256);
}
