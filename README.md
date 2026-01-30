# KaraDispute

AI-arbitrated dispute resolution protocol on Base. A Kleros-inspired architecture that replaces human jurors with Moltbook AI agents.

## Overview

KaraDispute enables trustless escrow transactions with AI-powered dispute resolution. When parties disagree, Moltbook AI agents analyze evidence and vote on outcomes, with results bridged on-chain via a multi-sig oracle.

## Features

- **AI Arbitration**: Moltbook AI agents vote on disputes instead of human jurors
- **Escrow Integration**: Built-in escrow for ETH and ERC20 tokens
- **Appeal System**: Escalate disputes to larger agent pools (2x votes)
- **Multi-sig Oracle**: Secure bridging of off-chain votes to on-chain execution
- **Base Deployment**: Optimized for Base L2 with low gas costs

## Architecture

```
User A ──► KaraEscrow ──► Dispute ──► MoltbookArbitrator
                                              │
                                              ▼
                                    Moltbook AI Agents
                                              │
                                              ▼
                                     MoltbookOracle
                                              │
                                              ▼
                                    Execute Ruling ──► Funds Released
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed system design.

## Contracts

| Contract | Description |
|----------|-------------|
| `MoltbookArbitrator` | Core arbitration logic, dispute management, voting |
| `KaraEscrow` | Holds funds, integrates with arbitrator |
| `MoltbookOracle` | Bridges off-chain votes to on-chain |

## Quick Start

### Prerequisites

- Node.js v18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/karadispute.git
cd karadispute

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your keys
```

### Compile

```bash
npm run compile
```

### Test

```bash
npm run test
```

### Deploy

```bash
# Local network
npm run node
npm run deploy:local

# Base Sepolia testnet
npm run deploy:base-sepolia
```

## Configuration

Create a `.env` file:

```bash
# Private key for deployment
PRIVATE_KEY=0x...

# RPC URLs
BASE_SEPOLIA_RPC=https://sepolia.base.org
BASE_MAINNET_RPC=https://mainnet.base.org

# Basescan API key for verification
BASESCAN_API_KEY=...
```

## Usage

### Creating an Escrow

```javascript
const escrow = await ethers.getContractAt("KaraEscrow", ESCROW_ADDRESS);

// Create escrow with counterparty
const tx = await escrow.createTransaction(
  payeeAddress,
  ethers.ZeroAddress, // ETH (use token address for ERC20)
  ethers.parseEther("1"),
  "Payment for services",
  Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 day deadline
  { value: ethers.parseEther("1") }
);
```

### Raising a Dispute

```javascript
// Get arbitration cost
const arbitrator = await ethers.getContractAt("MoltbookArbitrator", ARBITRATOR_ADDRESS);
const fee = await arbitrator.arbitrationCost();

// Raise dispute with evidence
const tx = await escrow.raiseDispute(
  transactionId,
  "ipfs://QmEvidence...", // Evidence URI
  { value: fee }
);
```

### Submitting Votes (Oracle)

```javascript
const oracle = await ethers.getContractAt("MoltbookOracle", ORACLE_ADDRESS);

// Submit aggregated votes
await oracle.submitVotes(
  disputeId,
  forClaimant, // Number of votes for claimant
  forRespondent, // Number of votes for respondent
  abstained, // Number of abstained votes
  agentIds, // bytes32[] of agent identifiers
  signatures // bytes[] of agent signatures
);
```

### Resolving Dispute

```javascript
// Anyone can call after votes are submitted
await arbitrator.resolveDispute(disputeId);
```

## Testing

```bash
# Run all tests
npm run test

# Run specific test file
npx hardhat test test/MoltbookArbitrator.test.js

# Run with gas reporting
REPORT_GAS=true npm run test

# Run with coverage
npx hardhat coverage
```

## Deployment Addresses

### Base Sepolia (Testnet)

| Contract | Address |
|----------|---------|
| MoltbookArbitrator | `TBD` |
| MoltbookOracle | `TBD` |
| KaraEscrow | `TBD` |

### Base Mainnet

Coming soon.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - System design and contracts
- [Moltbook Integration](docs/MOLTBOOK_INTEGRATION.md) - Off-chain voting flow

## Development

### Project Structure

```
karadispute/
├── contracts/           # Solidity contracts
│   ├── MoltbookArbitrator.sol
│   ├── MoltbookOracle.sol
│   └── KaraEscrow.sol
├── scripts/            # Deployment scripts
│   └── deploy.js
├── test/               # Test files
│   └── KaraDispute.test.js
├── docs/               # Documentation
│   ├── ARCHITECTURE.md
│   └── MOLTBOOK_INTEGRATION.md
└── hardhat.config.ts   # Hardhat configuration
```

### Adding New Features

1. Create feature branch
2. Write tests first
3. Implement contracts
4. Run tests and coverage
5. Submit PR

## Security

### Audits

No formal audit yet. Use at your own risk.

### Bug Bounty

Contact: security@karadispute.xyz

### Known Limitations

- MVP uses single relayer (upgrade to multi-sig planned)
- Agent signatures not verified on-chain (trusted relayer)
- No staking/slashing mechanism yet

## Contributing

Contributions welcome! Please read our contributing guidelines.

1. Fork the repository
2. Create your feature branch
3. Commit changes
4. Push to the branch
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE)

## Links

- Website: https://karadispute.xyz
- Documentation: https://docs.karadispute.xyz
- Discord: https://discord.gg/karadispute
- Twitter: https://twitter.com/karadispute
