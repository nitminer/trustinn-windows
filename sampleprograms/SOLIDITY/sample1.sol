// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

contract AdvancedVoting {

    address public admin;
    bool public votingActive;

    struct Candidate {
        string name;
        uint voteCount;
    }

    mapping(address => bool) public voters;
    Candidate[] public candidates;

    event Vote(address voter, uint candidateId);

    constructor() {
        admin = msg.sender;
        votingActive = true;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    modifier isActive() {
        require(votingActive == true, "Voting closed");
        _;
    }

    function addCandidate(string memory name) public onlyAdmin {
        require(bytes(name).length > 0, "Empty name");

        candidates.push(Candidate(name, 0));

        assert(candidates.length > 0);
    }

    function vote(uint id) public isActive {
        require(!voters[msg.sender], "Already voted");
        require(id < candidates.length, "Invalid candidate");

        uint beforeVotes = candidates[id].voteCount;

        voters[msg.sender] = true;
        candidates[id].voteCount++;

        assert(candidates[id].voteCount == beforeVotes + 1);

        emit Vote(msg.sender, id);
    }

    function endVoting() public onlyAdmin {
        require(votingActive == true, "Already ended");
        votingActive = false;

        assert(votingActive == false);
    }

    function getWinner() public view returns(string memory) {
        require(!votingActive, "Voting not ended");

        uint maxVotes = 0;
        uint winnerId = 0;

        for(uint i = 0; i < candidates.length; i++) {
            if(candidates[i].voteCount > maxVotes) {
                maxVotes = candidates[i].voteCount;
                winnerId = i;
            }
        }

        return candidates[winnerId].name;
    }
}