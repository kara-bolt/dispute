#!/usr/bin/env node
"use strict";

// src/cli.ts
var import_util = require("util");
var import_viem2 = require("viem");

// src/client.ts
var import_viem = require("viem");

// src/constants.ts
var import_chains = require("viem/chains");
var KARA_TOKEN_ADDRESS = "0x99926046978e9fB6544140982fB32cddC7e86b07";
var KARA_TIERS = {
  TIER1: {
    threshold: 1000n * 10n ** 18n,
    // 1,000 KARA
    discount: 500
    // 5%
  },
  TIER2: {
    threshold: 10000n * 10n ** 18n,
    // 10,000 KARA
    discount: 1e3
    // 10%
  },
  TIER3: {
    threshold: 100000n * 10n ** 18n,
    // 100,000 KARA
    discount: 2e3
    // 20%
  },
  TIER4: {
    threshold: 1000000n * 10n ** 18n,
    // 1,000,000 KARA
    discount: 3e3
    // 30%
  }
};
var MIN_ARBITRATOR_STAKE = 50000n * 10n ** 18n;
var BASIS_POINTS = 1e4;
var BASE_MAINNET_ADDRESSES = {
  karaDispute: "0x0000000000000000000000000000000000000000",
  karaEscrow: "0x0000000000000000000000000000000000000000",
  karaPay: "0x0000000000000000000000000000000000000000",
  karaToken: KARA_TOKEN_ADDRESS
};
var BASE_SEPOLIA_ADDRESSES = {
  karaDispute: "0x0000000000000000000000000000000000000000",
  karaEscrow: "0x0000000000000000000000000000000000000000",
  karaPay: "0x0000000000000000000000000000000000000000",
  karaToken: "0x0000000000000000000000000000000000000000"
  // Testnet mock
};
function getAddresses(chain) {
  return chain === "base" ? BASE_MAINNET_ADDRESSES : BASE_SEPOLIA_ADDRESSES;
}
var CHAINS = {
  base: import_chains.base,
  "base-sepolia": import_chains.baseSepolia
};
var DEFAULT_RPC_URLS = {
  base: "https://mainnet.base.org",
  "base-sepolia": "https://sepolia.base.org"
};
var DEFAULT_VOTING_PERIOD = 7 * 24 * 60 * 60;
var DEFAULT_ESCROW_DEADLINE = 7 * 24 * 60 * 60;

// src/abis/KaraDisputeV2.json
var KaraDisputeV2_default = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_karaToken",
        type: "address"
      },
      {
        internalType: "address",
        name: "_oracle",
        type: "address"
      },
      {
        internalType: "address",
        name: "_treasury",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "_arbitrationFeeKara",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "_votingPeriod",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "_minVotesInitial",
        type: "uint256"
      }
    ],
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    inputs: [],
    name: "AlreadyStaking",
    type: "error"
  },
  {
    inputs: [],
    name: "AppealNotAllowed",
    type: "error"
  },
  {
    inputs: [],
    name: "DisputeAlreadyResolved",
    type: "error"
  },
  {
    inputs: [],
    name: "DisputeNotFound",
    type: "error"
  },
  {
    inputs: [],
    name: "DisputeNotOpen",
    type: "error"
  },
  {
    inputs: [],
    name: "DisputeNotVoting",
    type: "error"
  },
  {
    inputs: [],
    name: "EthPaymentsDisabled",
    type: "error"
  },
  {
    inputs: [],
    name: "InsufficientFee",
    type: "error"
  },
  {
    inputs: [],
    name: "InsufficientStake",
    type: "error"
  },
  {
    inputs: [],
    name: "InvalidRuling",
    type: "error"
  },
  {
    inputs: [],
    name: "NotStaking",
    type: "error"
  },
  {
    inputs: [],
    name: "OnlyArbitrable",
    type: "error"
  },
  {
    inputs: [],
    name: "OnlyOracle",
    type: "error"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address"
      }
    ],
    name: "OwnableInvalidOwner",
    type: "error"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address"
      }
    ],
    name: "OwnableUnauthorizedAccount",
    type: "error"
  },
  {
    inputs: [],
    name: "QuorumNotReached",
    type: "error"
  },
  {
    inputs: [],
    name: "ReentrancyGuardReentrantCall",
    type: "error"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "token",
        type: "address"
      }
    ],
    name: "SafeERC20FailedOperation",
    type: "error"
  },
  {
    inputs: [],
    name: "StakeLocked",
    type: "error"
  },
  {
    inputs: [],
    name: "VotingPeriodEnded",
    type: "error"
  },
  {
    inputs: [],
    name: "VotingPeriodNotEnded",
    type: "error"
  },
  {
    inputs: [],
    name: "ZeroAddress",
    type: "error"
  },
  {
    inputs: [],
    name: "ZeroAmount",
    type: "error"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "oldFee",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "newFee",
        type: "uint256"
      }
    ],
    name: "ArbitrationFeeUpdated",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "arbitrator",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "string",
        name: "reason",
        type: "string"
      }
    ],
    name: "ArbitratorSlashed",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "arbitrator",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "totalStaked",
        type: "uint256"
      }
    ],
    name: "ArbitratorStaked",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "arbitrator",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      }
    ],
    name: "ArbitratorUnstaked",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "disputeId",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint8",
        name: "appealRound",
        type: "uint8"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "newRequiredVotes",
        type: "uint256"
      }
    ],
    name: "DisputeAppealed",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "disputeId",
        type: "uint256"
      },
      {
        indexed: true,
        internalType: "address",
        name: "claimant",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "respondent",
        type: "address"
      },
      {
        indexed: false,
        internalType: "address",
        name: "arbitrable",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "string",
        name: "evidenceURI",
        type: "string"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "karaFeePaid",
        type: "uint256"
      }
    ],
    name: "DisputeCreated",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "disputeId",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "enum KaraDisputeV2.Ruling",
        name: "ruling",
        type: "uint8"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "forClaimant",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "forRespondent",
        type: "uint256"
      }
    ],
    name: "DisputeResolved",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "oldOracle",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOracle",
        type: "address"
      }
    ],
    name: "OracleUpdated",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address"
      }
    ],
    name: "OwnershipTransferred",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "oldTreasury",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "newTreasury",
        type: "address"
      }
    ],
    name: "TreasuryUpdated",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "disputeId",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "forClaimant",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "forRespondent",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "abstained",
        type: "uint256"
      }
    ],
    name: "VotesSubmitted",
    type: "event"
  },
  {
    inputs: [],
    name: "acceptEthPayments",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_disputeId",
        type: "uint256"
      }
    ],
    name: "appeal",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [],
    name: "appealMultiplier",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_disputeId",
        type: "uint256"
      }
    ],
    name: "appealWithKara",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "arbitrationCost",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "arbitrationFeeEth",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "arbitrationFeeKara",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    name: "arbitratorStakes",
    outputs: [
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "stakedAt",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "lockedUntil",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "slashedAmount",
        type: "uint256"
      },
      {
        internalType: "bool",
        name: "active",
        type: "bool"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_claimant",
        type: "address"
      },
      {
        internalType: "address",
        name: "_respondent",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256"
      },
      {
        internalType: "string",
        name: "_evidenceURI",
        type: "string"
      }
    ],
    name: "createDispute",
    outputs: [
      {
        internalType: "uint256",
        name: "disputeId",
        type: "uint256"
      }
    ],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_claimant",
        type: "address"
      },
      {
        internalType: "address",
        name: "_respondent",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256"
      },
      {
        internalType: "string",
        name: "_evidenceURI",
        type: "string"
      }
    ],
    name: "createDisputeWithKara",
    outputs: [
      {
        internalType: "uint256",
        name: "disputeId",
        type: "uint256"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_disputeId",
        type: "uint256"
      }
    ],
    name: "currentRuling",
    outputs: [
      {
        internalType: "uint256",
        name: "ruling",
        type: "uint256"
      },
      {
        internalType: "bool",
        name: "tied",
        type: "bool"
      },
      {
        internalType: "bool",
        name: "resolved",
        type: "bool"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "disputeCount",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    name: "disputes",
    outputs: [
      {
        internalType: "address",
        name: "claimant",
        type: "address"
      },
      {
        internalType: "address",
        name: "respondent",
        type: "address"
      },
      {
        internalType: "address",
        name: "arbitrable",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      },
      {
        internalType: "string",
        name: "evidenceURI",
        type: "string"
      },
      {
        internalType: "enum KaraDisputeV2.DisputeStatus",
        name: "status",
        type: "uint8"
      },
      {
        internalType: "enum KaraDisputeV2.Ruling",
        name: "ruling",
        type: "uint8"
      },
      {
        internalType: "uint256",
        name: "createdAt",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "resolvedAt",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "votingDeadline",
        type: "uint256"
      },
      {
        internalType: "uint8",
        name: "appealRound",
        type: "uint8"
      },
      {
        internalType: "uint256",
        name: "requiredVotes",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "karaFeePaid",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_to",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256"
      }
    ],
    name: "emergencyWithdrawKara",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_holder",
        type: "address"
      }
    ],
    name: "getArbitrationCostKara",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_arbitrator",
        type: "address"
      }
    ],
    name: "getArbitratorStake",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256"
          },
          {
            internalType: "uint256",
            name: "stakedAt",
            type: "uint256"
          },
          {
            internalType: "uint256",
            name: "lockedUntil",
            type: "uint256"
          },
          {
            internalType: "uint256",
            name: "slashedAmount",
            type: "uint256"
          },
          {
            internalType: "bool",
            name: "active",
            type: "bool"
          }
        ],
        internalType: "struct KaraDisputeV2.ArbitratorStake",
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_disputeId",
        type: "uint256"
      }
    ],
    name: "getDispute",
    outputs: [
      {
        components: [
          {
            internalType: "address",
            name: "claimant",
            type: "address"
          },
          {
            internalType: "address",
            name: "respondent",
            type: "address"
          },
          {
            internalType: "address",
            name: "arbitrable",
            type: "address"
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256"
          },
          {
            internalType: "string",
            name: "evidenceURI",
            type: "string"
          },
          {
            internalType: "enum KaraDisputeV2.DisputeStatus",
            name: "status",
            type: "uint8"
          },
          {
            internalType: "enum KaraDisputeV2.Ruling",
            name: "ruling",
            type: "uint8"
          },
          {
            internalType: "uint256",
            name: "createdAt",
            type: "uint256"
          },
          {
            internalType: "uint256",
            name: "resolvedAt",
            type: "uint256"
          },
          {
            internalType: "uint256",
            name: "votingDeadline",
            type: "uint256"
          },
          {
            internalType: "uint8",
            name: "appealRound",
            type: "uint8"
          },
          {
            internalType: "uint256",
            name: "requiredVotes",
            type: "uint256"
          },
          {
            internalType: "uint256",
            name: "karaFeePaid",
            type: "uint256"
          }
        ],
        internalType: "struct KaraDisputeV2.Dispute",
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_holder",
        type: "address"
      }
    ],
    name: "getHolderDiscount",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_disputeId",
        type: "uint256"
      }
    ],
    name: "getVoteResult",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "forClaimant",
            type: "uint256"
          },
          {
            internalType: "uint256",
            name: "forRespondent",
            type: "uint256"
          },
          {
            internalType: "uint256",
            name: "abstained",
            type: "uint256"
          },
          {
            internalType: "bytes32[]",
            name: "agentIds",
            type: "bytes32[]"
          },
          {
            internalType: "bytes[]",
            name: "signatures",
            type: "bytes[]"
          }
        ],
        internalType: "struct KaraDisputeV2.VoteResult",
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      },
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32"
      }
    ],
    name: "hasVoted",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_arbitrator",
        type: "address"
      }
    ],
    name: "isArbitratorActive",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "karaToken",
    outputs: [
      {
        internalType: "contract IERC20",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "minArbitratorStake",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "minVotesInitial",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "oracle",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_disputeId",
        type: "uint256"
      }
    ],
    name: "resolveDispute",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bool",
        name: "_accept",
        type: "bool"
      }
    ],
    name: "setAcceptEthPayments",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_multiplier",
        type: "uint256"
      }
    ],
    name: "setAppealMultiplier",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_fee",
        type: "uint256"
      }
    ],
    name: "setArbitrationFeeEth",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_fee",
        type: "uint256"
      }
    ],
    name: "setArbitrationFeeKara",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_minStake",
        type: "uint256"
      }
    ],
    name: "setMinArbitratorStake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_minVotes",
        type: "uint256"
      }
    ],
    name: "setMinVotesInitial",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_oracle",
        type: "address"
      }
    ],
    name: "setOracle",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_period",
        type: "uint256"
      }
    ],
    name: "setStakeLockPeriod",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_treasury",
        type: "address"
      }
    ],
    name: "setTreasury",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_period",
        type: "uint256"
      }
    ],
    name: "setVotingPeriod",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_arbitrator",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256"
      },
      {
        internalType: "string",
        name: "_reason",
        type: "string"
      }
    ],
    name: "slashArbitrator",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256"
      }
    ],
    name: "stakeKara",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "stakeLockPeriod",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_disputeId",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "_forClaimant",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "_forRespondent",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "_abstained",
        type: "uint256"
      },
      {
        internalType: "bytes32[]",
        name: "_agentIds",
        type: "bytes32[]"
      },
      {
        internalType: "bytes[]",
        name: "_signatures",
        type: "bytes[]"
      }
    ],
    name: "submitMoltbookResult",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "totalFeesCollected",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "totalStaked",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address"
      }
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "treasury",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256"
      }
    ],
    name: "unstakeKara",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    name: "voteResults",
    outputs: [
      {
        internalType: "uint256",
        name: "forClaimant",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "forRespondent",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "abstained",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "votingPeriod",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address payable",
        name: "_to",
        type: "address"
      }
    ],
    name: "withdrawFees",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
];

// src/abis/KaraEscrow.json
var KaraEscrow_default = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_arbitrator",
        type: "address"
      }
    ],
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    inputs: [],
    name: "DeadlineNotPassed",
    type: "error"
  },
  {
    inputs: [],
    name: "DeadlinePassed",
    type: "error"
  },
  {
    inputs: [],
    name: "InsufficientPayment",
    type: "error"
  },
  {
    inputs: [],
    name: "InvalidAmount",
    type: "error"
  },
  {
    inputs: [],
    name: "InvalidStatus",
    type: "error"
  },
  {
    inputs: [],
    name: "OnlyArbitrator",
    type: "error"
  },
  {
    inputs: [],
    name: "OnlyPayee",
    type: "error"
  },
  {
    inputs: [],
    name: "OnlyPayer",
    type: "error"
  },
  {
    inputs: [],
    name: "ReentrancyGuardReentrantCall",
    type: "error"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "token",
        type: "address"
      }
    ],
    name: "SafeERC20FailedOperation",
    type: "error"
  },
  {
    inputs: [],
    name: "TransferFailed",
    type: "error"
  },
  {
    inputs: [],
    name: "ZeroAddress",
    type: "error"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "transactionId",
        type: "uint256"
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "disputeId",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "string",
        name: "evidenceURI",
        type: "string"
      }
    ],
    name: "DisputeRaised",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "transactionId",
        type: "uint256"
      },
      {
        indexed: true,
        internalType: "address",
        name: "recipient",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      }
    ],
    name: "PaymentReleased",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "transactionId",
        type: "uint256"
      }
    ],
    name: "TransactionCancelled",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "transactionId",
        type: "uint256"
      },
      {
        indexed: true,
        internalType: "address",
        name: "payer",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "payee",
        type: "address"
      },
      {
        indexed: false,
        internalType: "address",
        name: "token",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "string",
        name: "description",
        type: "string"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "deadline",
        type: "uint256"
      }
    ],
    name: "TransactionCreated",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "transactionId",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      }
    ],
    name: "TransactionFunded",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "transactionId",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "ruling",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "address",
        name: "recipient",
        type: "address"
      }
    ],
    name: "TransactionResolved",
    type: "event"
  },
  {
    inputs: [],
    name: "arbitrator",
    outputs: [
      {
        internalType: "contract IMoltbookArbitrator",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_transactionId",
        type: "uint256"
      }
    ],
    name: "cancel",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_payee",
        type: "address"
      },
      {
        internalType: "address",
        name: "_token",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256"
      },
      {
        internalType: "string",
        name: "_description",
        type: "string"
      },
      {
        internalType: "uint256",
        name: "_disputeDeadline",
        type: "uint256"
      }
    ],
    name: "createTransaction",
    outputs: [
      {
        internalType: "uint256",
        name: "transactionId",
        type: "uint256"
      }
    ],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    name: "disputeToTransaction",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_transactionId",
        type: "uint256"
      }
    ],
    name: "fund",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_transactionId",
        type: "uint256"
      }
    ],
    name: "getTransaction",
    outputs: [
      {
        components: [
          {
            internalType: "address",
            name: "payer",
            type: "address"
          },
          {
            internalType: "address",
            name: "payee",
            type: "address"
          },
          {
            internalType: "address",
            name: "token",
            type: "address"
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256"
          },
          {
            internalType: "enum KaraEscrow.TransactionStatus",
            name: "status",
            type: "uint8"
          },
          {
            internalType: "uint256",
            name: "disputeId",
            type: "uint256"
          },
          {
            internalType: "string",
            name: "description",
            type: "string"
          },
          {
            internalType: "uint256",
            name: "deadline",
            type: "uint256"
          },
          {
            internalType: "uint256",
            name: "createdAt",
            type: "uint256"
          }
        ],
        internalType: "struct KaraEscrow.Transaction",
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_disputeId",
        type: "uint256"
      }
    ],
    name: "getTransactionByDispute",
    outputs: [
      {
        components: [
          {
            internalType: "address",
            name: "payer",
            type: "address"
          },
          {
            internalType: "address",
            name: "payee",
            type: "address"
          },
          {
            internalType: "address",
            name: "token",
            type: "address"
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256"
          },
          {
            internalType: "enum KaraEscrow.TransactionStatus",
            name: "status",
            type: "uint8"
          },
          {
            internalType: "uint256",
            name: "disputeId",
            type: "uint256"
          },
          {
            internalType: "string",
            name: "description",
            type: "string"
          },
          {
            internalType: "uint256",
            name: "deadline",
            type: "uint256"
          },
          {
            internalType: "uint256",
            name: "createdAt",
            type: "uint256"
          }
        ],
        internalType: "struct KaraEscrow.Transaction",
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_transactionId",
        type: "uint256"
      },
      {
        internalType: "string",
        name: "_evidenceURI",
        type: "string"
      }
    ],
    name: "raiseDispute",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_transactionId",
        type: "uint256"
      }
    ],
    name: "release",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_disputeId",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "_ruling",
        type: "uint256"
      }
    ],
    name: "rule",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "transactionCount",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    name: "transactions",
    outputs: [
      {
        internalType: "address",
        name: "payer",
        type: "address"
      },
      {
        internalType: "address",
        name: "payee",
        type: "address"
      },
      {
        internalType: "address",
        name: "token",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      },
      {
        internalType: "enum KaraEscrow.TransactionStatus",
        name: "status",
        type: "uint8"
      },
      {
        internalType: "uint256",
        name: "disputeId",
        type: "uint256"
      },
      {
        internalType: "string",
        name: "description",
        type: "string"
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "createdAt",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    stateMutability: "payable",
    type: "receive"
  }
];

