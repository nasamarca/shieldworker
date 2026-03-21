// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { ReentrancyGuardTransient } from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import { ProtectionPool } from "./ProtectionPool.sol";
import { ShieldWorkerRegistry } from "./ShieldWorkerRegistry.sol";
import "./interfaces/Errors.sol";

/**
 * @title ClaimManager
 * @author ShieldWorker Team — Aleph Hackathon March 2026
 * @notice Handles parametric trigger events and batch payouts for the ShieldWorker
 *         community protection fund.
 *
 *         Flow:
 *           1. Admin/oracle submits a trigger event (e.g., "heavy_rain" in zone "flores")
 *           2. Contract queries ShieldWorkerRegistry for all workers in that zone
 *           3. Contract filters to only workers with active coverage (via ProtectionPool.isActive)
 *           4. Admin executes paginated batch payout — each affected worker receives $50 USDC
 *
 *         Parametric model: Payouts are triggered by verifiable external events, not by
 *         individual claims. This eliminates paperwork, claims adjusters, and denial —
 *         critical for informal workers who lack formal documentation.
 *
 *         Safety mechanisms:
 *           - Per-event payout cap (MAX_PAYOUT_PER_EVENT = $500) prevents pool drain
 *           - Double-payout prevention via triggerWorkerPaid mapping
 *           - Paginated batch payouts (max 20/batch) prevent block gas limit issues
 *           - Only ORACLE_ROLE can submit triggers (admin for MVP, Chainlink oracle for production)
 *
 * @dev Deployed on Avalanche C-Chain (Fuji testnet).
 *      For production: replace admin triggers with Chainlink weather oracle integration.
 */
