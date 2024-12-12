import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { PlusIcon, ChartBarIcon } from '@heroicons/react/24/solid';
import { getContract } from '../utils/contract';

const AdminDashboard = () => {
  const { account, web3, disconnectWallet } = useWeb3();
  const [newElection, setNewElection] = useState({
    name: '',
    startTime: '',
    endTime: ''
  });

  const [elections, setElections] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [electionStats, setElectionStats] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState('');
  const [candidateDetails, setCandidateDetails] = useState({
    name: '',
    party: '',
    area: ''
  });

  // Function to fetch and update election statistics
  const updateElectionStats = async () => {
    try {
      const contract = await getContract();
      const electionCount = await contract.electionCount();
      
      // Fetch election details first
      const electionPromises = [];
      for (let i = 1; i <= electionCount; i++) {
        electionPromises.push(contract.elections(i));
      }
      const fetchedElections = await Promise.all(electionPromises);
      
      // Update elections state
      setElections(fetchedElections);

      // Then fetch candidates and results
      const statsPromises = fetchedElections.map((_, index) =>
        Promise.all([
          contract.getCandidates(index + 1),
          contract.getCurrentResults(index + 1)
        ])
      );

      const statsList = await Promise.all(statsPromises);
      const formattedStats = statsList.map(([candidates, results], idx) => ({
        name: fetchedElections[idx].name,
        results: candidates.map((candidate, i) => ({
          name: candidate.name,
          votes: results[i].voteCount.toNumber()
        }))
      }));

      setElectionStats(formattedStats);
    } catch (error) {
      console.error('Error updating election statistics:', error);
      // Clear stats if there's an error
      setElectionStats([]);
    }
  };

  // Fetching elections from the blockchain
  useEffect(() => {
    const fetchElections = async () => {
      try {
        const contract = await getContract();
        const electionCount = await contract.electionCount();
        
        const promises = [];
        for (let i = 1; i <= electionCount; i++) {
          promises.push(contract.elections(i));
        }

        const electionList = await Promise.all(promises);
        setElections(electionList);

        // Update stats after fetching elections
        await updateElectionStats();

        // Set up a listener for Voted event to update stats
        contract.on('Voted', async (electionId, voter) => {
          console.log('Vote event detected:', electionId, voter);
          await updateElectionStats();
        });

      } catch (error) {
        console.error('Error fetching elections:', error);
      }
    };

    fetchElections();
  }, []);

  // Rest of the component remains the same as in the previous version
  const handleAddElection = async () => {
    if (!account) {
      alert('Please connect wallet first');
      return;
    }

    try {
      const contract = await getContract();
      const startTime = Math.floor(new Date(newElection.startTime).getTime() / 1000);
      const endTime = Math.floor(new Date(newElection.endTime).getTime() / 1000);

      const transaction = await contract.addElection(newElection.name, startTime, endTime);
      const receipt = await transaction.wait();
      const electionId = receipt.events[0]?.args?.id.toNumber();

      setElections([...elections, { ...newElection, id: electionId }]);
      setNewElection({ name: '', startTime: '', endTime: '' });
      
      // Update stats after adding a new election
      await updateElectionStats();
    } catch (error) {
      console.error('Election creation failed:', error);
      alert(`Failed to create election: ${error.message}`);
    }
  };

  const handleAddCandidate = async () => {
    if (!account || !selectedElectionId) {
      alert('Please connect wallet and select an election');
      return;
    }

    try {
      const contract = await getContract();
      const { name, party, area } = candidateDetails;

      if (!name || !party || !area) {
        alert('Please fill in all candidate details');
        return;
      }

      const transaction = await contract.addCandidate(
        selectedElectionId,
        name,
        party,
        area
      );
      await transaction.wait();

      setCandidates([...candidates, { name, party, area }]);
      setCandidateDetails({ name: '', party: '', area: '' });
      
      // Update stats after adding a candidate
      await updateElectionStats();
    } catch (error) {
      console.error('Candidate addition failed:', error);
    }
  };

  // Render method remains the same as in the previous version
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="container mx-auto">
        <h1 className="text-4xl font-bold mb-8 flex items-center">
          <ChartBarIcon className="w-10 h-10 mr-4 text-blue-600" />
          Admin Dashboard
        </h1>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Election Creation Section */}
          <div className="bg-white shadow-lg rounded-2xl p-6">
            <h2 className="text-2xl font-semibold mb-6 flex items-center">
              <PlusIcon className="w-6 h-6 mr-3 text-green-600" />
              Create New Election
            </h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Election Name"
                className="w-full p-3 border rounded-lg"
                value={newElection.name}
                onChange={(e) => setNewElection({ ...newElection, name: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="datetime-local"
                  className="w-full p-3 border rounded-lg"
                  value={newElection.startTime}
                  onChange={(e) => setNewElection({ ...newElection, startTime: e.target.value })}
                />
                <input
                  type="datetime-local"
                  className="w-full p-3 border rounded-lg"
                  value={newElection.endTime}
                  onChange={(e) => setNewElection({ ...newElection, endTime: e.target.value })}
                />
              </div>
              <button
                onClick={handleAddElection}
                className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700"
              >
                Create Election
              </button>
            </div>
          </div>

          {/* Candidate Addition Section */}
          <div className="bg-white shadow-lg rounded-2xl p-6">
            <h2 className="text-2xl font-semibold mb-6">Add Candidates</h2>
            <div className="space-y-4">
              <select
                className="w-full p-3 border rounded-lg"
                value={selectedElectionId}
                onChange={(e) => setSelectedElectionId(e.target.value)}
              >
                <option value="">Select Election</option>
                {elections.map((election) => (
                  <option key={election.id} value={election.id}>
                    {election.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Candidate Name"
                className="w-full p-3 border rounded-lg"
                value={candidateDetails.name}
                onChange={(e) =>
                  setCandidateDetails({ ...candidateDetails, name: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Political Party"
                className="w-full p-3 border rounded-lg"
                value={candidateDetails.party}
                onChange={(e) =>
                  setCandidateDetails({ ...candidateDetails, party: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Area"
                className="w-full p-3 border rounded-lg"
                value={candidateDetails.area}
                onChange={(e) =>
                  setCandidateDetails({ ...candidateDetails, area: e.target.value })
                }
              />
              <button
                onClick={handleAddCandidate}
                className="w-full bg-green-600 text-white p-3 rounded-lg hover:bg-green-700"
              >
                Add Candidate
              </button>
            </div>
          </div>

          {/* Election Statistics */}
          <div className="bg-white shadow-lg rounded-2xl p-6 col-span-full">
            <h2 className="text-2xl font-semibold mb-6">Election Statistics</h2>
            {electionStats.length > 0 ? (
              <BarChart width={800} height={400} data={electionStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                {electionStats.map((election, electionIdx) => 
                  election.results.map((result, resultIdx) => (
                    <Bar 
                      key={`${electionIdx}-${resultIdx}`} 
                      dataKey={`results[${resultIdx}].votes`} 
                      name={result.name} 
                      fill="#8884d8" 
                    />
                  ))
                )}
              </BarChart>
            ) : (
              <p>No election statistics available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;