// src/abis.ts
var karaDisputeV2Abi = KaraDisputeV2_default;
var karaEscrowAbi = KaraEscrow_default;
var erc20Abi = [
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function"
  }
];

// src/client.ts
var KaraDispute = class {
  chain;
  publicClient;
  addresses;
  constructor(config) {
    const chainKey = config.chain;
    this.chain = CHAINS[chainKey];
    this.addresses = config.addresses ? { ...getAddresses(chainKey), ...config.addresses } : getAddresses(chainKey);
    this.publicClient = (0, import_viem.createPublicClient)({
      chain: this.chain,
      transport: (0, import_viem.http)(config.rpcUrl ?? DEFAULT_RPC_URLS[chainKey])
    });
  }
  /**
   * Create a write-enabled client with a wallet
   */
  withWallet(walletClient) {
    return new KaraDisputeWriter(this, walletClient);
  }
  // ============ Read Functions ============
  /**
   * Get a dispute by ID
   */
  async getDispute(disputeId) {
    const data = await this.publicClient.readContract({
      address: this.addresses.karaDispute,
      abi: karaDisputeV2Abi,
      functionName: "getDispute",
      args: [disputeId]
    });
    return this._parseDispute(disputeId, data);
  }
  /**
   * Get vote results for a dispute
   */
  async getVoteResult(disputeId) {
    const data = await this.publicClient.readContract({
      address: this.addresses.karaDispute,
      abi: karaDisputeV2Abi,
      functionName: "getVoteResult",
      args: [disputeId]
    });
    return {
      forClaimant: data.forClaimant,
      forRespondent: data.forRespondent,
      abstained: data.abstained,
      agentIds: data.agentIds,
      signatures: data.signatures
    };
  }
  /**
   * Get arbitrator stake info
   */
  async getArbitratorStake(arbitrator) {
    const data = await this.publicClient.readContract({
      address: this.addresses.karaDispute,
      abi: karaDisputeV2Abi,
      functionName: "getArbitratorStake",
      args: [arbitrator]
    });
    return {
      amount: data.amount,
      stakedAt: data.stakedAt,
      lockedUntil: data.lockedUntil,
      slashedAmount: data.slashedAmount,
      active: data.active
    };
  }
  /**
   * Get arbitration cost in KARA (with holder discount)
   */
  async getArbitrationCostKara(holder) {
    return await this.publicClient.readContract({
      address: this.addresses.karaDispute,
      abi: karaDisputeV2Abi,
      functionName: "getArbitrationCostKara",
      args: [holder]
    });
  }
  /**
   * Get arbitration cost in ETH (legacy)
   */
  async getArbitrationCostEth() {
    return await this.publicClient.readContract({
      address: this.addresses.karaDispute,
      abi: karaDisputeV2Abi,
      functionName: "arbitrationCost"
    });
  }
  /**
   * Get holder discount tier
   */
  async getHolderDiscount(holder) {
    const discount = await this.publicClient.readContract({
      address: this.addresses.karaDispute,
      abi: karaDisputeV2Abi,
      functionName: "getHolderDiscount",
      args: [holder]
    });
    return Number(discount);
  }
  /**
   * Get KARA balance
   */
  async getKaraBalance(address) {
    return await this.publicClient.readContract({
      address: this.addresses.karaToken,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [address]
    });
  }
  /**
   * Get escrow transaction
   */
  async getEscrowTransaction(transactionId) {
    const data = await this.publicClient.readContract({
      address: this.addresses.karaEscrow,
      abi: karaEscrowAbi,
      functionName: "getTransaction",
      args: [transactionId]
    });
    return this._parseEscrowTransaction(transactionId, data);
  }
  /**
   * Check if arbitrator is active
   */
  async isArbitratorActive(arbitrator) {
    return await this.publicClient.readContract({
      address: this.addresses.karaDispute,
      abi: karaDisputeV2Abi,
      functionName: "isArbitratorActive",
      args: [arbitrator]
    });
  }
  /**
   * Get current ruling for a dispute
   */
  async getCurrentRuling(disputeId) {
    const data = await this.publicClient.readContract({
      address: this.addresses.karaDispute,
      abi: karaDisputeV2Abi,
      functionName: "currentRuling",
      args: [disputeId]
    });
    return {
      ruling: data[0],
      tied: data[1],
      resolved: data[2]
    };
  }
  /**
   * Get total fees collected
   */
  async getTotalFeesCollected() {
    return await this.publicClient.readContract({
      address: this.addresses.karaDispute,
      abi: karaDisputeV2Abi,
      functionName: "totalFeesCollected"
    });
  }
  /**
   * Get total KARA staked
   */
  async getTotalStaked() {
    return await this.publicClient.readContract({
      address: this.addresses.karaDispute,
      abi: karaDisputeV2Abi,
      functionName: "totalStaked"
    });
  }
  /**
   * Get dispute count
   */
  async getDisputeCount() {
    return await this.publicClient.readContract({
      address: this.addresses.karaDispute,
      abi: karaDisputeV2Abi,
      functionName: "disputeCount"
    });
  }
  // ============ Utility Functions ============
  /**
   * Calculate holder discount based on KARA balance
   */
  calculateDiscount(karaBalance) {
    if (karaBalance >= KARA_TIERS.TIER4.threshold) {
      return KARA_TIERS.TIER4.discount;
    } else if (karaBalance >= KARA_TIERS.TIER3.threshold) {
      return KARA_TIERS.TIER3.discount;
    } else if (karaBalance >= KARA_TIERS.TIER2.threshold) {
      return KARA_TIERS.TIER2.discount;
    } else if (karaBalance >= KARA_TIERS.TIER1.threshold) {
      return KARA_TIERS.TIER1.discount;
    }
    return 0;
  }
  /**
   * Calculate discounted fee
   */
  calculateDiscountedFee(baseFee, discountBps) {
    return baseFee - baseFee * BigInt(discountBps) / BigInt(BASIS_POINTS);
  }
  // ============ Internal ============
  _parseDispute(id, data) {
    return {
      id,
      claimant: data.claimant,
      respondent: data.respondent,
      arbitrable: data.arbitrable,
      amount: data.amount,
      evidenceURI: data.evidenceURI,
      status: Number(data.status),
      ruling: Number(data.ruling),
      createdAt: data.createdAt,
      resolvedAt: data.resolvedAt,
      votingDeadline: data.votingDeadline,
      appealRound: Number(data.appealRound),
      requiredVotes: data.requiredVotes,
      karaFeePaid: data.karaFeePaid
    };
  }
  _parseEscrowTransaction(id, data) {
    return {
      id,
      payer: data.payer,
      payee: data.payee,
      token: data.token,
      amount: data.amount,
      status: Number(data.status),
      disputeId: data.disputeId,
      description: data.description,
      deadline: data.deadline,
      createdAt: data.createdAt
    };
  }
};
var KaraDisputeWriter = class extends KaraDispute {
  walletClient;
  account;
  constructor(reader, walletClient) {
    super({ chain: reader.chain.id === 8453 ? "base" : "base-sepolia" });
    this.walletClient = walletClient;
    this.account = walletClient.account;
  }
  // ============ Escrow Functions ============
  /**
   * Create a new escrow transaction
   */
  async createEscrow(params) {
    const token = params.token ?? import_viem.zeroAddress;
    const isEth = token === import_viem.zeroAddress;
    const hash = await this.walletClient.writeContract({
      address: this.addresses.karaEscrow,
      abi: karaEscrowAbi,
      functionName: "createTransaction",
      args: [
        params.payee,
        token,
        params.amount,
        params.description,
        params.deadline
      ],
      value: isEth ? params.amount : 0n
    });
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    const logs = (0, import_viem.parseEventLogs)({
      abi: karaEscrowAbi,
      logs: receipt.logs,
      eventName: "TransactionCreated"
    });
    const transactionId = logs[0]?.args?.transactionId ?? 0n;
    return { transactionId, hash };
  }
  /**
   * Release escrow funds to payee
   */
  async releaseEscrow(transactionId) {
    return await this.walletClient.writeContract({
      address: this.addresses.karaEscrow,
      abi: karaEscrowAbi,
      functionName: "release",
      args: [transactionId]
    });
  }
  /**
   * Raise a dispute on an escrow
   */
  async raiseDispute(params) {
    const cost = await this.getArbitrationCostEth();
    const hash = await this.walletClient.writeContract({
      address: this.addresses.karaEscrow,
      abi: karaEscrowAbi,
      functionName: "raiseDispute",
      args: [params.transactionId, params.evidenceURI],
      value: cost
    });
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    const logs = (0, import_viem.parseEventLogs)({
      abi: karaEscrowAbi,
      logs: receipt.logs,
      eventName: "DisputeRaised"
    });
    const disputeId = logs[0]?.args?.disputeId ?? 0n;
    return { disputeId, hash };
  }
  /**
   * Cancel an unfunded escrow
   */
  async cancelEscrow(transactionId) {
    return await this.walletClient.writeContract({
      address: this.addresses.karaEscrow,
      abi: karaEscrowAbi,
      functionName: "cancel",
      args: [transactionId]
    });
  }
  // ============ Dispute Functions ============
  /**
   * Create a dispute directly (with KARA)
   */
  async createDisputeWithKara(params) {
    const cost = await this.getArbitrationCostKara(this.account.address);
    await this._approveKaraIfNeeded(this.addresses.karaDispute, cost);
    const hash = await this.walletClient.writeContract({
      address: this.addresses.karaDispute,
      abi: karaDisputeV2Abi,
      functionName: "createDisputeWithKara",
      args: [
        params.claimant,
        params.respondent,
        params.amount,
        params.evidenceURI
      ]
    });
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    const logs = (0, import_viem.parseEventLogs)({
      abi: karaDisputeV2Abi,
      logs: receipt.logs,
      eventName: "DisputeCreated"
    });
    const disputeId = logs[0]?.args?.disputeId ?? 0n;
    return { disputeId, hash };
  }
  /**
   * Appeal a dispute (with KARA)
   */
  async appealWithKara(disputeId) {
    const cost = await this.getArbitrationCostKara(this.account.address);
    const appealCost = cost * 2n;
    await this._approveKaraIfNeeded(this.addresses.karaDispute, appealCost);
    return await this.walletClient.writeContract({
      address: this.addresses.karaDispute,
      abi: karaDisputeV2Abi,
      functionName: "appealWithKara",
      args: [disputeId]
    });
  }
  /**
   * Resolve a dispute (execute ruling)
   */
  async resolveDispute(disputeId) {
    return await this.walletClient.writeContract({
      address: this.addresses.karaDispute,
      abi: karaDisputeV2Abi,
      functionName: "resolveDispute",
      args: [disputeId]
    });
  }
  // ============ Staking Functions ============
  /**
   * Stake KARA to become an arbitrator
   */
  async stakeKara(amount) {
    await this._approveKaraIfNeeded(this.addresses.karaDispute, amount);
    return await this.walletClient.writeContract({
      address: this.addresses.karaDispute,
      abi: karaDisputeV2Abi,
      functionName: "stakeKara",
      args: [amount]
    });
  }
  /**
   * Unstake KARA
   */
  async unstakeKara(amount) {
    return await this.walletClient.writeContract({
      address: this.addresses.karaDispute,
      abi: karaDisputeV2Abi,
      functionName: "unstakeKara",
      args: [amount]
    });
  }
  // ============ Agent-Friendly Functions ============
  /**
   * Simple escrow creation for agents
   * Handles defaults and token approvals automatically
   */
  async agentCreateEscrow(request) {
    const deadlineSeconds = request.deadlineSeconds ?? DEFAULT_ESCROW_DEADLINE;
    const deadline = BigInt(Math.floor(Date.now() / 1e3) + deadlineSeconds);
    return this.createEscrow({
      payee: request.to,
      token: request.token,
      amount: request.amount,
      description: request.description,
      deadline
    });
  }
  /**
   * Simple dispute creation for agents
   * Handles KARA approval automatically
   */
  async agentCreateDispute(request) {
    const evidenceURI = request.evidence ? JSON.stringify(request.evidence) : request.description;
    return this.createDisputeWithKara({
      claimant: request.from,
      respondent: request.counterparty,
      amount: request.amount,
      evidenceURI
    });
  }
  // ============ Internal ============
  async _approveKaraIfNeeded(spender, amount) {
    const allowance = await this.publicClient.readContract({
      address: this.addresses.karaToken,
      abi: erc20Abi,
      functionName: "allowance",
      args: [this.account.address, spender]
    });
    if (allowance < amount) {
      const hash = await this.walletClient.writeContract({
        address: this.addresses.karaToken,
        abi: erc20Abi,
        functionName: "approve",
        args: [spender, amount]
      });
      await this.publicClient.waitForTransactionReceipt({ hash });
    }
  }
};

