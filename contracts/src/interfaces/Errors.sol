// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

/**
 * @title ShieldWorker Custom Errors
 * @author ShieldWorker Team — Aleph Hackathon March 2026
 * @notice Gas-efficient custom errors shared across all ShieldWorker contracts.
 *         Custom errors save ~200 gas per revert compared to require("string").
 */

// ╔══════════════════════════════════════════════════════════════════════╗
// ║                    ShieldWorkerRegistry Errors                      ║
// ╚══════════════════════════════════════════════════════════════════════╝

/// @notice Thrown when a wallet tries to register but already has a worker identity
/// @param worker The address that is already registered
error AlreadyRegistered(address worker);

/// @notice Thrown when an agentId is already linked to a worker profile
/// @param agentId The agentId that is already registered
error AgentIdAlreadyRegistered(uint256 agentId);

/// @notice Thrown when caller does not own the specified agentId NFT in IdentityRegistry
/// @param agentId The agentId the caller tried to use
/// @param caller The address that attempted the action
error NotAgentOwner(uint256 agentId, address caller);

/// @notice Thrown when an agentId has no worker profile in ShieldWorkerRegistry
/// @param agentId The agentId that is not registered
error WorkerNotRegistered(uint256 agentId);

// ╔══════════════════════════════════════════════════════════════════════╗
// ║                      ProtectionPool Errors                          ║
// ╚══════════════════════════════════════════════════════════════════════╝

/// @notice Thrown when a payout is attempted for a worker without active coverage
/// @param agentId The worker's agentId whose coverage has expired or never existed
error CoverageNotActive(uint256 agentId);

/// @notice Thrown when the pool does not have enough USDC to cover a payout
/// @param required The amount of USDC needed
/// @param available The actual USDC balance in the pool
error InsufficientPoolBalance(uint256 required, uint256 available);

// ╔══════════════════════════════════════════════════════════════════════╗
// ║                       ClaimManager Errors                           ║
// ╚══════════════════════════════════════════════════════════════════════╝

/// @notice Thrown when trying to execute payouts for a trigger that has already been fully processed
/// @param triggerId The ID of the already-processed trigger
error TriggerAlreadyProcessed(uint256 triggerId);

/// @notice Thrown when referencing a trigger that does not exist
/// @param triggerId The invalid trigger ID
error TriggerNotFound(uint256 triggerId);

/// @notice Thrown when trying to pay a worker who has already been paid for this trigger
/// @param triggerId The trigger ID
/// @param agentId The worker's agentId that was already paid
error WorkerAlreadyPaid(uint256 triggerId, uint256 agentId);

/// @notice Thrown when a batch payout would exceed the per-event payout cap (MAX_PAYOUT_PER_EVENT)
/// @param triggerId The trigger ID
/// @param total The cumulative payout amount that would exceed the cap
/// @param cap The maximum allowed payout per event
error PayoutCapExceeded(uint256 triggerId, uint256 total, uint256 cap);

/// @notice Thrown when the batch offset is out of range for the affected workers array
/// @param offset The requested start index
/// @param total The total number of affected workers
error InvalidBatchRange(uint256 offset, uint256 total);

// ╔══════════════════════════════════════════════════════════════════════╗
// ║                         General Errors                              ║
// ╚══════════════════════════════════════════════════════════════════════╝

/// @notice Thrown when a zero address is provided where a valid address is required
error ZeroAddress();
