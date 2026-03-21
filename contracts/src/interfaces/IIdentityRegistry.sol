// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

/// @title IIdentityRegistry — Official ERC-8004 IdentityRegistry interface
/// @notice Subset of the official IdentityRegistry deployed on Avalanche Fuji (0x8004A818BFB912233c491871b3d84c89A494BD9e)
/// @dev From ava-labs/8004-boilerplate. Only includes functions needed by ShieldWorker.
interface IIdentityRegistry {
    struct MetadataEntry {
        string key;
        bytes value;
    }

    /// @notice Register a new agent with URI and metadata. Mints agentId NFT to msg.sender.
    function register(string calldata agentURI, MetadataEntry[] calldata metadata) external returns (uint256 agentId);

    /// @notice Register a new agent with URI only. Mints agentId NFT to msg.sender.
    function register(string calldata agentURI) external returns (uint256 agentId);

    /// @notice Register a new agent with no metadata. Mints agentId NFT to msg.sender.
    function register() external returns (uint256 agentId);

    /// @notice Returns the owner of the given agentId NFT.
    function ownerOf(uint256 tokenId) external view returns (address);

    /// @notice Returns the agent URI for the given agentId.
    function agentURI(uint256 agentId) external view returns (string memory);
}
