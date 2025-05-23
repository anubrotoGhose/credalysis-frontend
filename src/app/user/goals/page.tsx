'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Goal {
  goal_name: string;
  goal_type: string;
  target_amount: number;
  current_amount: number;
  progress_percent: number;
  target_date: string;
  required_monthly_contribution: number;
  actual_monthly_contribution: number;
  on_track: boolean;
  status: string;
  priority: string;
  last_updated: string;
}

interface AgentResponse {
  email: string;
  question_asked?: string;
  answer?: string;
  advice?: string;
  scenario_description?: string;
  analysis?: string;
}

// Helper functions for formatting agent responses
const formatReviewResponse = (text: string): React.JSX.Element => (
  <p className="text-gray-300">{text}</p>
);

const formatAdviceResponse = (text: string): React.JSX.Element => {
  const sections = text.split('\n\n');
  return (
    <div className="space-y-4">
      {sections.map((section, i) => {
        if (section.trim().startsWith('*')) {
          const items = section.split('*').filter(item => item.trim());
          return (
            <ul key={i} className="list-disc pl-5 space-y-2">
              {items.map((item, j) => (
                <li key={j} className="text-gray-300">{item.trim()}</li>
              ))}
            </ul>
          );
        } else if (section.startsWith('Hi') || section.includes('Clarence')) {
          return <p key={i} className="text-gray-200 font-medium">{section}</p>;
        } else {
          return <p key={i} className="text-gray-300">{section}</p>;
        }
      })}
    </div>
  );
};

const formatScenarioResponse = (text: string): React.JSX.Element => {
  const parts = text.split(/\*\*(.*?)\*\*/);
  const elements: React.JSX.Element[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;
    if (i % 2 === 1) {
      elements.push(
        <h3 key={`heading-${i}`} className="font-bold text-lg text-indigo-400 mt-4 mb-2">
          {part}
        </h3>
      );
    } else {
      const paragraphs = part.split('\n\n').filter(p => p.trim());
      paragraphs.forEach((paragraph, pIndex) => {
        if (paragraph.includes('*')) {
          const listItems = paragraph
            .split(/\*\s+/)
            .filter(item => item.trim())
            .map((item, lIndex) => (
              <li key={`item-${i}-${pIndex}-${lIndex}`} className="ml-2 py-1 text-gray-300">
                {item.trim()}
              </li>
            ));
          if (listItems.length) {
            elements.push(
              <ul key={`list-${i}-${pIndex}`} className="list-disc pl-5 py-2">
                {listItems}
              </ul>
            );
          }
        } else if (paragraph.trim()) {
          elements.push(
            <p key={`para-${i}-${pIndex}`} className="my-2 text-gray-300">
              {paragraph.trim()}
            </p>
          );
        }
      });
    }
  }
  return <div className="space-y-1">{elements}</div>;
};

