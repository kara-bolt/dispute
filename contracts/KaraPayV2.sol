// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IKARA.sol";

/**
 * @title KaraPayV2
 * @notice Escrow and payment contract with $KARA token integration
 * @dev Integrates with KaraDisputeV2 for dispute resolution
 * 
 * $KARA Integration:
 * - Protocol fees paid in $KARA
 * - Holder discounts on transaction fees
 * - Option to pay fees in KARA or settlement token
 */
contract KaraPayV2 is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ============ Enums ============
    
    enum TransactionStatus {
        None,
        Created,
        Funded,
        Disputed,
        Resolved,
        Cancelled,
        Released
    }
    
    enum FeePaymentMethod {
        SettlementToken,   // Pay fee in the same token as settlement
        KARA               // Pay fee in KARA (discount applies)
    }
    
    // ============ Structs ============
    
    struct Transaction {
        address payer;              // Party paying into escrow
        address payee;              // Party receiving from escrow
        address token;              // ERC20 token (address(0) for ETH)
        uint256 amount;             // Amount in escrow
        TransactionStatus status;
        uint256 disputeId;          // ID in arbitrator (0 if no dispute)
        string description;         // Transaction description
        uint256 deadline;           // Deadline for payer to dispute
        uint256 createdAt;
        uint256 protocolFee;        // Fee amount
        FeePaymentMethod feeMethod; // How fee was paid
        bool feePaidInKara;         // True if fee paid in KARA
    }
    
    struct FeeConfig {
        uint256 baseFeeBps;         // Base fee in basis points (e.g., 100 = 1%)
        uint256 minFeeKara;         // Minimum fee in KARA
        uint256 maxFeeBps;          // Maximum fee cap in basis points
    }
    
    // ============ State ============
    
    /// @notice $KARA token contract
    IERC20 public immutable karaToken;
    
    /// @notice Arbitrator contract
    IKaraDisputeV2 public arbitrator;
    
    /// @notice Treasury for collecting fees
    address public treasury;
    
    /// @notice Fee configuration
    FeeConfig public feeConfig;
    
    /// @notice Transaction counter
    uint256 public transactionCount;
    
    /// @notice Total fees collected in KARA
    uint256 public totalKaraFeesCollected;
    
    /// @notice Total transactions processed
    uint256 public totalTransactionsProcessed;
    
    /// @notice Total volume by token
    mapping(address => uint256) public volumeByToken;
    
    mapping(uint256 => Transaction) public transactions;
    mapping(uint256 => uint256) public disputeToTransaction;
    
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
        uint256 amount,
        uint256 protocolFee,
        bool feePaidInKara
    );
    
    event PaymentReleased(
        uint256 indexed transactionId,
        address indexed recipient,
        uint256 amount,
        uint256 feeDeducted
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
    
    event FeeConfigUpdated(
        uint256 baseFeeBps,
        uint256 minFeeKara,
        uint256 maxFeeBps
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
    error InvalidFeeConfig();
    
    // ============ Constructor ============
    
    constructor(
        address _karaToken,
        address _arbitrator,
        address _treasury
    ) Ownable(msg.sender) {
        if (_karaToken == address(0)) revert ZeroAddress();
        if (_arbitrator == address(0)) revert ZeroAddress();
        if (_treasury == address(0)) revert ZeroAddress();
        
        karaToken = IERC20(_karaToken);
        arbitrator = IKaraDisputeV2(_arbitrator);
        treasury = _treasury;
        
        // Default fee config: 1% fee, min 10 KARA, max 5%
        feeConfig = FeeConfig({
            baseFeeBps: 100,           // 1%
            minFeeKara: 10 * 1e18,     // 10 KARA minimum
            maxFeeBps: 500             // 5% max
        });
    }
    
    // ============ Transaction Functions ============
    
    /**
     * @notice Create a new escrow transaction
     * @param _payee Recipient of funds if no dispute
     * @param _token Token address (address(0) for ETH)
     * @param _amount Amount to be escrowed
     * @param _description Description of the transaction
     * @param _disputeDeadline Time until payer can no longer dispute
     * @param _payFeeInKara Whether to pay protocol fee in KARA
     * @return transactionId The ID of the created transaction
     */
    function createTransaction(
        address _payee,
        address _token,
        uint256 _amount,
        string calldata _description,
        uint256 _disputeDeadline,
        bool _payFeeInKara
    ) external payable nonReentrant returns (uint256 transactionId) {
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
            createdAt: block.timestamp,
            protocolFee: 0,
            feeMethod: _payFeeInKara ? FeePaymentMethod.KARA : FeePaymentMethod.SettlementToken,
            feePaidInKara: false
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
        
        // Auto-fund if value sent
        if (msg.value > 0 && _token == address(0)) {
            _fundWithEth(transactionId, msg.value, _payFeeInKara);
        }
    }
    
    /**
     * @notice Fund a transaction with ERC20 tokens
     * @param _transactionId Transaction to fund
     * @param _payFeeInKara Whether to pay fee in KARA
     */
    function fundWithToken(
        uint256 _transactionId,
        bool _payFeeInKara
    ) external nonReentrant {
        Transaction storage txn = transactions[_transactionId];
        if (txn.status != TransactionStatus.Created) revert InvalidStatus();
        if (txn.token == address(0)) revert InvalidAmount(); // Use fundWithEth for ETH
        
        // Calculate fee
        uint256 fee = calculateFee(txn.amount, msg.sender, _payFeeInKara);
        
        if (_payFeeInKara) {
            // Transfer full amount in settlement token
            IERC20(txn.token).safeTransferFrom(msg.sender, address(this), txn.amount);
            // Transfer fee in KARA
            uint256 karaFee = calculateKaraFee(txn.amount, msg.sender);
            karaToken.safeTransferFrom(msg.sender, treasury, karaFee);
            txn.protocolFee = karaFee;
            txn.feePaidInKara = true;
            totalKaraFeesCollected += karaFee;
        } else {
            // Transfer amount + fee in settlement token
            uint256 totalAmount = txn.amount + fee;
            IERC20(txn.token).safeTransferFrom(msg.sender, address(this), totalAmount);
            // Send fee to treasury
            IERC20(txn.token).safeTransfer(treasury, fee);
            txn.protocolFee = fee;
            txn.feePaidInKara = false;
        }
        
        txn.status = TransactionStatus.Funded;
        volumeByToken[txn.token] += txn.amount;
        totalTransactionsProcessed++;
        
        emit TransactionFunded(_transactionId, txn.amount, txn.protocolFee, txn.feePaidInKara);
    }
    
    /**
     * @notice Fund a transaction with ETH
     */
    function fundWithEth(uint256 _transactionId, bool _payFeeInKara) external payable nonReentrant {
        _fundWithEth(_transactionId, msg.value, _payFeeInKara);
    }
    
    function _fundWithEth(uint256 _transactionId, uint256 _value, bool _payFeeInKara) internal {
        Transaction storage txn = transactions[_transactionId];
        if (txn.status != TransactionStatus.Created) revert InvalidStatus();
        if (txn.token != address(0)) revert InvalidAmount(); // Must be ETH transaction
        
        if (_payFeeInKara) {
            // Only need the exact amount in ETH
            if (_value < txn.amount) revert InsufficientPayment();
            
            // Pay fee in KARA
            uint256 karaFee = calculateKaraFee(txn.amount, msg.sender);
            karaToken.safeTransferFrom(msg.sender, treasury, karaFee);
            txn.protocolFee = karaFee;
            txn.feePaidInKara = true;
            totalKaraFeesCollected += karaFee;
            
            // Refund excess ETH
            if (_value > txn.amount) {
                (bool success, ) = msg.sender.call{value: _value - txn.amount}("");
                require(success, "Refund failed");
            }
        } else {
            // Need amount + fee in ETH
            uint256 fee = calculateFee(txn.amount, msg.sender, false);
            uint256 totalRequired = txn.amount + fee;
            if (_value < totalRequired) revert InsufficientPayment();
            
            // Send fee to treasury
            (bool success, ) = treasury.call{value: fee}("");
            require(success, "Fee transfer failed");
            
            txn.protocolFee = fee;
            txn.feePaidInKara = false;
            
            // Refund excess
            if (_value > totalRequired) {
                (success, ) = msg.sender.call{value: _value - totalRequired}("");
                require(success, "Refund failed");
            }
        }
        
        txn.status = TransactionStatus.Funded;
        volumeByToken[address(0)] += txn.amount;
        totalTransactionsProcessed++;
        
        emit TransactionFunded(_transactionId, txn.amount, txn.protocolFee, txn.feePaidInKara);
    }
    
    /**
     * @notice Release funds to payee
     */
    function release(uint256 _transactionId) external nonReentrant {
        Transaction storage txn = transactions[_transactionId];
        if (txn.status != TransactionStatus.Funded) revert InvalidStatus();
        
        // Either payer releases voluntarily, or deadline has passed
        if (msg.sender != txn.payer && block.timestamp < txn.deadline) {
            revert OnlyPayer();
        }
        
        txn.status = TransactionStatus.Released;
        _transfer(txn.token, txn.payee, txn.amount);
        
        emit PaymentReleased(_transactionId, txn.payee, txn.amount, 0);
    }
    
    /**
     * @notice Raise a dispute (KARA payment only)
     */
    function raiseDisputeWithKara(
        uint256 _transactionId,
        string calldata _evidenceURI
    ) external nonReentrant {
        Transaction storage txn = transactions[_transactionId];
        if (txn.status != TransactionStatus.Funded) revert InvalidStatus();
        if (msg.sender != txn.payer) revert OnlyPayer();
        if (block.timestamp >= txn.deadline) revert DeadlinePassed();
        
        // Get arbitration cost in KARA
        uint256 arbitrationCost = arbitrator.getArbitrationCostKara(msg.sender);
        
        // Transfer KARA to this contract first
        karaToken.safeTransferFrom(msg.sender, address(this), arbitrationCost);
        
        // Approve arbitrator to spend KARA
        karaToken.approve(address(arbitrator), arbitrationCost);
        
        // Create dispute
        uint256 disputeId = arbitrator.createDisputeWithKara(
            txn.payer,
            txn.payee,
            txn.amount,
            _evidenceURI
        );
        
        txn.status = TransactionStatus.Disputed;
        txn.disputeId = disputeId;
        disputeToTransaction[disputeId] = _transactionId;
        
        emit DisputeRaised(_transactionId, disputeId, _evidenceURI);
    }
    
    /**
     * @notice Receive ruling from arbitrator
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
     */
    function cancel(uint256 _transactionId) external {
        Transaction storage txn = transactions[_transactionId];
        if (txn.status != TransactionStatus.Created) revert InvalidStatus();
        if (msg.sender != txn.payer) revert OnlyPayer();
        
        txn.status = TransactionStatus.Cancelled;
        emit TransactionCancelled(_transactionId);
    }
    
    // ============ Fee Calculation ============
    
    /**
     * @notice Calculate fee for a transaction
     * @param _amount Transaction amount
     * @param _payer Address of payer (for holder discount)
     * @param _payInKara Whether paying in KARA
     */
    function calculateFee(
        uint256 _amount,
        address _payer,
        bool _payInKara
    ) public view returns (uint256) {
        if (_payInKara) {
            return calculateKaraFee(_amount, _payer);
        }
        
        // Calculate fee in settlement token
        uint256 fee = (_amount * feeConfig.baseFeeBps) / KARAConstants.BASIS_POINTS;
        
        // Apply holder discount
        uint256 discount = getHolderDiscount(_payer);
        fee = fee - (fee * discount / KARAConstants.BASIS_POINTS);
        
        // Apply max cap
        uint256 maxFee = (_amount * feeConfig.maxFeeBps) / KARAConstants.BASIS_POINTS;
        if (fee > maxFee) {
            fee = maxFee;
        }
        
        return fee;
    }
    
    /**
     * @notice Calculate fee in KARA tokens
     * @dev KARA fees are discounted compared to settlement token fees
     */
    function calculateKaraFee(
        uint256 _amount,
        address _payer
    ) public view returns (uint256) {
        // Base fee calculation (same as settlement token)
        uint256 baseFee = (_amount * feeConfig.baseFeeBps) / KARAConstants.BASIS_POINTS;
        
        // Apply holder discount
        uint256 discount = getHolderDiscount(_payer);
        uint256 discountedFee = baseFee - (baseFee * discount / KARAConstants.BASIS_POINTS);
        
        // Additional 20% discount for paying in KARA
        discountedFee = discountedFee - (discountedFee * 2000 / KARAConstants.BASIS_POINTS);
        
        // Enforce minimum
        if (discountedFee < feeConfig.minFeeKara) {
            discountedFee = feeConfig.minFeeKara;
        }
        
        return discountedFee;
    }
    
    /**
     * @notice Get discount based on KARA holdings
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
    
    // ============ View Functions ============
    
    function getTransaction(uint256 _transactionId) external view returns (Transaction memory) {
        return transactions[_transactionId];
    }
    
    function getTransactionByDispute(uint256 _disputeId) external view returns (Transaction memory) {
        return transactions[disputeToTransaction[_disputeId]];
    }
    
    function getHolderTier(address _holder) external view returns (uint8) {
        uint256 balance = karaToken.balanceOf(_holder);
        
        if (balance >= KARAConstants.TIER4_THRESHOLD) return 4;
        if (balance >= KARAConstants.TIER3_THRESHOLD) return 3;
        if (balance >= KARAConstants.TIER2_THRESHOLD) return 2;
        if (balance >= KARAConstants.TIER1_THRESHOLD) return 1;
        return 0;
    }
    
    // ============ Admin Functions ============
    
    function setArbitrator(address _arbitrator) external onlyOwner {
        if (_arbitrator == address(0)) revert ZeroAddress();
        arbitrator = IKaraDisputeV2(_arbitrator);
    }
    
    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        treasury = _treasury;
    }
    
    function setFeeConfig(
        uint256 _baseFeeBps,
        uint256 _minFeeKara,
        uint256 _maxFeeBps
    ) external onlyOwner {
        if (_baseFeeBps > _maxFeeBps) revert InvalidFeeConfig();
        if (_maxFeeBps > 1000) revert InvalidFeeConfig(); // Max 10%
        
        feeConfig = FeeConfig({
            baseFeeBps: _baseFeeBps,
            minFeeKara: _minFeeKara,
            maxFeeBps: _maxFeeBps
        });
        
        emit FeeConfigUpdated(_baseFeeBps, _minFeeKara, _maxFeeBps);
    }
    
    function emergencyWithdraw(address _token, address _to, uint256 _amount) external onlyOwner {
        if (_token == address(0)) {
            (bool success, ) = _to.call{value: _amount}("");
            require(success, "Transfer failed");
        } else {
            IERC20(_token).safeTransfer(_to, _amount);
        }
    }
    
    // ============ Internal Functions ============
    
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
 * @title IKaraDisputeV2
 * @notice Interface for KaraDisputeV2 arbitrator
 */
interface IKaraDisputeV2 {
    function createDisputeWithKara(
        address _claimant,
        address _respondent,
        uint256 _amount,
        string calldata _evidenceURI
    ) external returns (uint256);
    
    function getArbitrationCostKara(address _holder) external view returns (uint256);
}
