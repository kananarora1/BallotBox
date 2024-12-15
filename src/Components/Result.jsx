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
  const [isResultDeclared, setIsResultDeclared] = useState(false);

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

  const fetchResults = async (electionId) => {
    try {
      const contract = await getContract();
      
      // Check if results are declared
      const resultDeclared = await contract.isResultDeclared(electionId);
      setIsResultDeclared(resultDeclared);

      if (resultDeclared) {
        // Fetch candidates and their votes
        const candidates = await contract.getCandidates(electionId);
        const voteCounts = await contract.getCurrentResults(electionId);

        const resultsData = candidates.map((candidate, index) => ({
          name: candidate.name,
          votes: candidate.voteCount.toNumber(),
        }));

        setResults(resultsData);
        setMessage("");
      } else {
        setResults([]);
        setMessage("Results have not been declared for this election.");
      }
    } catch (error) {
      console.error("Error fetching results:", error);
      setMessage("Error fetching results. Please try again.");
    }
  };

  const handleElectionSelect = (id) => {
    if (id) {
      setSelectedElectionId(id);
      setResults([]);
      setMessage("Checking election results...");
      fetchResults(id);
    } else {
      setSelectedElectionId("");
      setResults([]);
      setMessage("Please select an election to view the results.");
    }
  };

  useEffect(() => {
    fetchElections();

    // Event Listener for ResultDeclared
    const setupResultListener = async () => {
      try {
        const contract = await getContract();
        
        contract.on("ResultDeclared", async (electionId, maxVotes, winner) => {
          const updatedElectionId = electionId.toNumber();
          
          console.log("Result Declared Event:", {
            electionId: updatedElectionId,
            maxVotes: maxVotes.toString(),
            winner: winner
          });

          // If the current selected election matches the event's election
          if (updatedElectionId.toString() === selectedElectionId.toString()) {
            // Re-fetch results for the selected election
            await fetchResults(updatedElectionId);
          }
        });
      } catch (error) {
        console.error("Error setting up ResultDeclared listener:", error);
      }
    };

    setupResultListener();

    // Cleanup event listeners when the component unmounts
    return () => {
      const cleanupListener = async () => {
        const contract = await getContract();
        contract.removeAllListeners("ResultDeclared");
      };
      cleanupListener();
    };
  }, [selectedElectionId]);

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

        {/* Display results or message */}
        {message && (
          <p className="text-lg text-gray-700 bg-yellow-200 p-4 rounded-lg shadow-sm">
            {message}
          </p>
        )}

        {results.length > 0 && (
          <div className="bg-white p-6 shadow-lg rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">Results Analysis</h2>

            {/* Bar Chart */}
            <div className="my-8">
              <h3 className="text-xl font-semibold mb-2">Votes Distribution (Bar Chart)</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={results}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    label={{ value: "Candidates", position: "insideBottom", offset: -5 }}
                  />
                  <YAxis label={{ value: "Votes", angle: -90, position: "insideLeft" }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="votes" fill="#8884d8">
                    {results.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div className="my-8">
              <h3 className="text-xl font-semibold mb-2">Votes Distribution (Pie Chart)</h3>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={results}
                    dataKey="votes"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    fill="#8884d8"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {results.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-800">Summary:</h3>
              {results.map((result) => (
                <p key={result.name} className="text-gray-600">
                  {result.name}: <strong>{result.votes} votes</strong>
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultPage;