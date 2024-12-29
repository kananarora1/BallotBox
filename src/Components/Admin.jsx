import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer } from 'recharts';
import { PlusCircle, BarChart3, Users, Clock, Check, AlertCircle } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import { getContract } from '../utils/contract';

const LoadingSpinner = () => (
  <div className="flex justify-center items-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children }) => (
  <div className="px-6 py-4 border-b border-gray-200">
    {children}
  </div>
);

const CardContent = ({ children }) => (
  <div className="p-6">
    {children}
  </div>
);

const AdminDashboard = () => {
  const { account } = useWeb3();
  const [loading, setLoading] = useState({
    init: true,
    elections: false,
    candidates: false,
    stats: false,
    addingElection: false,
    addingCandidate: false,
    declaringResults: false
  });

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

  const updateElectionStats = async () => {
    setLoading(prev => ({ ...prev, stats: true }));
    try {
      const contract = await getContract();
      const electionCount = await contract.electionCount();
      const fetchedElections = [];
      const statsList = [];

      for (let i = 1; i <= electionCount; i++) {
        const election = await contract.elections(i);
        fetchedElections.push(election);
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
      toast.success('Statistics updated successfully');
    } catch (error) {
      toast.error('Failed to update statistics');
      setElectionStats([]);
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
  };

  const handleElectionSelect = (electionId) => {
    const selectedId = Number(electionId);
    setSelectedElectionId(selectedId);
    const selectedStats = electionStats.find((stat) => stat.electionId === selectedId);
    setSelectedElectionStats(selectedStats);
  };

  useEffect(() => {
    const initializeContract = async () => {
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

        contract.on('Voted', async () => {
          await updateElectionStats();
        });

        toast.success('Dashboard initialized successfully');
      } catch (error) {
        toast.error('Failed to initialize dashboard');
      } finally {
        setLoading(prev => ({ ...prev, init: false }));
      }
    };

    initializeContract();
  }, []);

  useEffect(() => {
    const checkResultsDeclared = async () => {
      if (!selectedElectionId) return;
      
      try {
        const contract = await getContract();
        const declared = await contract.isResultDeclared(selectedElectionId);
        setIsResultDeclared(declared);
      } catch (error) {
        console.error('Error checking if results declared:', error);
        setIsResultDeclared(false);
      }
    };
  
    checkResultsDeclared();
  }, [selectedElectionId]);

  const handleAddElection = async () => {
    if (!account) {
      toast.warning('Please connect wallet first');
      return;
    }

    setLoading(prev => ({ ...prev, addingElection: true }));
    try {
      const contract = await getContract();
      const startTime = Math.floor(new Date(newElection.startTime).getTime() / 1000);
      const endTime = Math.floor(new Date(newElection.endTime).getTime() / 1000);

      const transaction = await contract.addElection(newElection.name, startTime, endTime);
      await transaction.wait();

      setNewElection({ name: '', startTime: '', endTime: '' });
      await updateElectionStats();
      toast.success('Election created successfully');
    } catch (error) {
      toast.error(`Failed to create election: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, addingElection: false }));
    }
  };

  const handleAddCandidate = async () => {
    if (!account || !selectedElectionId) {
      toast.warning('Please connect wallet and select an election');
      return;
    }

    setLoading(prev => ({ ...prev, addingCandidate: true }));
    try {
      const contract = await getContract();
      const { name, party, area } = candidateDetails;

      if (!name || !party || !area) {
        toast.warning('Please fill in all candidate details');
        return;
      }

      const transaction = await contract.addCandidate(selectedElectionId, name, party, area);
      await transaction.wait();

      setCandidateDetails({ name: '', party: '', area: '' });
      await updateElectionStats();
      toast.success('Candidate added successfully');
    } catch (error) {
      toast.error('Failed to add candidate');
    } finally {
      setLoading(prev => ({ ...prev, addingCandidate: false }));
    }
  };

  const declareResults = async () => {
    if (!account || !selectedElectionId) {
      toast.warning('Please connect wallet and select an election');
      return;
    }

    setLoading(prev => ({ ...prev, declaringResults: true }));
    try {
      const contract = await getContract();
      const election = elections.find(e => e.id.toNumber() === selectedElectionId);

      if (!election) {
        toast.error('Election not found');
        return;
      }

      const electionEndTime = election.endTime.toNumber() * 1000;
      if (Date.now() < electionEndTime) {
        toast.warning('Election has not ended yet!');
        return;
      }

      contract.on('ResultDeclared', (electionId, maxVotes, winner) => {
        if (electionId.toNumber() === selectedElectionId) {
          toast.success(`Winner: ${winner.name}, Votes: ${maxVotes.toString()}`);
        }
      });

      await contract.getResults(selectedElectionId);
      await updateElectionStats();
    } catch (error) {
      toast.error('Error declaring results: ' + error.message);
    } finally {
      setLoading(prev => ({ ...prev, declaringResults: false }));
    }
  };

  if (loading.init) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="container mx-auto text-center">
          <LoadingSpinner />
          <p className="text-gray-600 mt-4">Initializing admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <ToastContainer position="top-right" autoClose={5000} />
      
      <div className="container mx-auto max-w-7xl">
        <div className="flex items-center mb-8">
          <BarChart3 className="w-8 h-8 mr-3 text-blue-600" />
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage elections and candidates</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold flex items-center">
                <PlusCircle className="w-5 h-5 mr-2" />
                Create New Election
              </h2>
            </CardHeader>
            <CardContent>
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
                  disabled={loading.addingElection}
                  className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center"
                >
                  {loading.addingElection ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    'Create Election'
                  )}
                </button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Add Candidates
              </h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <select
                  className="w-full p-3 border rounded-lg"
                  value={selectedElectionId}
                  onChange={(e) => handleElectionSelect(e.target.value)}
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
                  onChange={(e) => setCandidateDetails({ ...candidateDetails, name: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Political Party"
                  className="w-full p-3 border rounded-lg"
                  value={candidateDetails.party}
                  onChange={(e) => setCandidateDetails({ ...candidateDetails, party: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Area"
                  className="w-full p-3 border rounded-lg"
                  value={candidateDetails.area}
                  onChange={(e) => setCandidateDetails({ ...candidateDetails, area: e.target.value })}
                />
                <button
                  onClick={handleAddCandidate}
                  disabled={loading.addingCandidate}
                  className="w-full bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 disabled:bg-green-300 flex items-center justify-center"
                >
                  {loading.addingCandidate ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    'Add Candidate'
                  )}
                </button>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-full">
            <CardHeader>
              <h2 className="text-xl font-semibold flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Election Statistics
              </h2>
            </CardHeader>
            <CardContent>
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

              {/* Previous code remains the same until loading.stats */}

              {loading.stats ? (
                <LoadingSpinner />
              ) : selectedElectionStats && selectedElectionStats.results.length > 0 ? (
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
                      <Tooltip formatter={(value, name) => [value, 'Votes']} />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="votes" fill="#8884d8">
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
                      <Tooltip formatter={(value, name) => [value, 'Votes']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No statistics available for this election.</p>
                </div>
              )}

{selectedElectionStats && !isResultDeclared && 
               Date.now() > selectedElectionStats.endTime * 1000 && (
                <div className="mt-6">
                  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 flex items-center">
                      <Clock className="w-5 h-5 mr-2" />
                      Election has ended. You can now declare the results.
                    </p>
                  </div>
                  <button
                    onClick={declareResults}
                    disabled={loading.declaringResults}
                    className="w-full bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center gap-2"
                  >
                    {loading.declaringResults ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        Declare Results
                      </>
                    )}
                  </button>
                </div>
              )}
              {selectedElectionStats && isResultDeclared && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 flex items-center">
                    <Check className="w-5 h-5 mr-2" />
                    Results have been declared for this election.
                  </p>
                </div>
              )}
              {selectedElectionStats && !isResultDeclared && 
               Date.now() <= selectedElectionStats.endTime * 1000 && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Election is still ongoing. Results can be declared after{' '}
                    {new Date(selectedElectionStats.endTime * 1000).toLocaleString()}
                  </p>
                </div>
              )}


            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;