"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  BASE_MAINNET_ADDRESSES: () => BASE_MAINNET_ADDRESSES,
  BASE_SEPOLIA_ADDRESSES: () => BASE_SEPOLIA_ADDRESSES,
  BASIS_POINTS: () => BASIS_POINTS,
  DEFAULT_ESCROW_DEADLINE: () => DEFAULT_ESCROW_DEADLINE,
  DEFAULT_MIN_VOTES: () => DEFAULT_MIN_VOTES,
  DEFAULT_VOTING_PERIOD: () => DEFAULT_VOTING_PERIOD,
  DisputeStatus: () => DisputeStatus,
  KARA_TIERS: () => KARA_TIERS,
  KARA_TOKEN_ADDRESS: () => KARA_TOKEN_ADDRESS,
  KaraDispute: () => KaraDispute,
  KaraDisputeWriter: () => KaraDisputeWriter,
  MIN_ARBITRATOR_STAKE: () => MIN_ARBITRATOR_STAKE,
  Ruling: () => Ruling,
  TransactionStatus: () => TransactionStatus,
  erc20Abi: () => erc20Abi,
  getAddresses: () => getAddresses,
  karaDisputeV2Abi: () => karaDisputeV2Abi,
  karaEscrowAbi: () => karaEscrowAbi,
  karaPayV2Abi: () => karaPayV2Abi
});
module.exports = __toCommonJS(index_exports);

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
var DEFAULT_MIN_VOTES = 3;

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

// src/abis/KaraPayV2.json
var KaraPayV2_default = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_karaToken",
        type: "address"
      },
      {
        internalType: "address",
        name: "_arbitrator",
        type: "address"
      },
      {
        internalType: "address",
        name: "_treasury",
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
    name: "InvalidFeeConfig",
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
        indexed: false,
        internalType: "uint256",
        name: "baseFeeBps",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "minFeeKara",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "maxFeeBps",
        type: "uint256"
      }
    ],
    name: "FeeConfigUpdated",
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
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "feeDeducted",
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
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "protocolFee",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "bool",
        name: "feePaidInKara",
        type: "bool"
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
        internalType: "contract IKaraDisputeV2",
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
      },
      {
        internalType: "address",
        name: "_payer",
        type: "address"
      },
      {
        internalType: "bool",
        name: "_payInKara",
        type: "bool"
      }
    ],
    name: "calculateFee",
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
        name: "_amount",
        type: "uint256"
      },
      {
        internalType: "address",
        name: "_payer",
        type: "address"
      }
    ],
    name: "calculateKaraFee",
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
      },
      {
        internalType: "bool",
        name: "_payFeeInKara",
        type: "bool"
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
        internalType: "address",
        name: "_token",
        type: "address"
      },
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
    name: "emergencyWithdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "feeConfig",
    outputs: [
      {
        internalType: "uint256",
        name: "baseFeeBps",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "minFeeKara",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "maxFeeBps",
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
      },
      {
        internalType: "bool",
        name: "_payFeeInKara",
        type: "bool"
      }
    ],
    name: "fundWithEth",
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
      },
      {
        internalType: "bool",
        name: "_payFeeInKara",
        type: "bool"
      }
    ],
    name: "fundWithToken",
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
        internalType: "address",
        name: "_holder",
        type: "address"
      }
    ],
    name: "getHolderTier",
    outputs: [
      {
        internalType: "uint8",
        name: "",
        type: "uint8"
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
            internalType: "enum KaraPayV2.TransactionStatus",
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
          },
          {
            internalType: "uint256",
            name: "protocolFee",
            type: "uint256"
          },
          {
            internalType: "enum KaraPayV2.FeePaymentMethod",
            name: "feeMethod",
            type: "uint8"
          },
          {
            internalType: "bool",
            name: "feePaidInKara",
            type: "bool"
          }
        ],
        internalType: "struct KaraPayV2.Transaction",
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
            internalType: "enum KaraPayV2.TransactionStatus",
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
          },
          {
            internalType: "uint256",
            name: "protocolFee",
            type: "uint256"
          },
          {
            internalType: "enum KaraPayV2.FeePaymentMethod",
            name: "feeMethod",
            type: "uint8"
          },
          {
            internalType: "bool",
            name: "feePaidInKara",
            type: "bool"
          }
        ],
        internalType: "struct KaraPayV2.Transaction",
        name: "",
        type: "tuple"
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
    name: "raiseDisputeWithKara",
    outputs: [],
    stateMutability: "nonpayable",
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
    inputs: [
      {
        internalType: "address",
        name: "_arbitrator",
        type: "address"
      }
    ],
    name: "setArbitrator",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_baseFeeBps",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "_minFeeKara",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "_maxFeeBps",
        type: "uint256"
      }
    ],
    name: "setFeeConfig",
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
    inputs: [],
    name: "totalKaraFeesCollected",
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
    name: "totalTransactionsProcessed",
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
        internalType: "enum KaraPayV2.TransactionStatus",
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
      },
      {
        internalType: "uint256",
        name: "protocolFee",
        type: "uint256"
      },
      {
        internalType: "enum KaraPayV2.FeePaymentMethod",
        name: "feeMethod",
        type: "uint8"
      },
      {
        internalType: "bool",
        name: "feePaidInKara",
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
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    name: "volumeByToken",
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
    stateMutability: "payable",
    type: "receive"
  }
];

// src/abis.ts
var karaDisputeV2Abi = KaraDisputeV2_default;
var karaEscrowAbi = KaraEscrow_default;
var karaPayV2Abi = KaraPayV2_default;
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

// src/types.ts
var DisputeStatus = /* @__PURE__ */ ((DisputeStatus2) => {
  DisputeStatus2[DisputeStatus2["None"] = 0] = "None";
  DisputeStatus2[DisputeStatus2["Open"] = 1] = "Open";
  DisputeStatus2[DisputeStatus2["Voting"] = 2] = "Voting";
  DisputeStatus2[DisputeStatus2["Resolved"] = 3] = "Resolved";
  DisputeStatus2[DisputeStatus2["Appealed"] = 4] = "Appealed";
  return DisputeStatus2;
})(DisputeStatus || {});
var Ruling = /* @__PURE__ */ ((Ruling2) => {
  Ruling2[Ruling2["RefusedToArbitrate"] = 0] = "RefusedToArbitrate";
  Ruling2[Ruling2["Claimant"] = 1] = "Claimant";
  Ruling2[Ruling2["Respondent"] = 2] = "Respondent";
  return Ruling2;
})(Ruling || {});
var TransactionStatus = /* @__PURE__ */ ((TransactionStatus2) => {
  TransactionStatus2[TransactionStatus2["None"] = 0] = "None";
  TransactionStatus2[TransactionStatus2["Created"] = 1] = "Created";
  TransactionStatus2[TransactionStatus2["Funded"] = 2] = "Funded";
  TransactionStatus2[TransactionStatus2["Disputed"] = 3] = "Disputed";
  TransactionStatus2[TransactionStatus2["Resolved"] = 4] = "Resolved";
  TransactionStatus2[TransactionStatus2["Cancelled"] = 5] = "Cancelled";
  return TransactionStatus2;
})(TransactionStatus || {});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BASE_MAINNET_ADDRESSES,
  BASE_SEPOLIA_ADDRESSES,
  BASIS_POINTS,
  DEFAULT_ESCROW_DEADLINE,
  DEFAULT_MIN_VOTES,
  DEFAULT_VOTING_PERIOD,
  DisputeStatus,
  KARA_TIERS,
  KARA_TOKEN_ADDRESS,
  KaraDispute,
  KaraDisputeWriter,
  MIN_ARBITRATOR_STAKE,
  Ruling,
  TransactionStatus,
  erc20Abi,
  getAddresses,
  karaDisputeV2Abi,
  karaEscrowAbi,
  karaPayV2Abi
});
