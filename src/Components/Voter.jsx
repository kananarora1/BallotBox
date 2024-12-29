import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Clock, Users } from 'lucide-react';
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

const Alert = ({ children }) => (
  <div className="bg-gray-50 text-gray-600 p-4 rounded-lg border border-gray-200">
    {children}
  </div>
);

const VoterDashboard = () => {
  const { account } = useWeb3();
  const navigate = useNavigate();
  const [contract, setContract] = useState(null);
  const [elections, setElections] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState({
    init: true,
    elections: false,
    candidates: false,
    voting: false
  });

  // Initialize contract
  useEffect(() => {
    const initializeContract = async () => {
      try {
        const contractInstance = await getContract();
        setContract(contractInstance);
      } catch (error) {
        toast.error('Failed to initialize blockchain connection');
      } finally {
        setLoading(prev => ({ ...prev, init: false }));
      }
    };

    initializeContract();
  }, []);

  // Fetch elections
  useEffect(() => {
    const fetchElections = async () => {
      if (!contract) return;
      setLoading(prev => ({ ...prev, elections: true }));

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
        toast.error('Failed to fetch elections');
      } finally {
        setLoading(prev => ({ ...prev, elections: false }));
      }
    };

    fetchElections();
  }, [contract]);

  // Fetch candidates
  useEffect(() => {
    const fetchCandidates = async () => {
      if (!contract || !selectedElectionId) {
        setCandidates([]);
        return;
      }

      setLoading(prev => ({ ...prev, candidates: true }));
      try {
        const candidatesList = await contract.getCandidates(selectedElectionId);
        setCandidates(candidatesList);
      } catch (error) {
        toast.error('Failed to fetch candidates');
      } finally {
        setLoading(prev => ({ ...prev, candidates: false }));
      }
    };

    fetchCandidates();
  }, [selectedElectionId, contract]);

  const handleVote = async (candidateId) => {
    if (!account || !contract || !selectedElectionId) {
      toast.warning('Please connect your wallet and select an election');
      return;
    }

    setLoading(prev => ({ ...prev, voting: true }));
    try {
      const transaction = await contract.vote(selectedElectionId, candidateId);
      await transaction.wait();
      toast.success('Vote cast successfully!');

      const updatedCandidates = await contract.getCandidates(selectedElectionId);
      setCandidates(updatedCandidates);
    } catch (error) {
      let errorMessage = 'An unknown error occurred';
      if (error.reason) {
        errorMessage = error.reason;
      } else if (error.message?.includes('revert')) {
        const revertMatch = error.message.match(/revert\s*(.+)$/i);
        errorMessage = revertMatch ? revertMatch[1].trim() : errorMessage;
      }
      if (errorMessage.includes('already voted')) {
        errorMessage = 'You have already voted in this election';
      }
      toast.error(errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, voting: false }));
    }
  };

  const activeElections = elections.filter(election => {
    const endTime = new Date(Date.parse(election.endTime)).getTime();
    const startTime = new Date(Date.parse(election.startTime)).getTime();
    const now = Date.now();
    return endTime > now && startTime < now;
  });

  if (loading.init) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="container mx-auto text-center">
          <LoadingSpinner />
          <p className="text-gray-600 mt-4">Initializing blockchain connection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <ToastContainer position="top-right" autoClose={5000} />
      
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold flex items-center mb-2">
              <BarChart3 className="w-8 h-8 mr-3 text-blue-600" />
              Voter Dashboard
            </h1>
            <p className="text-gray-600">Cast your vote in active elections</p>
          </div>
          <button
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            onClick={() => navigate('/results')}
          >
            <Clock className="w-5 h-5 mr-2" />
            View Past Results
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Active Elections
              </h2>
            </CardHeader>
            <CardContent>
              {loading.elections ? (
                <LoadingSpinner />
              ) : activeElections.length > 0 ? (
                <select
                  className="w-full p-3 border rounded-lg bg-white"
                  value={selectedElectionId}
                  onChange={(e) => setSelectedElectionId(e.target.value)}
                >
                  <option value="">Select an Election</option>
                  {activeElections.map((election) => (
                    <option key={election.id} value={election.id}>
                      {election.name}
                    </option>
                  ))}
                </select>
              ) : (
                <Alert>
                  No active elections available at this time.
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Candidates</h2>
            </CardHeader>
            <CardContent>
              {loading.candidates ? (
                <LoadingSpinner />
              ) : candidates.length > 0 ? (
                <div className="space-y-4">
                  {candidates.map((candidate, index) => (
                    <div
                      key={index}
                      className="flex flex-col md:flex-row justify-between gap-4 p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg">{candidate.name}</h3>
                        <p className="text-gray-600">Party: {candidate.politicalParty}</p>
                        <p className="text-gray-600">Area: {candidate.area}</p>
                      </div>
                      <button
                        onClick={() => handleVote(candidate.id)}
                        disabled={loading.voting}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {loading.voting ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                          'Vote'
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  {selectedElectionId 
                    ? "No candidates available for this election."
                    : "Select an election to view candidates."}
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VoterDashboard;