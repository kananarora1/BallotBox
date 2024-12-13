// SPDX-License-Identifier: MIT
pragma solidity >=0.8.10;
contract Voting {

    address public admin;
    uint public electionCount; 
    mapping(uint => Election) public elections;

    constructor() {
        admin = msg.sender;
    }

    enum ElectionStatus { 
        Valid,
        Canceled 
    }

    struct Election {
        uint id;
        string name;
        uint startTime;
        uint endTime;
        address[] voterList;
        mapping(address => bool) voters; 
        Candidate[] candidates;
        ElectionStatus status;
    }

    struct Candidate {
        uint id;
        uint electionId;
        string name;
        string politicalParty;
        string area;
        uint voteCount;
    }

    event ElectionAdded(uint id, string name, uint startTime, uint endTime);
    event CandidateAdded(uint electionId, uint candidateId, string name, string politicalParty, string area);
    event Voted(uint electionId, address voter);
    event ResultDeclared(uint electionId, uint maxVotes, Candidate winner);

    modifier onlyAdmin() {
        require(msg.sender == admin, "You are not the admin!");
        _;
    }

    function addElection(string calldata name, uint startTime, uint endTime) public onlyAdmin {
        require(startTime > block.timestamp, "Start time must be in the future.");
        require(endTime > startTime, "End time must be after start time.");

        electionCount++;
        Election storage newElection = elections[electionCount];
        newElection.id = electionCount;
        newElection.name = name;
        newElection.startTime = startTime;
        newElection.endTime = endTime;
        newElection.status = ElectionStatus.Valid;

        emit ElectionAdded(electionCount, name, startTime, endTime);
    }

    function addCandidate(uint electionId, string calldata name, string calldata politicalParty, string calldata area) public onlyAdmin {
        require(electionId > 0 && electionId <= electionCount, "Invalid election ID.");
        require(block.timestamp < elections[electionId].startTime, "Cannot add candidates once the election is started");

        Election storage election = elections[electionId];
        uint candidateId = election.candidates.length;
        election.candidates.push(Candidate(candidateId, electionId, name, politicalParty, area, 0));

        emit CandidateAdded(electionId, candidateId, name, politicalParty, area);
    }

    function vote(uint electionId, uint candidateId) public {
        require(electionId > 0 && electionId <= electionCount, "Invalid election ID.");

        Election storage election = elections[electionId];
        require(block.timestamp >= election.startTime, "Election has not started.");
        require(block.timestamp <= election.endTime, "Election has ended.");
        require(!election.voters[msg.sender], "You have already voted.");

        require(candidateId < election.candidates.length, "Invalid candidate ID.");

        election.voters[msg.sender] = true;
        election.voterList.push(msg.sender);
        election.candidates[candidateId].voteCount++;
    }

    function getCandidates(uint electionId) public view returns (Candidate[] memory) {
        require(electionId > 0 && electionId <= electionCount, "Invalid election ID.");
        return elections[electionId].candidates;
    }

    function getVoterList(uint electionId) public view returns (address[] memory) {
        require(electionId > 0 && electionId <= electionCount, "Invalid election ID.");
        return elections[electionId].voterList;
    }

    function getResults(uint electionId) public onlyAdmin returns (uint maxVotes, Candidate memory winner) {
        require(electionId > 0 && electionId <= electionCount, "Invalid election ID");
        Election storage election = elections[electionId];
        require(block.timestamp >= election.endTime, "Election has not ended, Try again after the ending time");
        require(election.status != ElectionStatus.Canceled, "The Election was cancelled");
        
        maxVotes = 0;
        for(uint i = 0; i<election.candidates.length;i++){
            if(election.candidates[i].voteCount > maxVotes){
                maxVotes = election.candidates[i].voteCount;
                winner = election.candidates[i];
            }
        }

        emit ResultDeclared(electionId, maxVotes, winner);

        return(maxVotes, winner);
    }

    function getCurrentResults(uint electionId) public view onlyAdmin returns (Candidate[] memory){
        require(electionId > 0 && electionId <= electionCount, "Invalid election ID");
        Election storage election = elections[electionId];
        require(block.timestamp >= election.startTime, "Election has not started");
        
        Candidate[] memory currentResults = new Candidate[](election.candidates.length);
        
        for (uint i = 0; i < election.candidates.length; i++) {
            currentResults[i] = Candidate({
                id: election.candidates[i].id,
                electionId: election.candidates[i].electionId,
                name: election.candidates[i].name,
                politicalParty: election.candidates[i].politicalParty,
                area: election.candidates[i].area,
                voteCount: election.candidates[i].voteCount
            });
        }
        
        return currentResults;
    }

    function getTotalVotesCast(uint electionId) public view returns (uint) {
        require(electionId > 0 && electionId <= electionCount, "Invalid election ID");
        Election storage election = elections[electionId];
        
        return election.voterList.length;
    }

    function cancelElection(uint electionId) public onlyAdmin {
        Election storage election = elections[electionId];
        election.status = ElectionStatus.Canceled;
    }

}