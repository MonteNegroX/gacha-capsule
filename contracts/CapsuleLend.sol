// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title CapsuleLend
/// @notice Stablecoin loan for one card. The NFT stays in the Solana vault.
/// @dev Robinhood uses this contract with USDG. HyperEVM uses CapsuleLendHyper,
///      which pins Circle USDC. Both stables have 6 decimals. Amounts are token units.
///
///      A deal is one card, one funder, and the full principal in one payment.
///      Fees are frozen at creation as basis points of that principal.
///      For a $17 buyback at 3% and 1% the units are:
///      principal 17_000_000, funder fee 510_000, protocol fee 170_000.
///      The owner repays 17_680_000. The funder receives 17_510_000.
///      The protocol receives 170_000 only on that repayment.
///      After expiry the owner keeps the principal and the funder receives no stablecoin.
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract CapsuleLend {
    uint16 public constant BPS = 10_000;
    uint16 public constant MAX_FEE_BPS = 1_000;
    uint32 public constant MAX_TERM = 30 days;

    enum Status {
        Empty,
        Funding,
        Active,
        Repaid,
        Defaulted,
        Cancelled
    }

    struct Deal {
        address owner;
        address funder;
        uint256 principal;
        uint256 funderFee;
        uint256 protocolFee;
        uint256 held;
        uint64 fundedAt;
        uint64 expiresAt;
        uint32 term;
        Status status;
    }

    IERC20 public immutable stable;
    address public immutable protocol;
    address public admin;
    uint256 private locked;

    mapping(bytes32 => Deal) private _deals;

    error ZeroAddress();
    error NotAdmin();
    error BadDeal();
    error BadStatus();
    error FeeTooHigh();
    error BadTerm();
    error NotOwner();
    error Early();
    error Late();
    error NothingHeld();
    error TokenFailed();
    error Shortfall();
    error Busy();

    event AdminTransferred(address indexed nextAdmin);
    event DealCreated(
        bytes32 indexed id,
        address indexed owner,
        uint256 principal,
        uint256 funderFee,
        uint256 protocolFee,
        uint32 term
    );
    event DealCancelled(bytes32 indexed id);
    event Funded(bytes32 indexed id, address indexed funder, address indexed payer, uint64 expiresAt);
    event PrincipalWithdrawn(bytes32 indexed id, address indexed owner, uint256 amount);
    event Repaid(bytes32 indexed id, address indexed payer, uint256 toFunder, uint256 toProtocol);
    event Defaulted(bytes32 indexed id);

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier lock() {
        if (locked == 1) revert Busy();
        locked = 1;
        _;
        locked = 0;
    }

    constructor(address stable_, address protocol_, address admin_) {
        if (stable_ == address(0) || protocol_ == address(0) || admin_ == address(0)) revert ZeroAddress();
        stable = IERC20(stable_);
        protocol = protocol_;
        admin = admin_;
    }

    function transferAdmin(address nextAdmin) external onlyAdmin {
        if (nextAdmin == address(0)) revert ZeroAddress();
        admin = nextAdmin;
        emit AdminTransferred(nextAdmin);
    }

    /// @param funderBps Lender yield taken from the principal. 300 is 3%.
    /// @param protocolBps Protocol fee taken from the principal. 100 is 1%.
    /// @param term Seconds until the owner must repay. Robinhood deals use 7 days.
    function createDeal(
        bytes32 id,
        address owner_,
        uint256 principal,
        uint16 funderBps,
        uint16 protocolBps,
        uint32 term
    ) external onlyAdmin {
        if (id == bytes32(0) || owner_ == address(0) || principal == 0) revert BadDeal();
        if (_deals[id].status != Status.Empty) revert BadStatus();
        if (funderBps > MAX_FEE_BPS || protocolBps > MAX_FEE_BPS) revert FeeTooHigh();
        if (term == 0 || term > MAX_TERM) revert BadTerm();

        uint256 funderFee = (principal * funderBps) / BPS;
        uint256 protocolFee = (principal * protocolBps) / BPS;
        _deals[id] = Deal({
            owner: owner_,
            funder: address(0),
            principal: principal,
            funderFee: funderFee,
            protocolFee: protocolFee,
            held: 0,
            fundedAt: 0,
            expiresAt: 0,
            term: term,
            status: Status.Funding
        });
        emit DealCreated(id, owner_, principal, funderFee, protocolFee, term);
    }

    /// @notice Closes a deal that has not been funded. The id cannot be reused.
    function cancelDeal(bytes32 id) external onlyAdmin {
        Deal storage item = _deals[id];
        if (item.status != Status.Funding) revert BadStatus();
        item.status = Status.Cancelled;
        emit DealCancelled(id);
    }

    /// @notice The caller pays the full principal and becomes the funder.
    function fund(bytes32 id) external {
        fundFor(id, msg.sender);
    }

    /// @notice `payer` supplies the principal and `funder` receives the repayment.
    ///         Relay can deliver the stablecoin and call this in the same transaction.
    function fundFor(bytes32 id, address funder) public lock {
        if (funder == address(0)) revert ZeroAddress();
        Deal storage item = _deals[id];
        if (item.status != Status.Funding) revert BadStatus();

        uint64 fundedAt = uint64(block.timestamp);
        uint64 expiresAt = fundedAt + uint64(item.term);
        item.funder = funder;
        item.held = item.principal;
        item.fundedAt = fundedAt;
        item.expiresAt = expiresAt;
        item.status = Status.Active;

        _pull(msg.sender, item.principal);
        emit Funded(id, funder, msg.sender, expiresAt);
    }

    /// @notice The principal is the owner's loan proceeds and can leave before repayment.
    function withdrawPrincipal(bytes32 id) external lock {
        Deal storage item = _deals[id];
        if (msg.sender != item.owner) revert NotOwner();
        if (item.status != Status.Active && item.status != Status.Defaulted) revert BadStatus();
        uint256 amount = item.held;
        if (amount == 0) revert NothingHeld();
        item.held = 0;
        _push(item.owner, amount);
        emit PrincipalWithdrawn(id, item.owner, amount);
    }

    /// @notice Repay before expiry. Uses principal still held in the contract, then pulls the rest.
    function repay(bytes32 id) external lock {
        Deal storage item = _deals[id];
        if (item.status != Status.Active) revert BadStatus();
        if (block.timestamp > item.expiresAt) revert Late();

        uint256 toFunder = item.principal + item.funderFee;
        uint256 toProtocol = item.protocolFee;
        uint256 held = item.held;
        uint256 due = toFunder + toProtocol - held;

        item.held = 0;
        item.status = Status.Repaid;

        if (due > 0) _pull(msg.sender, due);
        _push(item.funder, toFunder);
        if (toProtocol > 0) _push(protocol, toProtocol);
        emit Repaid(id, msg.sender, toFunder, toProtocol);
    }

    /// @notice Ends an unpaid loan. The funder receives no stablecoin from this call.
    function markDefault(bytes32 id) external lock {
        Deal storage item = _deals[id];
        if (item.status != Status.Active) revert BadStatus();
        if (block.timestamp <= item.expiresAt) revert Early();
        item.status = Status.Defaulted;
        emit Defaulted(id);
    }

    function deal(bytes32 id) external view returns (Deal memory) {
        return _deals[id];
    }

    /// @notice Stablecoin the caller must still send to repay, after any principal left in the contract.
    function repayDue(bytes32 id) external view returns (uint256) {
        Deal storage item = _deals[id];
        if (item.status != Status.Active) return 0;
        return item.principal + item.funderFee + item.protocolFee - item.held;
    }

    function _pull(address from, uint256 amount) internal {
        uint256 beforeBal = stable.balanceOf(address(this));
        _tokenCall(abi.encodeCall(IERC20.transferFrom, (from, address(this), amount)));
        if (stable.balanceOf(address(this)) - beforeBal != amount) revert Shortfall();
    }

    function _push(address to, uint256 amount) internal {
        uint256 beforeBal = stable.balanceOf(address(this));
        _tokenCall(abi.encodeCall(IERC20.transfer, (to, amount)));
        if (beforeBal - stable.balanceOf(address(this)) != amount) revert Shortfall();
    }

    function _tokenCall(bytes memory data) internal {
        (bool ok, bytes memory ret) = address(stable).call(data);
        if (!ok) revert TokenFailed();
        if (ret.length > 0 && !abi.decode(ret, (bool))) revert TokenFailed();
    }
}