export default function GoalsPage() {
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGoal, setNewGoal] = useState<Partial<Goal>>({});
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editGoal, setEditGoal] = useState<Partial<Goal>>({});
  
  const [userQuestion, setUserQuestion] = useState('');
  const [scenarioDescription, setScenarioDescription] = useState('');
  const [agentResponse, setAgentResponse] = useState<AgentResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'review' | 'advice' | 'scenario'>('review');
  const [apiLoading, setApiLoading] = useState(false);
  const [email, setEmailState] = useState('');
  const [editOriginalGoalName, setEditOriginalGoalName] = useState<string | null>(null);

  const backendApiUrl = "http://34.9.145.33:8000";


  useEffect(() => {
    const storedEmail = localStorage.getItem("email") || "";
    setEmailState(storedEmail);
    const isLoggedIn = localStorage.getItem("auth") === "true";
    const isUser = localStorage.getItem("access") === "user";
    if (!isLoggedIn || !isUser) {
      alert("Access denied. Please login.");
      router.push("/login");
      return;
    }
  }, [router]);

  const fetchGoals = useCallback(async () => {
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch(`${backendApiUrl}/users/goals/${email}`);
      if (!res.ok) throw new Error('Failed to fetch goals');
      const data = await res.json();
      setGoals(data.goals || []);
    } catch {
      alert("Failed to load goals.");
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    if(email) {
      fetchGoals();
    }
  }, [email, fetchGoals]);

  const handleAddGoal = async () => {
    if (!newGoal.goal_name || !newGoal.target_amount) {
      alert("Please fill in required fields");
      return;
    }
  
    // Calculate or set defaults for required fields
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // "YYYY-MM-DD"
    const progress = newGoal.current_amount && newGoal.target_amount
      ? Math.round((Number(newGoal.current_amount) / Number(newGoal.target_amount)) * 100)
      : 0;
  
    // Set all required fields for the backend
    const payload = {
      customer_email: email,
      goal_name: newGoal.goal_name,
      goal_type: newGoal.goal_type || "General", // or add a field in your form
      target_amount: newGoal.target_amount,
      current_amount: newGoal.current_amount || 0,
      progress_percent: progress,
      target_date: newGoal.target_date || todayStr, // or add a field in your form
      required_monthly_contribution: newGoal.required_monthly_contribution || 0,
      actual_monthly_contribution: newGoal.actual_monthly_contribution || 0,
      on_track: progress >= 50, // or your own logic
      status: "Active",
      priority: newGoal.priority || "Medium",
      last_updated: todayStr,
    };
  
    try {
      await fetch(`${backendApiUrl}/users/goals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setNewGoal({});
      await fetchGoals();
    } catch (error) {
      console.error("Failed to add goal:", error);
      alert("Failed to add goal");
    }
  };
  

  const handleEditGoal = (index: number) => {
    setEditIndex(index);
    setEditGoal(goals[index]);
    setEditOriginalGoalName(goals[index].goal_name); // Store original name
  };

  const handleUpdateGoal = async () => {
    if (editIndex === null || !editGoal.goal_name) return;
    try {
      // Use original goal name for URL, encode it
      const goalNameForUrl = encodeURIComponent(editOriginalGoalName || goals[editIndex].goal_name);
  
      await fetch(`${backendApiUrl}/users/goals/${email}/${goalNameForUrl}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editGoal, customer_email: email }),
      });
      setEditIndex(null);
      setEditGoal({});
      setEditOriginalGoalName(null);
      await fetchGoals();
    } catch (error) {
      console.error("Failed to update goal:", error);
      alert("Failed to update goal");
    }
  };
  
  const handleDeleteGoal = async (goal_name: string) => {
    if (!window.confirm("Are you sure you want to delete this goal?")) return;
    try {
      // Always encode the goal name in the URL
      await fetch(`${backendApiUrl}/users/goals/${email}/${encodeURIComponent(goal_name)}`, {
        method: "DELETE",
      });
      await fetchGoals();
    } catch (error) {
      console.error("Failed to delete goal:", error);
      alert("Failed to delete goal");
    }
  };
  

  const callGoalReview = async () => {
    setApiLoading(true);
    try {
      const res = await fetch(`${backendApiUrl}/users/goals/agent/review/${email}?user_question=${encodeURIComponent(userQuestion)}`);
      const data: AgentResponse = await res.json();
      setAgentResponse(data);
      setActiveTab('review');
    } catch (error) {
      console.error("Failed to get goal review:", error);
      alert("Failed to get goal review");
    } finally {
      setApiLoading(false);
    }
  };

  const callGoalAdvice = async () => {
    setApiLoading(true);
    try {
      const res = await fetch(`${backendApiUrl}/users/goals/agent/advice/${email}`);
      const data: AgentResponse = await res.json();
      setAgentResponse(data);
      setActiveTab('advice');
    } catch (error) {
      console.error("Failed to get goal advice:", error);
      alert("Failed to get goal advice");
    } finally {
      setApiLoading(false);
    }
  };

  const callGoalScenario = async () => {
    if (!scenarioDescription || scenarioDescription.length < 10) {
      alert("Please provide a more detailed scenario description (minimum 10 characters)");
      return;
    }
    setApiLoading(true);
    try {
      const res = await fetch(`${backendApiUrl}/users/goals/agent/scenario/${email}?scenario_description=${encodeURIComponent(scenarioDescription)}`);
      const data: AgentResponse = await res.json();
      setAgentResponse(data);
      setActiveTab('scenario');
    } catch (error) {
      console.error("Failed to analyze scenario:", error);
      alert("Failed to analyze scenario");
    } finally {
      setApiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const getProgressColor = (progress: number) => {
    if (progress < 25) return "bg-red-500";
    if (progress < 50) return "bg-yellow-500";
    if (progress < 75) return "bg-blue-500";
    return "bg-green-500";
  };

  return (
    <div className="bg-gray-900 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto p-6 bg-gray-800 rounded-lg shadow-xl">
        <h1 className="text-3xl font-bold mb-8 text-gray-100 border-b border-gray-700 pb-4">Financial Goal Tracker</h1>
        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column: Goals Management */}
          <div className="md:col-span-1 space-y-6">
            {/* ADD NEW GOAL FORM */}
            <div className="bg-gray-700 p-4 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-gray-200">Add New Goal</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Goal Name</label>
                  <input
                    type="text"
                    placeholder="e.g., New Car, Vacation"
                    className="w-full bg-gray-600 text-gray-100 border border-gray-500 p-2 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none placeholder-gray-400"
                    value={newGoal.goal_name || ''}
                    onChange={e => setNewGoal({ ...newGoal, goal_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Target Amount ($)</label>
                  <input
                    type="number"
                    placeholder="5000"
                    className="w-full bg-gray-600 text-gray-100 border border-gray-500 p-2 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none placeholder-gray-400"
                    value={newGoal.target_amount || ''}
                    onChange={e => setNewGoal({ ...newGoal, target_amount: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Current Amount ($)</label>
                  <input
                    type="number"
                    placeholder="1000"
                    className="w-full bg-gray-600 text-gray-100 border border-gray-500 p-2 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none placeholder-gray-400"
                    value={newGoal.current_amount || ''}
                    onChange={e => setNewGoal({ ...newGoal, current_amount: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Priority</label>
                  <select
                    className="w-full bg-gray-600 text-gray-100 border border-gray-500 p-2 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                    value={newGoal.priority || ''}
                    onChange={e => setNewGoal({ ...newGoal, priority: e.target.value })}
                  >
                    <option value="">Select Priority</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <button
                  onClick={handleAddGoal}
                  className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition duration-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  Add Goal
                </button>
              </div>
            </div>
            {/* EXISTING GOALS LIST */}
            <div className="bg-gray-700 p-4 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-gray-200">My Goals</h2>
              {goals.length === 0 ? (
                <p className="text-gray-400 italic">No goals yet. Add one above to get started!</p>
              ) : (
                <div className="space-y-4">
                  {goals.map((goal, index) => (
                    <div key={index} className="bg-gray-600 p-3 rounded-md shadow">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium text-gray-100">{goal.goal_name}</h3>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${goal.on_track ? 'bg-green-700 text-green-100' : 'bg-red-700 text-red-100'}`}>
                          {goal.on_track ? 'On Track' : 'Off Track'}
                        </span>
                      </div>
                      <div className="mt-2">
                        <div className="text-sm text-gray-300 flex justify-between">
                          <span>Progress: {goal.progress_percent}%</span>
                          <span>
                            ${goal.current_amount.toLocaleString()} / ${goal.target_amount.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full bg-gray-500 rounded-full h-2 mt-1">
                          <div
                            className={`${getProgressColor(goal.progress_percent)} h-2 rounded-full`}
                            style={{ width: `${goal.progress_percent}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-400 mt-2">
                          <span>Target: {goal.target_date ? new Date(goal.target_date).toLocaleDateString() : '-'}</span>
                          <span>Priority: {goal.priority}</span>
                        </div>
                      </div>
                      {editIndex === index ? (
                        <div className="mt-3 space-y-2">
                          <input
                            className="w-full bg-gray-500 text-gray-100 border border-gray-400 p-1 rounded text-sm focus:ring-1 focus:ring-indigo-400"
                            value={editGoal.goal_name || ''}
                            onChange={e => setEditGoal({ ...editGoal, goal_name: e.target.value })}
                            placeholder="Goal Name"
                          />
                          <input
                            type="number"
                            className="w-full bg-gray-500 text-gray-100 border border-gray-400 p-1 rounded text-sm focus:ring-1 focus:ring-indigo-400"
                            value={editGoal.target_amount || ''}
                            onChange={e => setEditGoal({ ...editGoal, target_amount: Number(e.target.value) })}
                            placeholder="Target Amount"
                          />
                          <input
                            type="number"
                            className="w-full bg-gray-500 text-gray-100 border border-gray-400 p-1 rounded text-sm focus:ring-1 focus:ring-indigo-400"
                            value={editGoal.current_amount || ''}
                            onChange={e => setEditGoal({ ...editGoal, current_amount: Number(e.target.value) })}
                            placeholder="Current Amount"
                          />
                          <select
                            className="w-full bg-gray-500 text-gray-100 border border-gray-400 p-1 rounded text-sm focus:ring-1 focus:ring-indigo-400"
                            value={editGoal.priority || ''}
                            onChange={e => setEditGoal({ ...editGoal, priority: e.target.value })}
                          >
                            <option value="">Select Priority</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                          </select>
                          <div className="flex gap-2">
                            <button
                              onClick={handleUpdateGoal}
                              className="flex-1 bg-green-600 text-white py-1 rounded hover:bg-green-700 transition"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => { setEditIndex(null); setEditGoal({}); }}
                              className="flex-1 bg-gray-500 text-white py-1 rounded hover:bg-gray-600 transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleEditGoal(index)}
                            className="flex-1 bg-indigo-500 text-white py-1 rounded hover:bg-indigo-600 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteGoal(goal.goal_name)}
                            className="flex-1 bg-red-600 text-white py-1 rounded hover:bg-red-700 transition"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* Right Columns: Agent Assistant */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-gray-700 p-4 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-gray-200">AI Goal Assistant</h2>
              <div className="flex space-x-2 mb-4">
                <button
                  className={`px-3 py-2 rounded text-sm font-medium ${activeTab === 'review' ? 'bg-indigo-600 text-white' : 'bg-gray-600 text-gray-200'}`}
                  onClick={() => setActiveTab('review')}
                >
                  Review
                </button>
                <button
                  className={`px-3 py-2 rounded text-sm font-medium ${activeTab === 'advice' ? 'bg-indigo-600 text-white' : 'bg-gray-600 text-gray-200'}`}
                  onClick={() => setActiveTab('advice')}
                >
                  Advice
                </button>
                <button
                  className={`px-3 py-2 rounded text-sm font-medium ${activeTab === 'scenario' ? 'bg-indigo-600 text-white' : 'bg-gray-600 text-gray-200'}`}
                  onClick={() => setActiveTab('scenario')}
                >
                  Scenario
                </button>
              </div>
              {/* Tabs */}
              {activeTab === 'review' && (
                <div>
                  <label className="block mb-1 text-gray-300">Ask a question about your goals:</label>
                  <input
                    type="text"
                    className="w-full bg-gray-600 text-gray-100 border border-gray-500 p-2 rounded mb-2"
                    placeholder="e.g., Am I on track for my retirement goal?"
                    value={userQuestion}
                    onChange={e => setUserQuestion(e.target.value)}
                  />
                  <button
                    onClick={callGoalReview}
                    disabled={apiLoading}
                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                    {apiLoading ? "Loading..." : "Ask"}
                  </button>
                  {agentResponse?.answer && (
                    <div className="mt-4">{formatReviewResponse(agentResponse.answer)}</div>
                  )}
                </div>
              )}
              {activeTab === 'advice' && (
                <div>
                  <button
                    onClick={callGoalAdvice}
                    disabled={apiLoading}
                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                    {apiLoading ? "Loading..." : "Get Advice"}
                  </button>
                  {agentResponse?.advice && (
                    <div className="mt-4">{formatAdviceResponse(agentResponse.advice)}</div>
                  )}
                </div>
              )}
              {activeTab === 'scenario' && (
                <div>
                  <label className="block mb-1 text-gray-300">Describe your scenario:</label>
                  <textarea
                    className="w-full bg-gray-600 text-gray-100 border border-gray-500 p-2 rounded mb-2"
                    placeholder="e.g., What if I increase my monthly savings by $200?"
                    rows={3}
                    value={scenarioDescription}
                    onChange={e => setScenarioDescription(e.target.value)}
                  />
                  <button
                    onClick={callGoalScenario}
                    disabled={apiLoading}
                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                    {apiLoading ? "Analyzing..." : "Analyze"}
                  </button>
                  {agentResponse?.analysis && (
                    <div className="mt-4">{formatScenarioResponse(agentResponse.analysis)}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
