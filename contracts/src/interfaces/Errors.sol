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

// ╔══════════════════════════════════════════════════════════════════════╗
// ║                         General Errors                              ║
// ╚══════════════════════════════════════════════════════════════════════╝

/// @notice Thrown when a zero address is provided where a valid address is required
error ZeroAddress();

/// @notice Thrown when a function is called by an unauthorized contract
/// @param caller The unauthorized address
/// @param expected The expected authorized address
error UnauthorizedCaller(address caller, address expected);
