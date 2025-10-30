import { useState, useEffect } from 'react';
import axios from 'axios';
import TextExtractor from '../components/TextExtractor';
import PetBuddy from '../components/PetBuddy';
import { FileText, BookOpen, Trophy, TrendingUp, Clock, Calendar, Target, Zap } from 'lucide-react';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [restriction, setRestriction] = useState({ uploaded: false, openai: false });
  const [extractedContent, setExtractedContent] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [upcomingPlans, setUpcomingPlans] = useState([]);
  const [recentNotes, setRecentNotes] = useState([]);
  const [recentQuizzes, setRecentQuizzes] = useState([]);
  const [stats, setStats] = useState({
    totalNotes: 0,
    totalQuizzes: 0,
    completedQuizzes: 0,
    studyStreak: 0
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get("http://localhost:4000/api/user/profile", {
          withCredentials: true,
        });
        setUser(res.data);
        
        // Set the streak stat
        setStats(prev => ({ 
          ...prev, 
          studyStreak: res.data.study_streak || 0 
        }));
      } catch (err) {
        console.error("Failed to fetch user:", err);
        window.location.href = "/";
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await axios.get("http://localhost:4000/api/plans", { withCredentials: true });
        if (Array.isArray(res.data.plans)) {
          const withDueDate = res.data.plans
            .filter(p => p.due_date)
            .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

          const noDueDate = res.data.plans.filter(p => !p.due_date);
          setUpcomingPlans([...withDueDate, ...noDueDate].slice(0, 3));
        }
      } catch (err) {
        console.error("Failed to fetch upcoming plans:", err);
      }
    };
    fetchPlans();
  }, []);

  useEffect(() => {
    const fetchRecentNotes = async () => {
      try {
        const res = await axios.get("http://localhost:4000/api/notes", { withCredentials: true });
        if (Array.isArray(res.data.notes)) {
          const sortedNotes = res.data.notes
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 3);
          setRecentNotes(sortedNotes);
          setStats(prev => ({ ...prev, totalNotes: res.data.notes.length }));
        }
      } catch (err) {
        console.error("Failed to fetch notes:", err);
      }
    };
    fetchRecentNotes();
  }, []);

  useEffect(() => {
    const fetchQuizData = async () => {
      try {
        // Fetch available quizzes
        const quizRes = await axios.get("http://localhost:4000/api/quizzes", { 
          withCredentials: true 
        });
        
        // Fetch actual quiz attempts count
        const attemptsRes = await axios.get("http://localhost:4000/api/quiz-attempts/count", { 
          withCredentials: true 
        });
        
        if (Array.isArray(quizRes.data.quizzes)) {
          const sortedQuizzes = quizRes.data.quizzes
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 3);
          setRecentQuizzes(sortedQuizzes);
          
          setStats(prev => ({ 
            ...prev, 
            totalQuizzes: quizRes.data.quizzes.length,
            completedQuizzes: attemptsRes.data.count
          }));
        }
      } catch (err) {
        console.error("Failed to fetch quiz data:", err);
      }
    };
    fetchQuizData();
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  const handleFiles = (files) => {
    setError('');
    setExtractedContent(null);

    for (let file of files) {
      const fileType = file.type;
      const fileName = file.name.toLowerCase();

      if (!fileType.includes('pdf') &&
        !fileType.includes('presentation') &&
        !fileName.endsWith('.pdf') &&
        !fileName.endsWith('.ppt') &&
        !fileName.endsWith('.pptx')) {
        setError('Only PDF and PowerPoint files are allowed');
        return;
      }

      if (file.size > 25 * 1024 * 1024) {
        setError('File size exceeds 25MB limit');
        return;
      }
    }

    setUploadedFiles(prev => [...prev, ...files]);
    setIsExtracting(true);
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setExtractedContent(null);
    setError('');
  };

  const handleTextExtracted = (data) => {
    console.log('Text extracted:', data);
    setExtractedContent(data);
    setIsExtracting(false);
  };

  const handleGenerate = () => {
    if (uploadedFiles.length === 0) {
      setError('Please upload at least one file');
      return;
    }

    if (!extractedContent) {
      setError('Still extracting text from file. Please wait.');
      return;
    }

    setShowModal(true);
  };

  const handleUploadAndGenerate = async () => {
    if (uploadedFiles.length === 0) {
      alert("No file selected!");
      return;
    }

    const formData = new FormData();
    formData.append("myFile", uploadedFiles[0]);

    try {
      const res = await axios.post("http://localhost:4000/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true
      });

      console.log("Upload success:", res.data.filename);
      await generateSummary();

    } catch (err) {
      if (err.response) {
        if (err.response.status === 409) {
          alert("File with the same name already exists. Please rename your file.");
        } else if (err.response.status === 401) {
          alert("You must be logged in to upload files.");
        } else {
          alert("Upload failed: " + err.response.data.error);
        }
      } else {
        alert("Network error, please try again later.");
      }
    }
  };

  const generateSummary = async () => {
    try {
      const payload = {
        content: extractedContent.content,
        title: extractedContent.title,
        restrictions: restriction,
        metadata: {
          source: extractedContent.source,
          wordCount: extractedContent.wordCount,
          slideCount: extractedContent.slideCount
        }
      };

      const response = await axios.post(
        "http://localhost:4000/api/generate-summary",
        payload,
        { withCredentials: true }
      );

      console.log("Summary generated:", response.data);
      alert("Summary generated successfully!");

    } catch (err) {
      console.error("Summary generation error:", err);
      alert("Failed to generate summary");
    }
  };

  const GenerateModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Generate Summary</h2>
        <p className="text-gray-600 mb-6">Configure your summary preferences</p>

        {extractedContent && (
          <div className="mb-6 bg-green-50 border border-green-200 p-4 rounded-xl">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Ready to generate:</span> {extractedContent.wordCount} words from {extractedContent.source}
            </p>
          </div>
        )}

        <div className="space-y-4 mb-8">
          <label className="flex items-start space-x-3 cursor-pointer group">
            <input
              type="checkbox"
              className="w-5 h-5 mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              checked={restriction.uploaded}
              onChange={(e) => setRestriction(prev => ({ ...prev, uploaded: e.target.checked }))}
            />
            <div className="flex-1">
              <span className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">Uploaded File Only</span>
              <p className="text-sm text-gray-600 mt-1">
                Restrict generation to uploaded file content only
              </p>
            </div>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer group">
            <input
              type="checkbox"
              className="w-5 h-5 mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              checked={restriction.openai}
              onChange={(e) => setRestriction(prev => ({ ...prev, openai: e.target.checked }))}
            />
            <div className="flex-1">
              <span className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">AI Knowledge Base</span>
              <p className="text-sm text-gray-600 mt-1">
                Allow AI to enhance summaries with additional knowledge
              </p>
            </div>
          </label>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => setShowModal(false)}
            className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setShowModal(false);
              handleUploadAndGenerate();
            }}
            className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {user ? user.username : 'Student'}
              </h1>
              <p className="text-gray-600 mt-1">
                Let's make today productive
              </p>
            </div>
            <div className="hidden sm:flex items-center space-x-2 bg-indigo-50 px-4 py-2 rounded-full">
              <span className="text-2xl"></span>
              <span className="text-sm font-medium text-indigo-700">user title</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span className="text-xs text-gray-500">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalNotes}</p>
            <p className="text-xs text-gray-600 mt-1">Notes Created</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <Trophy className="w-5 h-5 text-yellow-600" />
              <span className="text-xs text-gray-500">Quizzes</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalQuizzes}</p>
            <p className="text-xs text-gray-600 mt-1">Available</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-5 h-5 text-green-600" />
              <span className="text-xs text-gray-500">Attempts</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.completedQuizzes}</p>
            <p className="text-xs text-gray-600 mt-1">Quizzes Taken</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-5 h-5 text-orange-600" />
              <span className="text-xs text-gray-500">Streak</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.studyStreak}</p>
            <p className="text-xs text-gray-600 mt-1">Day Streak</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - AI Summarizer */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Summarizer */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-indigo-100 rounded-lg p-2">
                  <span className="text-2xl">
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">AI Summarizer</h2>
                  <p className="text-sm text-gray-600">Upload your study materials</p>
                </div>
              </div>

              <div
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('fileInput').click()}
              >
                <input
                  id="fileInput"
                  type="file"
                  accept=".pdf,.ppt,.pptx"
                  onChange={handleFileInput}
                  className="hidden"
                  name='myFile'
                />
                <div className="text-5xl mb-4">📤</div>
                <p className="font-medium text-gray-900 mb-1">Drop your files here</p>
                <p className="text-sm text-gray-500">
                  or click to browse • PDF, PPT, PPTX • Max 25MB
                </p>
              </div>

              {uploadedFiles.length > 0 && (
                <>
                  <TextExtractor
                    file={uploadedFiles[0]}
                    onTextExtracted={handleTextExtracted}
                  />

                  <div className="mt-6 space-y-3">
                    <p className="text-sm font-medium text-gray-700">Uploaded Files</p>
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 border border-gray-200 p-4 rounded-xl hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="flex-shrink-0">
                            {file.name.toLowerCase().includes('pdf') ? (
                              <span className="text-2xl">📄</span>
                            ) : (
                              <span className="text-2xl">📊</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                            <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(index);
                          }}
                          className="ml-3 text-gray-400 hover:text-red-600 transition-colors p-1"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  {extractedContent && (
                    <div className="mt-4 bg-green-50 border border-green-200 p-4 rounded-xl">
                      <div className="flex items-start space-x-3">
                        <span className="text-xl">✓</span>
                        <div>
                          <p className="text-sm font-medium text-green-900">Extraction Complete</p>
                          <p className="text-xs text-green-700 mt-1">
                            {extractedContent.wordCount} words {extractedContent.slideCount && `• ${extractedContent.slideCount} slides`}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 p-4 rounded-xl">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <button
                type='button'
                onClick={handleGenerate}
                disabled={uploadedFiles.length === 0 || isExtracting || !extractedContent}
                className={`mt-6 w-full py-3.5 rounded-xl font-medium transition-all ${
                  uploadedFiles.length > 0 && !isExtracting && extractedContent
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-md'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isExtracting ? (
                  <span className="flex items-center justify-center space-x-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Extracting Text...</span>
                  </span>
                ) : (
                  'Generate Summary'
                )}
              </button>
            </div>

            {/* Recent Activity Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Recent Notes */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">Recent Notes</h3>
                  </div>
                  <a href="/notes" className="text-sm text-indigo-600 hover:text-indigo-700">View all</a>
                </div>
                <div className="space-y-3">
                  {recentNotes.length > 0 ? (
                    recentNotes.map((note) => (
                      <a
                        key={note.note_id}
                        href="/notes"
                        className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <p className="font-medium text-sm text-gray-900 truncate">{note.title}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-500">{note.words || 0} words</span>
                          <span className="text-xs text-gray-500">{formatDate(note.created_at)}</span>
                        </div>
                      </a>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No notes yet</p>
                  )}
                </div>
              </div>

              {/* Recent Quizzes */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Trophy className="w-5 h-5 text-yellow-600" />
                    <h3 className="font-semibold text-gray-900">Recent Quizzes</h3>
                  </div>
                  <a href="/quizzes" className="text-sm text-indigo-600 hover:text-indigo-700">View all</a>
                </div>
                <div className="space-y-3">
                  {recentQuizzes.length > 0 ? (
                    recentQuizzes.map((quiz) => (
                      <a
                        key={quiz.quiz_id}
                        href="/quizzes"
                        className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <p className="font-medium text-sm text-gray-900 truncate">{quiz.title}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-500">{quiz.total_questions || 0} questions</span>
                          <span className="text-xs text-gray-500">{formatDate(quiz.created_at)}</span>
                        </div>
                      </a>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No quizzes yet</p>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions - Bottom Left */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-3 md:grid-cols-3 gap-3">
                <a
                  href="/notes"
                  className="flex flex-col items-center justify-center p-4 rounded-lg hover:bg-blue-50 transition-colors border border-gray-200 hover:border-blue-300"
                >
                  <div className="bg-blue-100 p-3 rounded-lg mb-2">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 text-center">Create Note</p>
                </a>
                <a
                  href="/quizzes"
                  className="flex flex-col items-center justify-center p-4 rounded-lg hover:bg-yellow-50 transition-colors border border-gray-200 hover:border-yellow-300"
                >
                  <div className="bg-yellow-100 p-3 rounded-lg mb-2">
                    <Trophy className="w-6 h-6 text-yellow-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 text-center">Start Quiz</p>
                </a>
                <a
                  href="/planner"
                  className="flex flex-col items-center justify-center p-4 rounded-lg hover:bg-red-50 transition-colors border border-gray-200 hover:border-red-300"
                >
                  <div className="bg-red-100 p-3 rounded-lg mb-2">
                    <Calendar className="w-6 h-6 text-red-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 text-center">Add Plan</p>
                </a>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Upcoming Deadlines */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-red-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Upcoming Deadlines</h2>
                </div>
                <a href="/planner" className="text-sm text-indigo-600 hover:text-indigo-700">View all</a>
              </div>
              <div className="space-y-3">
                {upcomingPlans.length > 0 ? (
                  upcomingPlans.map((plan) => {
                    let label = "";
                    let colorClass = "";

                    if (!plan.due_date) {
                      label = "No deadline";
                      colorClass = "bg-gray-50 border-gray-200";
                    } else {
                      const dueDate = new Date(plan.due_date);
                      const today = new Date();
                      const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

                      if (diffDays < 0) {
                        label = "Overdue";
                        colorClass = "bg-red-50 border-red-200";
                      } else if (diffDays === 0) {
                        label = "Due today";
                        colorClass = "bg-orange-50 border-orange-200";
                      } else if (diffDays === 1) {
                        label = "Tomorrow";
                        colorClass = "bg-yellow-50 border-yellow-200";
                      } else if (diffDays < 7) {
                        label = `${diffDays} days`;
                        colorClass = "bg-blue-50 border-blue-200";
                      } else {
                        label = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        colorClass = "bg-gray-50 border-gray-200";
                      }
                    }

                    return (
                      <div
                        key={plan.planner_id}
                        className={`border rounded-xl p-4 ${colorClass} transition-all hover:shadow-sm`}
                      >
                        <div className="flex items-start justify-between">
                          <p className="font-medium text-gray-900 flex-1 text-sm">{plan.title}</p>
                          <span className="ml-3 text-xs font-medium text-gray-600 bg-white px-2 py-1 rounded-full whitespace-nowrap">
                            {label}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">🎉</div>
                    <p className="text-sm">No upcoming deadlines</p>
                  </div>
                )}
              </div>
            </div>

            {/* Pet Buddy */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
              <PetBuddy userId={user?.user_id} />
            </div>
          </div>
        </div>
      </div>

      {showModal && <GenerateModal />}
    </div>
  );
}