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

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8A2BE2", "#FF4500"];

  const fetchElections = async () => {
    try {
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
    }
  };

  const fetchCandidateResults = async (electionId) => {
    try {
      const contract = await getContract();
      
      // Fetch candidates for the specific election
      const candidates = await contract.getCandidates(electionId);

      // Create results array with candidate details and votes
      const resultsData = candidates.map((candidate, index) => ({
        name: candidate.name,
        party: candidate.politicalParty,
        area: candidate.area,
        votes: candidate.voteCount.toNumber(),
      }));

      // Sort results in descending order of votes
      const sortedResults = resultsData.sort((a, b) => b.votes - a.votes);

      // Determine winner separately
      const electionWinner = sortedResults.length > 0 ? sortedResults[0] : null;

      return { results: sortedResults, winner: electionWinner };
    } catch (error) {
      console.error("Error fetching candidate results:", error);
      return { results: [], winner: null };
    }
  };

  useEffect(() => {
    fetchElections();

    // Setup event listener for ResultDeclared
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

          // Fetch candidate results for the election
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

    // Cleanup event listeners
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
      setSelectedElectionId(electionId);
      setMessage("Fetching election results...");
      
      const contract = await getContract();
      
      // Check if results are declared for this election
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
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="container mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-black-600">Election Results</h1>

        {/* Election Selector */}
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

        {/* Display message */}
        {message && (
          <p className="text-lg text-gray-700 bg-yellow-200 p-4 rounded-lg shadow-sm">
            {message}
          </p>
        )}

        {/* Results Display */}
        {results.length > 0 && (
          <div className="bg-white p-6 shadow-lg rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">Results Leaderboard</h2>

            {/* Winner Highlight */}
            {winner && (
              <div className="bg-green-100 p-4 rounded-lg mb-6">
                <h3 className="text-xl font-bold text-green-800">Election Winner</h3>
                <p className="text-lg">
                  <span className="font-semibold">{winner.name}</span> 
                  {' '}with <span className="font-semibold">{winner.votes}</span> votes
                </p>
              </div>
            )}


            {/* Leaderboard Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="p-3 text-left">Rank</th>
                    <th className="p-3 text-left">Candidate</th>
                    <th className="p-3 text-left">Party</th>
                    <th className="p-3 text-left">Area</th>
                    <th className="p-3 text-right">Votes</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((candidate, index) => (
                    <tr 
                      key={candidate.name} 
                      className={`
                        ${index === 0 ? 'bg-green-50' : ''}
                        border-b hover:bg-gray-100
                      `}
                    >
                      <td className="p-3 font-bold">{index + 1}</td>
                      <td className="p-3">{candidate.name}</td>
                      <td className="p-3">{candidate.party}</td>
                      <td className="p-3">{candidate.area}</td>
                      <td className="p-3 text-right font-semibold">{candidate.votes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Visualization */}
            <div className="grid md:grid-cols-2 gap-8 mt-8">
              {/* Bar Chart */}
              <div>
                <h3 className="text-xl font-semibold mb-4">Votes Distribution (Bar Chart)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={results}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="votes">
                      {results.map((_, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pie Chart */}
              <div>
                <h3 className="text-xl font-semibold mb-4">Votes Distribution (Pie Chart)</h3>
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
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultPage;