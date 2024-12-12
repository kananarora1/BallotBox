import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ChartBarIcon } from '@heroicons/react/24/solid';
import { getContract } from '../utils/contract';

const VoterDashboard = () => {
  const { account } = useWeb3();
  const [contract, setContract] = useState(null);
  const [elections, setElections] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [voteStatus, setVoteStatus] = useState('');

  // Initialize contract on component mount
  useEffect(() => {
    const initializeContract = async () => {
      try {
        const contractInstance = await getContract();
        setContract(contractInstance);
      } catch (error) {
        console.error('Error initializing contract:', error);
      }
    };

    initializeContract();
  }, []);

  // Fetch all elections when contract is available
  useEffect(() => {
    const fetchElections = async () => {
      if (!contract) return;

      try {
        const electionCount = await contract.electionCount();
        const electionPromises = [];

        for (let i = 1; i <= electionCount; i++) {
          const election = await contract.elections(i);
          electionPromises.push({
            id: election.id,
            name: election.name,
            startTime: new Date(election.startTime * 1000).toLocaleString(),
            endTime: new Date(election.endTime * 1000).toLocaleString(),
          });
        }
        const electionList = await Promise.all(electionPromises);
        setElections(electionList);
      } catch (error) {
        console.error('Error fetching elections:', error);
      }
    };

    fetchElections();
  }, [contract]);

  // Fetch candidates for the selected election
  useEffect(() => {
    const fetchCandidates = async () => {
      if (!contract || !selectedElectionId) return;

      try {
        const candidatesList = await contract.getCandidates(selectedElectionId);
        setCandidates(candidatesList);
      } catch (error) {
        console.error('Error fetching candidates:', error);
      }
    };

    fetchCandidates();
  }, [selectedElectionId, contract]);

  // Handle voting
  const handleVote = async (candidateId) => {
    if (!account || !contract || !selectedElectionId) {
      alert('Please connect your wallet and select an election');
      return;
    }

    try {
      const transaction = await contract.vote(selectedElectionId, candidateId);
      await transaction.wait();
      setVoteStatus('Vote cast successfully!');

      // Refresh candidates to update vote count
      const updatedCandidates = await contract.getCandidates(selectedElectionId);
      setCandidates(updatedCandidates);
    }catch (error) {
      // Log the full error object for debugging
      console.log('Full error object:', error);
      console.log('Error message:', error.message);
      console.log('Error name:', error.name);
  
      // Try multiple ways to extract a meaningful error message
      let errorReason = 'An unknown error occurred';
  
      // Check if it's an ethers.js error with a reason
      if (error.reason) {
        errorReason = error.reason;
      } 
      // Check for error message with 'revert' or 'reason'
      else if (error.message) {
        const revertMatch = error.message.match(/revert\s*(.+)$/i);
        if (revertMatch) {
          errorReason = revertMatch[1].trim();
        }
      }
      if(errorReason == "execution reverted: You have already voted."){
        errorReason = "You have already voted. Please wait for the results.";
      }
      // Set the most specific error reason found
      setVoteStatus(errorReason);
    }  
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="container mx-auto">
        <h1 className="text-4xl font-bold mb-8 flex items-center">
          <ChartBarIcon className="w-10 h-10 mr-4 text-blue-600" />
          Voter Dashboard
        </h1>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Election Selection */}
          <div className="bg-white shadow-lg rounded-2xl p-6">
            <h2 className="text-2xl font-semibold mb-6">Select Election</h2>
            <select
              className="w-full p-3 border rounded-lg"
              value={selectedElectionId}
              onChange={(e) => setSelectedElectionId(e.target.value)}
            >
              <option value="">Choose an Election</option>
              {elections.map((election) => (
                <option key={election.id} value={election.id}>
                  {election.name}
                </option>
              ))}
            </select>
          </div>

          {/* Candidate List */}
          <div className="bg-white shadow-lg rounded-2xl p-6">
            <h2 className="text-2xl font-semibold mb-6">Candidates</h2>
            {candidates.length > 0 ? (
              <ul className="space-y-4">
                {candidates.map((candidate, index) => (
                  <li
                    key={index}
                    className="flex justify-between items-center p-4 border rounded-lg bg-gray-50"
                  >
                    <div>
                      <h3 className="font-semibold">{candidate.name}</h3>
                      <p>Party: {candidate.politicalParty}</p>
                      <p>Area: {candidate.area}</p>
                    </div>
                    <button
                      onClick={() => handleVote(candidate.id)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      Vote
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No candidates available. Select an election to view candidates.</p>
            )}
          </div>
        </div>

        {/* Vote Status */}
        {voteStatus && (
          <div className="mt-6 bg-green-100 text-green-800 p-4 rounded-lg">
            {voteStatus}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoterDashboard;