import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer } from 'recharts';
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
  const [selectedElectionStats, setSelectedElectionStats] = useState(null);
  const [isResultDeclared, setIsResultDeclared] = useState(false);

  // Function to fetch and update election statistics
  const updateElectionStats = async () => {
    try {
      const contract = await getContract();
      const electionCount = await contract.electionCount();

      const fetchedElections = [];
      const statsList = [];

      // Fetch elections and their stats sequentially
      for (let i = 1; i <= electionCount; i++) {
        const election = await contract.elections(i);
        fetchedElections.push(election);

        // Fetch candidates and results for each election
        const candidates = await contract.getCandidates(election.id);
        const results = await contract.getCurrentResults(election.id);

        statsList.push({
          name: election.name,
          results: candidates.map((candidate, j) => ({
            name: candidate.name,
            votes: results[j].voteCount.toNumber()
          })),
          electionId: election.id.toNumber(),
          endTime: election.endTime.toNumber()
        });
      }

      setElections(fetchedElections);
      setElectionStats(statsList);
    } catch (error) {
      console.error('Error updating election statistics:', error);
      setElectionStats([]);
    }
  };

  const handleElectionSelect = (electionId) => {
    const selectedId = Number(electionId);
    setSelectedElectionId(selectedId);

    const selectedStats = electionStats.find((stat) => stat.electionId === selectedId);
    console.log('Selected election stats:', selectedStats);
    setSelectedElectionStats(selectedStats);
  };

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

  useEffect(() => {
    if (!selectedElectionId) {
      return;
    }
    const resultsDeclared = async (electionId) => {
      try {
        const contract = await getContract();
        console.log('Contract:', contract);
        
        console.log(contract.isResultDeclared(electionId));
        const result = await contract.isResultDeclared(electionId);
        setIsResultDeclared(result);
        console.log('Results declared:', result);
        return result;
      } catch (error) {
        console.error('Error in resultsDeclared:', error);
        return false;
      }
    };
    resultsDeclared(selectedElectionId);
  }, [selectedElectionId]);


  // Function to declare results for an election
  const declareResults = async () => {
    if (!account || !selectedElectionId) {
      alert('Please connect wallet and select an election');
      return;
    }
  
    try {
      const contract = await getContract();
      const election = elections.find(e => e.id.toNumber() === selectedElectionId);
      console.log('Selected Election:', election);
  
      if (!election) {
        console.error('Election not found');
        alert('Election not found');
        return;
      }
  
      const electionEndTime = election.endTime.toNumber() * 1000;
  
      if (Date.now() < electionEndTime) {
        alert('Election has not ended yet!');
        return;
      }
  
      console.log('Declaring results for election:', selectedElectionId);
      
      // Listen for ResultDeclared event
      contract.on('ResultDeclared', (electionId, maxVotes, winner) => {
        if (electionId.toNumber() === selectedElectionId) {
          console.log(`Election ${electionId} results declared!`);
          console.log('Max Votes:', maxVotes.toString());
          console.log('Winner:', winner);
          
          // Here you can update the frontend state based on the winner and max votes
          alert(`Winner: ${winner.name}, Votes: ${maxVotes.toString()}`);
        }
      });
  
      // Declare the results by triggering the smart contract function
      await contract.getResults(selectedElectionId);
      
      // After declaring the results, ensure to update the election stats
      await updateElectionStats();
      
    } catch (error) {
      console.error('Error declaring election results:', error);
      alert('Error declaring results: ' + error.message);
    }
  };
  

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

      await updateElectionStats();
    } catch (error) {
      console.error('Candidate addition failed:', error);
    }
  };

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

          <div className="bg-white shadow-lg rounded-2xl p-6">
            <h2 className="text-2xl font-semibold mb-6">Add Candidates</h2>
            <div className="space-y-4">
              <select
                className="w-full p-3 border rounded-lg"
                value={selectedElectionId}
                onChange={(e) => {
                  setSelectedElectionId(e.target.value);
                  handleElectionSelect(e.target.value);
                }}
              >
                <option value="">Select Election</option>
                  {elections.map((election) => (
                    election.startTime && 
                      new Date(election.startTime).getTime() >= Date.now() ? (
                        <option key={election.id} value={election.id}>
                          {election.name}
                        </option>
                      ) : null
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

          <div className="bg-white shadow-lg rounded-2xl p-6 col-span-full">
            <h2 className="text-2xl font-semibold mb-6">Election Statistics</h2>

            <div className="mb-6">
              <select
                className="w-full p-3 border rounded-lg"
                value={selectedElectionId}
                onChange={(e) => handleElectionSelect(e.target.value)}
              >
                <option value="">Select Election</option>
                {elections.map((election) => (
                  <option key={election.id} value={election.id}>
                    {election.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedElectionStats && selectedElectionStats.results.length > 0 ? (
              <div className="flex flex-col md:flex-row gap-8">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart 
                    data={selectedElectionStats.results} 
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      label={{ value: 'Candidates', position: 'insideBottom', offset: -10 }}
                    />
                    <YAxis 
                      label={{ 
                        value: 'Number of Votes', 
                        angle: -90, 
                        position: 'insideLeft', 
                        offset: 0 
                      }} 
                    />
                    <Tooltip 
                      formatter={(value, name) => [value, 'Votes']}
                      cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={36}
                    />
                    <Bar 
                      dataKey="votes" 
                      fill="#8884d8" 
                      activeBar={{ stroke: 'blue', strokeWidth: 2 }}
                    >
                      {selectedElectionStats.results.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`}
                          fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'][index % 5]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={selectedElectionStats.results}
                      dataKey="votes"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {selectedElectionStats.results.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'][index % 5]}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [value, 'Votes']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-gray-500">No statistics available for this election.</p>
            )}

            {selectedElectionStats && !isResultDeclared && Date.now() >= selectedElectionStats.endTime * 1000 && (
              <button
                onClick={declareResults}
                className="w-full mt-6 bg-red-600 text-white p-3 rounded-lg hover:bg-red-700"
              >
                Declare Results
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;