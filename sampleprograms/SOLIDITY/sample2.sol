// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Land Acquisition Smart Contract
/// @notice Demonstrates blockchain-enabled land acquisition process
contract LandAcquisition {

    enum AcquisitionState {
        NotRegistered,
        NotificationSent,
        InitialApprovalReceived,
        SIADataSent,
        AcquisitionAccepted,
        CompensationDisbursed,
        OwnershipTransferred
    }

    struct Land {
        string landId;
        address payable owner;
        string affectedArea;
        string messageFromLO;
        string siaData;
        uint256 valuation;
        AcquisitionState state;
    }

    mapping(string => Land) public lands;
    address public GovernmentAuthority;

    // Events
    event NotificationSent(string landId);
    event InitialApprovalReceived(string landId, string messageFromLO);
    event SIADataSent(string landId, string siaData);
    event AcquisitionAccepted(string landId);
    event CompensationDisbursed(string landId, uint256 amount);
    event OwnershipTransferred(string landId, address newOwner);
    event ProcessInfo(string info);

    constructor(address _govAuthority) {
        GovernmentAuthority = _govAuthority;
    }

    // 1️⃣ Register Land
    function registerLand(
        string memory _landId,
        address payable _owner,
        string memory _affectedArea
    ) public {
        require(lands[_landId].owner == address(0), "Land already registered");

        lands[_landId] = Land({
            landId: _landId,
            owner: _owner,
            affectedArea: _affectedArea,
            messageFromLO: "",
            siaData: "",
            valuation: 0,
            state: AcquisitionState.NotificationSent
        });

        emit NotificationSent(_landId);
    }

    // 2️⃣ Land Owner sends approval
    function sendInitialApproval(string memory _landId, string memory _message) public {
        Land storage land = lands[_landId];
        require(land.state == AcquisitionState.NotificationSent, "Invalid state for approval");

        land.messageFromLO = _message;
        land.state = AcquisitionState.InitialApprovalReceived;

        emit InitialApprovalReceived(_landId, _message);
    }

    // 3️⃣ SIA Data submission
    function sendSIAData(string memory _landId, string memory _siaData) public {
        Land storage land = lands[_landId];
        require(land.state == AcquisitionState.InitialApprovalReceived, "Invalid state for SIA data");

        land.siaData = _siaData;
        land.state = AcquisitionState.SIADataSent;

        emit SIADataSent(_landId, _siaData);
    }

    // 4️⃣ Accept Acquisition
    function acceptAcquisition(string memory _landId) public {
        Land storage land = lands[_landId];
        require(land.state == AcquisitionState.SIADataSent, "Invalid state for acceptance");

        land.state = AcquisitionState.AcquisitionAccepted;

        emit AcquisitionAccepted(_landId);
    }

    // 5️⃣ Disburse Compensation (with explicit value in Remix UI)
    function disburseCompensation(string memory _landId) public payable {
        Land storage land = lands[_landId];
        require(land.state == AcquisitionState.AcquisitionAccepted, "Invalid state for compensation");
        require(msg.value > 0, "Compensation must be greater than zero");

        land.valuation = msg.value;
        land.owner.transfer(msg.value);
        land.state = AcquisitionState.CompensationDisbursed;

        emit CompensationDisbursed(_landId, msg.value);
    }

    // 6️⃣ Ownership Transfer
    function issueAwardAndTransferOwnership(string memory _landId) public {
        Land storage land = lands[_landId];
        require(land.state == AcquisitionState.CompensationDisbursed, "Invalid state for transfer");

        land.owner = payable(GovernmentAuthority);
        land.state = AcquisitionState.OwnershipTransferred;

        string memory message = string(
            abi.encodePacked(
                "The current LandID ",
                _landId,
                " ownership rights have been transferred to the government, and the compensation is settled."
            )
        );

        emit OwnershipTransferred(_landId, GovernmentAuthority);
        emit ProcessInfo(message);
    }
}
