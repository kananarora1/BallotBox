import React, { useState, useEffect } from "react";
import { useWeb3 } from "../context/Web3Context";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { getContract } from "../utils/contract";

const ResultPage = () => {
  const { account } = useWeb3();
  const [elections, setElections] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState("");
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState("Please select an election to view the results.");
  const [winner, setWinner] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8A2BE2", "#FF4500"];

  const fetchCandidateResults = async (electionId) => {
    try {
      const contract = await getContract();
      
      const candidates = await contract.getCandidates(electionId);

      const resultsData = candidates.map((candidate, index) => ({
        name: candidate.name,
        party: candidate.politicalParty,
        area: candidate.area,
        votes: candidate.voteCount.toNumber(),
      }));

      const sortedResults = resultsData.sort((a, b) => b.votes - a.votes);

      const electionWinner = sortedResults.length > 0 ? sortedResults[0] : null;

      return { results: sortedResults, winner: electionWinner };
    } catch (error) {
      console.error("Error fetching candidate results:", error);
      return { results: [], winner: null };
    }
  };

  const fetchElections = async () => {
    try {
      setIsLoading(true);
      const contract = await getContract();
      const electionCount = await contract.electionCount();

      const fetchedElections = [];
      for (let i = 1; i <= electionCount; i++) {
        const election = await contract.elections(i);
        fetchedElections.push({
          id: election.id.toNumber(),
          name: election.name,
        });
      }

      setElections(fetchedElections);
    } catch (error) {
      console.error("Error fetching elections:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchElections();

    const setupResultListener = async () => {
      try {
        const contract = await getContract();
        
        contract.on("ResultDeclared", async (electionId, maxVotes, winnerCandidate) => {
          const updatedElectionId = electionId.toNumber();
          
          console.log("Result Declared Event:", {
            electionId: updatedElectionId,
            maxVotes: maxVotes.toString(),
            winner: winnerCandidate
          });

          const { results: candidateResults, winner: electionWinner } = await fetchCandidateResults(updatedElectionId);
          
          setResults(candidateResults);
          setWinner(electionWinner);
          setMessage("");
          setSelectedElectionId(updatedElectionId);
        });
      } catch (error) {
        console.error("Error setting up ResultDeclared listener:", error);
      }
    };

    setupResultListener();

    return () => {
      const cleanupListener = async () => {
        const contract = await getContract();
        contract.removeAllListeners("ResultDeclared");
      };
      cleanupListener();
    };
  }, []);

  const handleElectionSelect = async (electionId) => {
    if (!electionId) {
      setSelectedElectionId("");
      setResults([]);
      setWinner(null);
      setMessage("Please select an election to view the results.");
      return;
    }

    try {
      setIsLoading(true);
      setSelectedElectionId(electionId);
      setMessage("Fetching election results...");
      
      const contract = await getContract();
      const isResultDeclared = await contract.isResultDeclared(electionId);
      
      if (isResultDeclared) {
        const { results: candidateResults, winner: electionWinner } = await fetchCandidateResults(electionId);
        
        if (candidateResults.length > 0) {
          setResults(candidateResults);
          setWinner(electionWinner);
          setMessage("");
        } else {
          setMessage("No results available for this election.");
          setWinner(null);
        }
      } else {
        setMessage("Results have not been declared for this election.");
        setResults([]);
        setWinner(null);
      }
    } catch (error) {
      console.error("Error fetching election results:", error);
      setMessage("Error fetching results. Please try again.");
      setWinner(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
            Election Results Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            View and analyze election results in real-time
          </p>
        </div>

        {/* Election Selector */}
        <div className="mb-8">
          <select
            className="w-full p-4 border border-gray-300 rounded-lg shadow-sm 
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       text-lg bg-white transition duration-150 ease-in-out"
            value={selectedElectionId}
            onChange={(e) => handleElectionSelect(e.target.value)}
            disabled={isLoading}
          >
            <option value="">Select Election</option>
            {elections.map((election) => (
              <option key={election.id} value={election.id}>
                {election.name}
              </option>
            ))}
          </select>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex justify-center items-center my-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-lg text-gray-600">Loading...</span>
          </div>
        )}

        {/* Display message */}
        {message && !isLoading && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8 rounded-lg shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  {message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Winner Section */}
        {winner && !isLoading && (
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg mb-8">
            <div className="flex items-center">
              <div className="p-3 bg-white rounded-full">
                <svg className="h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-xl font-bold">Election Winner</h3>
                <p className="text-lg">
                  {winner.name} with {winner.votes} votes
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Results Display */}
        {results.length > 0 && !isLoading && (
          <div className="bg-white rounded-xl shadow-xl overflow-hidden">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Results Leaderboard</h2>

              {/* Leaderboard Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Party</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Votes</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {results.map((candidate, index) => (
                      <tr 
                        key={candidate.name}
                        className={`
                          ${index === 0 ? 'bg-green-50' : ''}
                          hover:bg-gray-50 transition-colors duration-150 ease-in-out
                        `}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{index + 1}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{candidate.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{candidate.party}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{candidate.area}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">{candidate.votes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Charts Section */}
              <div className="grid md:grid-cols-2 gap-8 mt-8">
                {/* Bar Chart */}
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h3 className="text-xl font-semibold mb-4 text-gray-900">Votes Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={results}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis dataKey="name" tick={{ fill: '#666' }} />
                      <YAxis tick={{ fill: '#666' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: 'none',
                          borderRadius: '4px',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                        }}
                      />
                      <Bar dataKey="votes">
                        {results.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Pie Chart */}
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h3 className="text-xl font-semibold mb-4 text-gray-900">Vote Share</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={results}
                        dataKey="votes"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {results.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: 'none',
                          borderRadius: '4px',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultPage;