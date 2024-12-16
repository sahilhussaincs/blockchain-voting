// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VotingSystem {
    struct Candidate {
        string name;
        string party;
        uint256 voteCount;
    }

    struct Election {
        string name;
        uint256 startDate;
        uint256 endDate;
        mapping(uint256 => Candidate) candidates;
        uint256 candidateCount;
        bool isResultDeclared;
    }

    mapping(uint256 => Election) public elections;
    uint256 public electionCount;

    // Create an election
    function createElection(string memory _name, uint256 _startDate, uint256 _endDate) public {
        electionCount++;
        Election storage newElection = elections[electionCount];
        newElection.name = _name;
        newElection.startDate = _startDate;
        newElection.endDate = _endDate;
        newElection.isResultDeclared = false;
    }

    // Add a candidate to a specific election
    function addCandidate(uint256 _electionId, uint256 _candidateId, string memory _name, string memory _party) public {
        Election storage election = elections[_electionId];
        election.candidateCount++;
        election.candidates[_candidateId] = Candidate(_name, _party, 0);
    }

    // Store the results for an election
    function storeResults(uint256 _electionId, uint256[] memory _candidateIds, uint256[] memory _voteCounts) public {
        Election storage election = elections[_electionId];
        require(!election.isResultDeclared, "Results already declared");

        for (uint256 i = 0; i < _candidateIds.length; i++) {
            election.candidates[_candidateIds[i]].voteCount = _voteCounts[i];
        }

        election.isResultDeclared = true;
    }

    // Get the results for an election
    function getResults(uint256 _electionId) public view returns (string[] memory, uint256[] memory) {
        Election storage election = elections[_electionId];
        string[] memory candidateNames = new string[](election.candidateCount);
        uint256[] memory voteCounts = new uint256[](election.candidateCount);

        uint256 candidateIndex = 0;
        // Loop through the candidates by their ID (using _candidateIds array or loop with candidateCount)
        for (uint256 i = 1; i <= election.candidateCount; i++) {
            candidateNames[candidateIndex] = election.candidates[i].name;
            voteCounts[candidateIndex] = election.candidates[i].voteCount;
            candidateIndex++;
        }

        return (candidateNames, voteCounts);
    }
}