// src/cli.ts
function formatStatus(status) {
  const statuses = {
    [0 /* None */]: "\u2B1C None",
    [1 /* Open */]: "\u{1F195} Open",
    [2 /* Voting */]: "\u{1F5F3}\uFE0F  Voting",
    [3 /* Resolved */]: "\u2705 Resolved",
    [4 /* Appealed */]: "\u2696\uFE0F  Appealed"
  };
  return statuses[status] || `Unknown (${status})`;
}
function formatRuling(ruling) {
  const rulings = {
    [0 /* RefusedToArbitrate */]: "\u{1F6AB} Refused",
    [1 /* Claimant */]: "\u{1F464} Claimant Wins",
    [2 /* Respondent */]: "\u{1F465} Respondent Wins"
  };
  return rulings[ruling] || `Unknown (${ruling})`;
}
function formatAddress(addr) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
function formatTimestamp(ts) {
  const date = new Date(Number(ts) * 1e3);
  return date.toISOString().replace("T", " ").slice(0, 19);
}
async function getDispute(client, id) {
  console.log(`
\u{1F50D} Fetching dispute #${id}...
`);
  try {
    const dispute = await client.getDispute(id);
    console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
    console.log(`  DISPUTE #${dispute.id.toString()}`);
    console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
    console.log(`  Status:     ${formatStatus(dispute.status)}`);
    console.log(`  Amount:     ${(0, import_viem2.formatEther)(dispute.amount)} ETH`);
    console.log(`  Claimant:   ${formatAddress(dispute.claimant)}`);
    console.log(`  Respondent: ${formatAddress(dispute.respondent)}`);
    console.log(`  Created:    ${formatTimestamp(dispute.createdAt)}`);
    console.log(`  Deadline:   ${formatTimestamp(dispute.votingDeadline)}`);
    console.log(`  Ruling:     ${formatRuling(dispute.ruling)}`);
    console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n");
    if (dispute.evidenceURI) {
      console.log(`\u{1F4CE} Evidence: ${dispute.evidenceURI}`);
    }
  } catch (error) {
    console.error(`\u274C Failed to fetch dispute: ${error.message}`);
    process.exit(1);
  }
}
async function getEscrow(client, escrowId) {
  const id = BigInt(escrowId);
  console.log(`
\u{1F50D} Fetching escrow #${id}...
`);
  try {
    const escrow = await client.getEscrowTransaction(id);
    const statusLabels = {
      0: "\u2B1C None",
      1: "\u{1F195} Created",
      2: "\u{1F4B0} Funded",
      3: "\u26A0\uFE0F Disputed",
      4: "\u2705 Resolved",
      5: "\u274C Cancelled"
    };
    console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
    console.log(`  ESCROW #${escrow.id}`);
    console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
    console.log(`  Status:    ${statusLabels[escrow.status] || `Unknown (${escrow.status})`}`);
    console.log(`  Amount:    ${(0, import_viem2.formatEther)(escrow.amount)} ETH`);
    console.log(`  Payer:     ${formatAddress(escrow.payer)}`);
    console.log(`  Payee:     ${formatAddress(escrow.payee)}`);
    console.log(`  Created:   ${formatTimestamp(escrow.createdAt)}`);
    console.log(`  Deadline:  ${formatTimestamp(escrow.deadline)}`);
    console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n");
    if (escrow.disputeId > 0n) {
      console.log(`\u2696\uFE0F  Linked to Dispute #${escrow.disputeId}`);
    }
  } catch (error) {
    console.error(`\u274C Failed to fetch escrow: ${error.message}`);
    process.exit(1);
  }
}
async function getVotes(client, disputeId) {
  console.log(`
\u{1F5F3}\uFE0F  Fetching votes for dispute #${disputeId}...
`);
  try {
    const result = await client.getVoteResult(disputeId);
    const total = result.forClaimant + result.forRespondent + result.abstained;
    console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
    console.log(`  VOTES FOR DISPUTE #${disputeId}`);
    console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
    console.log(`  For Claimant:   ${result.forClaimant} votes`);
    console.log(`  For Respondent: ${result.forRespondent} votes`);
    console.log(`  Abstained:      ${result.abstained} votes`);
    console.log(`  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`);
    console.log(`  Total:          ${total} votes`);
    console.log(`  Voters:         ${result.agentIds.length} agents`);
    console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n");
    if (total > 0n) {
      const claimantPct = Number(result.forClaimant * 100n / total);
      const respondentPct = Number(result.forRespondent * 100n / total);
      const abstainedPct = Number(result.abstained * 100n / total);
      console.log("\u{1F4CA} Distribution:");
      console.log(`   Claimant:   ${"\u2588".repeat(Math.round(claimantPct / 5))} ${claimantPct}%`);
      console.log(`   Respondent: ${"\u2588".repeat(Math.round(respondentPct / 5))} ${respondentPct}%`);
      console.log(`   Abstained:  ${"\u2588".repeat(Math.round(abstainedPct / 5))} ${abstainedPct}%`);
    }
  } catch (error) {
    console.error(`\u274C Failed to fetch votes: ${error.message}`);
    process.exit(1);
  }
}
async function checkBalance(client, address) {
  console.log(`
\u{1F4B0} Checking KARA balance for ${formatAddress(address)}...
`);
  try {
    const balance = await client.getKaraBalance(address);
    const discount = client.calculateDiscount(balance);
    console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
    console.log(`  KARA BALANCE`);
    console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
    console.log(`  Address:  ${formatAddress(address)}`);
    console.log(`  Balance:  ${(0, import_viem2.formatEther)(balance)} KARA`);
    console.log(`  Discount: ${discount / 100}%`);
    console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n");
    const tiers = [
      { name: "Tier 1", threshold: (0, import_viem2.parseEther)("1000"), discount: "5%" },
      { name: "Tier 2", threshold: (0, import_viem2.parseEther)("10000"), discount: "10%" },
      { name: "Tier 3", threshold: (0, import_viem2.parseEther)("100000"), discount: "20%" },
      { name: "Tier 4", threshold: (0, import_viem2.parseEther)("1000000"), discount: "30%" }
    ];
    console.log("\u{1F4C8} Tier Progress:");
    for (const tier of tiers) {
      const reached = balance >= tier.threshold;
      console.log(`   ${reached ? "\u2705" : "\u2B1C"} ${tier.name} (${tier.discount}): ${(0, import_viem2.formatEther)(tier.threshold)} KARA`);
    }
  } catch (error) {
    console.error(`\u274C Failed to check balance: ${error.message}`);
    process.exit(1);
  }
}
function showHelp() {
  console.log(`
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
\u2551                  KARADISPUTE CLI                       \u2551
\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D

Usage: kara-dispute <command> [options]

Commands:
  get <id>              Get dispute details by ID
  escrow <hash>         Get escrow transaction details  
  votes <id>            Get voting status for a dispute
  balance <address>     Check KARA balance and tier
  help                  Show this help message

Options:
  --chain <chain>       Chain to use (base, base-sepolia) [default: base]
  --rpc <url>           Custom RPC URL

Examples:
  kara-dispute get 1
  kara-dispute escrow 0x1234...
  kara-dispute votes 5 --chain base-sepolia
  kara-dispute balance 0xabc... 
`);
}
async function main() {
  const { values, positionals } = (0, import_util.parseArgs)({
    args: process.argv.slice(2),
    options: {
      chain: { type: "string", default: "base" },
      rpc: { type: "string" },
      help: { type: "boolean", short: "h" }
    },
    allowPositionals: true
  });
  if (values.help || positionals.length === 0) {
    showHelp();
    return;
  }
  const [command, ...args] = positionals;
  const chain = values.chain === "base-sepolia" ? "base-sepolia" : "base";
  const client = new KaraDispute({
    chain,
    rpcUrl: values.rpc
  });
  switch (command) {
    case "get":
      if (!args[0]) {
        console.error("\u274C Usage: kara-dispute get <dispute-id>");
        process.exit(1);
      }
      await getDispute(client, BigInt(args[0]));
      break;
    case "escrow":
      if (!args[0]) {
        console.error("\u274C Usage: kara-dispute escrow <escrow-hash>");
        process.exit(1);
      }
      await getEscrow(client, args[0]);
      break;
    case "votes":
      if (!args[0]) {
        console.error("\u274C Usage: kara-dispute votes <dispute-id>");
        process.exit(1);
      }
      await getVotes(client, BigInt(args[0]));
      break;
    case "balance":
      if (!args[0]) {
        console.error("\u274C Usage: kara-dispute balance <address>");
        process.exit(1);
      }
      await checkBalance(client, args[0]);
      break;
    case "help":
      showHelp();
      break;
    default:
      console.error(`\u274C Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}
main().catch((error) => {
  console.error("Fatal error:", error.message);
  process.exit(1);
});
