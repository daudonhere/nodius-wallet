// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract NodiusRelay {
    bytes32 public constant EXECUTE_TYPEHASH =
        keccak256("Execute(address target,uint256 value,bytes data,uint256 nonce,uint256 deadline)");

    bytes32 public immutable DOMAIN_SEPARATOR;
    address public owner;
    mapping(address => uint256) public nonces;

    event RelayExecuted(address indexed user, address indexed target, uint256 value);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() {
        owner = msg.sender;
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("NodiusRelay"),
                keccak256("1"),
                block.chainid,
                address(this)
            )
        );
    }

    function execute(
        address target,
        uint256 value,
        bytes calldata data,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external returns (bytes memory) {
        require(block.timestamp <= deadline, "NodiusRelay: expired");

        bytes32 structHash = keccak256(
            abi.encode(EXECUTE_TYPEHASH, target, value, keccak256(data), nonce, deadline)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        address signer = _recover(digest, signature);
        require(signer != address(0), "NodiusRelay: invalid signature");
        require(nonces[signer] == nonce, "NodiusRelay: invalid nonce");

        nonces[signer]++;

        (bool success, bytes memory result) = target.call{value: value}(data);
        require(success, "NodiusRelay: call failed");

        emit RelayExecuted(signer, target, value);
        return result;
    }

    function _recover(bytes32 digest, bytes calldata signature) internal pure returns (address) {
        require(signature.length == 65, "NodiusRelay: invalid signature length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 0x20))
            v := byte(0, calldataload(add(signature.offset, 0x40)))
        }
        if (v < 27) v += 27;
        return ecrecover(digest, v, r, s);
    }

    function transferOwnership(address newOwner) external {
        require(msg.sender == owner, "NodiusRelay: not owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    receive() external payable {}
}