contract ClaimManager is AccessControl, ReentrancyGuardTransient {
    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║                              ROLES                                  ║
    // ╚══════════════════════════════════════════════════════════════════════╝

    /// @notice Role for submitting trigger events and executing payouts (admin for MVP, oracle for production)
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║                              TYPES                                  ║
    // ╚══════════════════════════════════════════════════════════════════════╝

    /**
     * @notice Represents a parametric trigger event (e.g., weather event in a zone).
     * @param eventType Type of event ("heavy_rain", "flood", "heatwave")
     * @param zone Affected geographic zone ("flores", "palermo", "la_boca")
     * @param timestamp When the trigger was submitted (block.timestamp)
     * @param totalPayouts Cumulative USDC paid out for this event (6 decimals)
     * @param workersAffected Number of workers with active coverage in the zone at trigger time
     * @param workersProcessed Number of workers already paid in batch payouts
     * @param fullyProcessed True when all affected workers have been paid
     */
    struct TriggerEvent {
        string eventType;
        string zone;
        uint256 timestamp;
        uint256 totalPayouts;
        uint256 workersAffected;
        uint256 workersProcessed;
        bool fullyProcessed;
    }

    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║                              STATE                                  ║
    // ╚══════════════════════════════════════════════════════════════════════╝

    /// @notice ProtectionPool contract for executing payouts and checking coverage
    ProtectionPool public immutable pool;

    /// @notice ShieldWorkerRegistry for zone-based worker queries
    ShieldWorkerRegistry public immutable registry;

    /// @notice Trigger events indexed by triggerId
    mapping(uint256 => TriggerEvent) public triggers;

    /// @notice Affected workers per trigger (triggerId -> array of agentIds with active coverage)
    mapping(uint256 => uint256[]) public triggerToWorkers;

    /// @notice Prevents double payouts (triggerId -> agentId -> already paid?)
    mapping(uint256 => mapping(uint256 => bool)) public triggerWorkerPaid;

    /// @notice Auto-incrementing trigger ID counter
    uint256 public nextTriggerId;

    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║                              EVENTS                                 ║
    // ╚══════════════════════════════════════════════════════════════════════╝

    /**
     * @notice Emitted when a new parametric trigger event is submitted.
     * @param triggerId The auto-generated ID for this trigger
     * @param zone The affected geographic zone (indexed for filtering)
     * @param eventType The type of event (e.g., "heavy_rain")
     * @param affectedCount Number of workers with active coverage in the zone
     */
    event TriggerSubmitted(uint256 indexed triggerId, string indexed zone, string eventType, uint256 affectedCount);

    /**
     * @notice Emitted when a batch of payouts is executed for a trigger.
     * @param triggerId The trigger being processed
     * @param offset The start index of this batch in the affected workers array
     * @param workersProcessed Number of workers paid in this batch
     * @param batchAmount Total USDC paid in this batch (6 decimals)
     */
    event BatchPayoutExecuted(uint256 indexed triggerId, uint256 offset, uint256 workersProcessed, uint256 batchAmount);

    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║                            CONSTRUCTOR                              ║
    // ╚══════════════════════════════════════════════════════════════════════╝

    /**
     * @notice Deploy ClaimManager with references to ProtectionPool and ShieldWorkerRegistry.
     * @param _pool Address of the deployed ProtectionPool contract
     * @param _registry Address of the deployed ShieldWorkerRegistry contract
     */
    constructor(address _pool, address _registry) {
        if (_pool == address(0) || _registry == address(0)) revert ZeroAddress();

        pool = ProtectionPool(_pool);
        registry = ShieldWorkerRegistry(_registry);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║                        TRIGGER FUNCTIONS                            ║
    // ╚══════════════════════════════════════════════════════════════════════╝

    /**
     * @notice Submit a parametric trigger event for a specific zone.
     *
     *         Queries all workers registered in the zone via ShieldWorkerRegistry,
     *         then filters to only those with active coverage via ProtectionPool.isActive().
     *         Stores the list of affected workers for subsequent batch payout execution.
     *
     *         Example: submitTrigger("heavy_rain", "flores")
     *
     * @param eventType Type of event (e.g., "heavy_rain", "flood", "heatwave")
     * @param zone Affected geographic zone (e.g., "flores", "palermo")
     * @return triggerId The auto-generated ID for this trigger event
     */
    function submitTrigger(string calldata eventType, string calldata zone)
        external
        onlyRole(ORACLE_ROLE)
        returns (uint256 triggerId)
    {
        triggerId = nextTriggerId++;

        // Get all workers in zone from registry
        uint256[] memory zoneWorkers = registry.getWorkersByZone(zone);

        // Filter only workers with active coverage
        uint256 activeCount = 0;
        uint256[] memory activeWorkers = new uint256[](zoneWorkers.length);

        for (uint256 i = 0; i < zoneWorkers.length; i++) {
            if (pool.isActive(zoneWorkers[i])) {
                activeWorkers[activeCount] = zoneWorkers[i];
                activeCount++;
            }
        }

        // Store only active workers for payout
        for (uint256 i = 0; i < activeCount; i++) {
            triggerToWorkers[triggerId].push(activeWorkers[i]);
        }

        // Create trigger event record
        triggers[triggerId] = TriggerEvent({
            eventType: eventType,
            zone: zone,
            timestamp: block.timestamp,
            totalPayouts: 0,
            workersAffected: activeCount,
            workersProcessed: 0,
            fullyProcessed: false
        });

        emit TriggerSubmitted(triggerId, zone, eventType, activeCount);
    }

    /**
     * @notice Execute paginated batch payout for a trigger event.
     *
     *         Iterates through affected workers from offset to offset+limit, executing
     *         $50 USDC payout per worker via ProtectionPool.executePayout().
     *
     *         Pagination prevents block gas limit issues. Recommended batch size: 20 workers.
     *         Call multiple times with increasing offset to process all affected workers.
     *
     * @param triggerId The trigger to process
     * @param offset Start index in the affected workers array
     * @param limit Maximum number of workers to process in this batch (recommended: 20)
     */
    function executeBatchPayout(uint256 triggerId, uint256 offset, uint256 limit)
        external
        onlyRole(ORACLE_ROLE)
        nonReentrant
    {
        TriggerEvent storage trigger = triggers[triggerId];

        // Verify trigger exists and is not fully processed
        if (trigger.timestamp == 0) revert TriggerNotFound(triggerId);
        if (trigger.fullyProcessed) revert TriggerAlreadyProcessed(triggerId);

        uint256[] storage affected = triggerToWorkers[triggerId];
        if (offset >= affected.length) revert InvalidBatchRange(offset, affected.length);

        // Calculate end index (capped at array length)
        uint256 end = offset + limit;
        if (end > affected.length) end = affected.length;

        // Cache constants outside loop to avoid repeated external calls
        uint256 payoutAmount = pool.DEFAULT_PAYOUT();
        uint256 maxPayout = pool.MAX_PAYOUT_PER_EVENT();
        uint256 batchAmount = 0;
        uint256 processed = 0;

        for (uint256 i = offset; i < end; i++) {
            uint256 agentId = affected[i];

            // Skip if already paid for this trigger (prevent double payout)
            if (triggerWorkerPaid[triggerId][agentId]) continue;


            // Check per-event payout cap before executing
            if (trigger.totalPayouts + payoutAmount > maxPayout) {
                revert PayoutCapExceeded(triggerId, trigger.totalPayouts + payoutAmount, maxPayout);
            }

            // Mark as paid BEFORE external call (Checks-Effects-Interactions pattern)
            triggerWorkerPaid[triggerId][agentId] = true;

            // Execute payout via ProtectionPool -> USDC sent to worker's wallet
            pool.executePayout(agentId, payoutAmount);

            trigger.totalPayouts += payoutAmount;
            batchAmount += payoutAmount;
            processed++;
        }

        trigger.workersProcessed += processed;

        // Mark as fully processed if all workers have been handled
        if (trigger.workersProcessed >= trigger.workersAffected) {
            trigger.fullyProcessed = true;
        }

        emit BatchPayoutExecuted(triggerId, offset, processed, batchAmount);
    }

    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║                          VIEW FUNCTIONS                             ║
    // ╚══════════════════════════════════════════════════════════════════════╝

    /**
     * @notice Get details of a trigger event.
     * @param triggerId The trigger ID to query
     * @return The TriggerEvent struct with all event data
     */
    function getTrigger(uint256 triggerId) external view returns (TriggerEvent memory) {
        return triggers[triggerId];
    }

    /**
     * @notice Get the list of affected worker agentIds for a trigger.
     * @param triggerId The trigger ID to query
     * @return Array of agentIds that had active coverage at trigger time
     */
    function getAffectedWorkers(uint256 triggerId) external view returns (uint256[] memory) {
        return triggerToWorkers[triggerId];
    }

    /**
     * @notice Check if a specific worker has already been paid for a trigger.
     * @param triggerId The trigger ID
     * @param agentId The worker's agentId
     * @return True if the worker has already received payout for this trigger
     */
    function isWorkerPaid(uint256 triggerId, uint256 agentId) external view returns (bool) {
        return triggerWorkerPaid[triggerId][agentId];
    }

    /**
     * @notice Get the total number of trigger events submitted.
     * @return The count of all triggers (including fully processed ones)
     */
    function getTriggerCount() external view returns (uint256) {
        return nextTriggerId;
    }
}
