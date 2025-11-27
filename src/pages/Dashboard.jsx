import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import TextExtractor from '../components/TextExtractor';
import PetBuddy from '../components/PetBuddy';
import AchievementsModal from '../components/AchievementsModal';
import ToastContainer from '../components/ToastContainer';
import AppLoader from '../components/AppLoader';
import TutorialOverlay from '../components/TutorialOverlay';
import { useToast } from '../hooks/useToast';
import { useTutorial } from '../hooks/useTutorial';
import { dashboardTutorialSteps } from '../config/tutorialSteps';
import TutorialButton from '../components/TutorialButton';
import { API_URL } from '../config/api.config';
import { aiUsageApi } from '../api/api';
import { extractTokenFromURL } from '../utils/authUtils';
import { FileText, BookOpen, Trophy, TrendingUp, Clock, Calendar, Target, Zap } from 'lucide-react';

// Import the configured api instance with interceptors for hybrid auth
import api from '../api/api';

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [equippedAchievement, setEquippedAchievement] = useState(null);
  const [recentAchievements, setRecentAchievements] = useState([]);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [stats, setStats] = useState({
    totalNotes: 0,
    totalQuizzes: 0,
    completedQuizzes: 0,  // Total quiz attempts
    distinctQuizzes: 0,   // Distinct quizzes for rate calculation
    studyStreak: 0
  });
  const [aiUsage, setAiUsage] = useState(null);
  const [isUsageLoading, setIsUsageLoading] = useState(true);
  
  const { toasts, removeToast, toast } = useToast();
  const { showTutorial, completeTutorial, skipTutorial, startTutorial } = useTutorial();

  const refreshAiUsage = useCallback(async () => {
    try {
      const { data } = await aiUsageApi.getToday();
      setAiUsage(data);
    } catch (err) {
      console.error('Failed to fetch AI usage:', err);
    } finally {
      setIsUsageLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAiUsage();
  }, [refreshAiUsage]);

  const summaryLimit = aiUsage?.limits?.summary ?? 2;
  const summaryRemaining = aiUsage?.remaining?.summary ?? summaryLimit;
  const summaryLimitReached = !isUsageLoading && summaryRemaining <= 0;

  useEffect(() => {
    // Extract token from URL if present (from OAuth or email verification)
    extractTokenFromURL();
    
    const fetchUser = async () => {
      try {
        // Debug: Check if token exists
        const token = localStorage.getItem('authToken');
        console.log('🔑 Auth token present:', !!token);
        
        const res = await api.get('/user/profile');
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
    const fetchEquippedAchievement = async () => {
      try {
        const res = await api.get('/achievements');
        
        if (res.data.success) {
          const equipped = res.data.achievements.find(a => a.is_equipped);
          setEquippedAchievement(equipped || null);
        }
      } catch (err) {
        console.error("Failed to fetch equipped achievement:", err);
      }
    };

    fetchEquippedAchievement();
  }, []);

  useEffect(() => {
    const fetchRecentAchievements = async () => {
      try {
        const res = await api.get('/achievements/unlocked');
        
        if (res.data.success) {
          // Get the 3 most recently unlocked achievements
          const sortedAchievements = res.data.achievements
            .sort((a, b) => new Date(b.unlocked_at) - new Date(a.unlocked_at))
            .slice(0, 1);
          setRecentAchievements(sortedAchievements);
        }
      } catch (err) {
        console.error("Failed to fetch recent achievements:", err);
      }
    };

    fetchRecentAchievements();
  }, []);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await api.get('/plans');
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
        const res = await api.get('/notes');
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
        const quizRes = await api.get('/quizzes');
        
        // Fetch actual quiz attempts count
        const attemptsRes = await api.get('/quiz-attempts/count');
        
        if (Array.isArray(quizRes.data.quizzes)) {
          const sortedQuizzes = quizRes.data.quizzes
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 3);
          setRecentQuizzes(sortedQuizzes);
          
          setStats(prev => ({ 
            ...prev, 
            totalQuizzes: quizRes.data.quizzes.length,
            completedQuizzes: attemptsRes.data.totalAttempts || 0,     // Total attempts
            distinctQuizzes: attemptsRes.data.distinctQuizzes || 0      // Distinct quizzes
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

  // AI Summarization using OpenAI (via backend)
  const generateAISummary = async (content, title) => {
    try {

      let systemPrompt = "You are an expert educational assistant that creates comprehensive, well-structured study notes and summaries.";
      
      if (restriction.uploaded && !restriction.openai) {
        systemPrompt += " You must ONLY use information from the provided content. Do not add any external knowledge or information.";
      } else if (!restriction.uploaded && restriction.openai) {
        systemPrompt += " You can enhance the summary with relevant additional knowledge and context from your training.";
      } else if (restriction.uploaded && restriction.openai) {
        systemPrompt += " Use the provided content as the primary source, but you may enhance it with relevant additional knowledge when it adds value.";
      }

      const userPrompt = `Please create a comprehensive, well-organized summary of the following educational content titled "${title}".

Include:
1. Key Topics and Main Ideas
2. Important Concepts and Definitions
3. Critical Points to Remember
4. Practical Applications (if applicable)
5. Summary Conclusion

Content to summarize:
${content}

Please format the summary in a clear, organized manner with proper headings and bullet points where appropriate.`;

      const response = await api.post('/openai/summarize', {
        text: userPrompt,
        systemPrompt: systemPrompt
      });

      if (!response.data || !response.data.summary) {
        console.error('🤖 [AI Summary] ERROR: No summary in response:', response.data);
        throw new Error("No summary generated");
      }

      return response.data.summary;
    } catch (error) {
      console.error("❌ [AI Summary] Error generating AI summary:", error);
      if (error.response) {
        console.error("❌ [AI Summary] Response status:", error.response.status);
        console.error("❌ [AI Summary] Response data:", error.response.data);
      }
      throw error;
    }
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setExtractedContent(null);
    setError('');
  };

  const handleTextExtracted = (data) => {
    
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

    if (summaryLimitReached) {
      toast.error("You've reached your daily AI summary limit. Try again tomorrow.");
      return;
    }

    setShowModal(true);
  };

  const handleUploadAndGenerate = async () => {
    if (uploadedFiles.length === 0) {
      toast.error("No file selected!");
      return;
    }

    if (!extractedContent) {
      toast.warning("Content extraction incomplete. Please wait.");
      return;
    }

    if (summaryLimitReached) {
      toast.error("You've reached your daily AI summary limit. Try again tomorrow.");
      return;
    }

    setIsGenerating(true);
    setShowModal(false);

    try {
      
      const aiSummary = await generateAISummary(
        extractedContent.content,
        extractedContent.title
      );

      const formData = new FormData();
      formData.append("myFile", uploadedFiles[0]);

      const uploadRes = await api.post('/upload', formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      const uploadedFileId = uploadRes?.data?.file_id ?? null;

      const payload = {
        content: aiSummary,
        title: extractedContent.title,
        restrictions: restriction,
        file_id: uploadedFileId,
        metadata: {
          source: extractedContent.source,
          wordCount: extractedContent.wordCount,
          slideCount: extractedContent.slideCount,
          originalContent: extractedContent.content.substring(0, 500) + "..."
        }
      };

      const summaryRes = await api.post('/generate-summary', payload);

      toast.success("Summary generated and saved successfully!");
      refreshAiUsage();
      
      // Clear the uploaded files and reset state
      setUploadedFiles([]);
      setExtractedContent(null);
      setRestriction({ uploaded: false, openai: false });

      // Refresh recent notes
      const notesRes = await api.get('/notes');
      if (Array.isArray(notesRes.data.notes)) {
        const sortedNotes = notesRes.data.notes
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 3);
        setRecentNotes(sortedNotes);
        setStats(prev => ({ ...prev, totalNotes: notesRes.data.notes.length }));
      }

    } catch (err) {
      console.error("❌ [Upload Process] Error in upload and generate process:", err);
      
      if (err.response) {
        console.error("❌ [Upload Process] Response status:", err.response.status);
        console.error("❌ [Upload Process] Response data:", err.response.data);
        const status = err.response.status;
        
        if (status === 422) {
          toast.error(err.response.data?.error || 'Content violated our safety policies. Please adjust and try again.');
        } else if (status === 409) {
          toast.error("File with the same name already exists. Please rename your file.");
        } else if (status === 401) {
          toast.error("You must be logged in to upload files.");
        } else if (status === 500) {
          toast.error(`Server error: ${err.response.data.error || err.response.data.details || "Unknown error"}`);
        } else {
          toast.error(`Upload failed: ${err.response.data.error || err.message}`);
        }
        if (status === 429) {
          refreshAiUsage();
        }
      } else if (err.message.includes("OpenAI")) {
        toast.error("AI summarization failed. Please check your API key and try again.");
      } else {
        console.error("❌ [Upload Process] Network error:", err.message);
        toast.error("Network error, please try again later.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Recently';
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

  // Get user title based on equipped achievement
  const getUserTitle = () => {
    if (equippedAchievement) {
      return equippedAchievement.title;
    }
    return "No User Title";
  };

  const GenerateModal = () => (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
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

        <div className="mb-4 bg-gray-50 border border-gray-200 p-3 rounded-lg text-sm text-gray-700 flex items-center justify-between">
          <span>Daily AI summaries: {summaryLimit}</span>
          <span className={summaryLimitReached ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
            {summaryLimitReached ? 'Limit reached' : `${summaryRemaining} left`}
          </span>
        </div>

        {summaryLimitReached && (
          <div className="mb-4 bg-red-50 border border-red-200 p-3 rounded-lg text-sm text-red-700">
            Daily AI summary limit reached. Try again tomorrow.
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
            onClick={handleUploadAndGenerate}
            disabled={isGenerating || summaryLimitReached}
            className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
      
      {/* Tutorial Overlay */}
      {showTutorial && (
        <TutorialOverlay 
          steps={dashboardTutorialSteps}
          onComplete={completeTutorial}
          onSkip={skipTutorial}
        />
      )}
      
      {/* Clean Professional Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4" data-tutorial="welcome">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                  Welcome back, {user ? user.username : 'Student'}
                </h1>
                {equippedAchievement && (
                  <div 
                    className="px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                    style={{ 
                      backgroundColor: `${equippedAchievement.color}15`,
                      color: equippedAchievement.color,
                      border: `1px solid ${equippedAchievement.color}30`
                    }}
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    {getUserTitle()}
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            
            {/* User Points & Streak Display */}
            <div className="flex flex-wrap gap-3">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs text-indigo-600 font-medium">Points</p>
                  <p className="text-lg font-bold text-indigo-900">{user?.points || 0}</p>
                </div>
              </div>
              
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <Zap className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-orange-600 font-medium">Streak</p>
                  <p className="text-lg font-bold text-orange-900">{stats.studyStreak} days</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Activity Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6" data-tutorial="stats">
            <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-lg hover:border-blue-300 transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-blue-100 p-3 rounded-xl group-hover:bg-blue-600 transition-colors">
                  <FileText className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
                </div>
                <div className="bg-yellow-50 px-3 py-1 rounded-full">
                  <span className="text-xs font-semibold text-blue-700">Total</span>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stats.totalNotes}</p>
              <p className="text-sm text-gray-600 font-medium">Notes Created</p>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">Study materials</p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-lg hover:border-yellow-300 transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-yellow-100 p-3 rounded-xl group-hover:bg-yellow-600 transition-colors">
                  <Trophy className="w-6 h-6 text-yellow-600 group-hover:text-white transition-colors" />
                </div>
                <div className="bg-yellow-50 px-3 py-1 rounded-full">
                  <span className="text-xs font-semibold text-yellow-700">Ready</span>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stats.totalQuizzes}</p>
              <p className="text-sm text-gray-600 font-medium">Quizzes Available</p>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">Practice tests</p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-lg hover:border-green-300 transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-green-100 p-3 rounded-xl group-hover:bg-green-600 transition-colors">
                  <Target className="w-6 h-6 text-green-600 group-hover:text-white transition-colors" />
                </div>
                <div className="bg-green-50 px-3 py-1 rounded-full">
                  <span className="text-xs font-semibold text-green-700">Done</span>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stats.completedQuizzes}</p>
              <p className="text-sm text-gray-600 font-medium">Quizzes Completed</p>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">Your attempts</p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-lg hover:border-purple-300 transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-purple-100 p-3 rounded-xl group-hover:bg-purple-600 transition-colors">
                  <Clock className="w-6 h-6 text-purple-600 group-hover:text-white transition-colors" />
                </div>
                <div className="bg-purple-50 px-3 py-1 rounded-full">
                  <span className="text-xs font-semibold text-purple-700">Active</span>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{upcomingPlans.length}</p>
              <p className="text-sm text-gray-600 font-medium">Pending Plans</p>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">To complete</p>
              </div>
            </div>
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - AI Summarizer */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Summarizer */}
            <div className="bg-white rounded-lg border border-gray-200 p-6" data-tutorial="ai-summarizer">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-indigo-100 p-2.5 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">AI Study Assistant</h2>
                    <p className="text-sm text-gray-600">Generate summaries from your materials</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-medium text-gray-600 mb-4">
                <span>Daily AI summaries: {summaryLimit}</span>
                <span className={summaryLimitReached ? 'text-red-600' : 'text-green-600'}>
                  {summaryLimitReached ? 'Limit reached' : `${summaryRemaining} left today`}
                </span>
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
                <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-indigo-600" />
                </div>
                <p className="font-semibold text-gray-900 mb-1">Drop your files here</p>
                <p className="text-sm text-gray-500">
                  or click to browse
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Supported: PDF, PPT, PPTX • Max 25MB
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
                      <div key={index} className="flex items-center justify-between bg-gray-50 border border-gray-200 p-4 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="flex-shrink-0">
                            <div className="bg-white p-2 rounded-lg border border-gray-300">
                              <FileText className="w-5 h-5 text-gray-600" />
                            </div>
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
                    <div className="mt-4 bg-green-50 border border-green-200 p-4 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <div className="bg-green-100 p-1.5 rounded-lg">
                          <Target className="w-4 h-4 text-green-600" />
                        </div>
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
                disabled={uploadedFiles.length === 0 || isExtracting || !extractedContent || isGenerating || summaryLimitReached}
                className={`mt-6 w-full py-3.5 rounded-xl font-medium transition-all ${
                  uploadedFiles.length > 0 && !isExtracting && extractedContent && !summaryLimitReached
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

              {summaryLimitReached && (
                <p className="mt-3 text-sm text-red-600 text-center font-medium">
                  Daily AI summary limit reached. Try again tomorrow.
                </p>
              )}
            </div>

            {/* Recent Activity Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-tutorial="recent-activity">
              {/* Recent Notes */}
              <div className="bg-white rounded-lg border border-gray-200 p-5">{/* Recent Notes */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-yellow-50 p-2 rounded-lg">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm">Recent Notes</h3>
                  </div>
                  <a href="/notes" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">View all →</a>
                </div>
                <div className="space-y-2">
                  {recentNotes.length > 0 ? (
                    recentNotes.map((note) => (
                      <a
                        key={note.note_id}
                        href="/notes"
                        className="block p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-yellow-50 transition-all"
                      >
                        <p className="font-medium text-sm text-gray-900 truncate mb-1">{note.title}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">{note.words || 0} words</span>
                          <span className="text-xs text-gray-500">{formatDate(note.created_at)}</span>
                        </div>
                      </a>
                    ))
                  ) : (
                    <div className="text-center py-6">
                      <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No notes yet</p>
                      <a href="/notes" className="text-xs text-indigo-600 hover:text-indigo-700 mt-1 inline-block">Create your first note</a>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Quizzes */}
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-yellow-50 p-2 rounded-lg">
                      <Trophy className="w-4 h-4 text-yellow-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm">Recent Quizzes</h3>
                  </div>
                  <a href="/quizzes" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">View all →</a>
                </div>
                <div className="space-y-2">
                  {recentQuizzes.length > 0 ? (
                    recentQuizzes.map((quiz) => (
                      <a
                        key={quiz.quiz_id}
                        href="/quizzes"
                        className="block p-3 border border-gray-200 rounded-lg hover:border-yellow-300 hover:bg-yellow-50 transition-all"
                      >
                        <p className="font-medium text-sm text-gray-900 truncate mb-1">{quiz.title}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">{quiz.total_questions || 0} questions</span>
                          <span className="text-xs text-gray-500">{formatDate(quiz.created_at)}</span>
                        </div>
                      </a>
                    ))
                  ) : (
                    <div className="text-center py-6">
                      <Trophy className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No quizzes yet</p>
                      <a href="/quizzes" className="text-xs text-indigo-600 hover:text-indigo-700 mt-1 inline-block">Create your first quiz</a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-5" data-tutorial="quick-actions">
                <h3 className="font-semibold text-gray-900 mb-4 text-sm flex items-center gap-2">
                  <div className="w-1 h-4 bg-indigo-600 rounded"></div>
                  Quick Actions
                </h3>
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <a
                    href="/notes"
                    className="flex flex-col items-center justify-center p-4 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-yellow-50 transition-all group"
                  >
                    <div className="bg-blue-100 p-3 rounded-lg mb-2 group-hover:bg-blue-200 transition-colors">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-xs font-medium text-gray-900 text-center">Create Note</p>
                  </a>
                  <a
                    href="/quizzes"
                    className="flex flex-col items-center justify-center p-4 rounded-lg border border-gray-200 hover:border-yellow-400 hover:bg-yellow-50 transition-all group"
                  >
                    <div className="bg-yellow-100 p-3 rounded-lg mb-2 group-hover:bg-yellow-200 transition-colors">
                      <Trophy className="w-5 h-5 text-yellow-600" />
                    </div>
                    <p className="text-xs font-medium text-gray-900 text-center">Start Quiz</p>
                  </a>
                  <a
                    href="/planner"
                    className="flex flex-col items-center justify-center p-4 rounded-lg border border-gray-200 hover:border-red-400 hover:bg-red-50 transition-all group"
                  >
                    <div className="bg-red-100 p-3 rounded-lg mb-2 group-hover:bg-red-200 transition-colors">
                      <Calendar className="w-5 h-5 text-red-600" />
                    </div>
                    <p className="text-xs font-medium text-gray-900 text-center">Add Plan</p>
                  </a>
                </div>

                {/* Study Progress Summary */}
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                    Your Progress
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-yellow-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-blue-900">Completion</span>
                        <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <p className="text-lg font-bold text-blue-900">
                        {stats.totalQuizzes > 0 ? Math.round((stats.distinctQuizzes / stats.totalQuizzes) * 100) : 0}%
                      </p>
                      <p className="text-xs text-blue-700 mt-0.5">Quiz rate</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-green-900">Productivity</span>
                        <Target className="w-3.5 h-3.5 text-green-600" />
                      </div>
                      <p className="text-lg font-bold text-green-900">{stats.totalNotes + stats.completedQuizzes}</p>
                      <p className="text-xs text-green-700 mt-0.5">Activities</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Upcoming Deadlines */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="bg-red-50 p-2 rounded-lg">
                    <Calendar className="w-4 h-4 text-red-600" />
                  </div>
                  <h2 className="text-sm font-semibold text-gray-900">Upcoming Deadlines</h2>
                </div>
                <a href="/planner" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">View all →</a>
              </div>
              <div className="space-y-3">
                {upcomingPlans.length > 0 ? (
                  upcomingPlans.map((plan) => {
                    let label = "";
                    let colorClass = "";
                    let badgeClass = "";
                    let iconColor = "";
                    let formattedDate = "";
                    let diffDays;

                    if (!plan.due_date) {
                      label = "No deadline";
                      colorClass = "bg-gray-50 border-gray-200";
                      badgeClass = "bg-gray-100 text-gray-600";
                      iconColor = "text-gray-400";
                    } else {
                      const dueDate = new Date(plan.due_date);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      dueDate.setHours(0, 0, 0, 0);
                      const diffTime = dueDate - today;
                      diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                      formattedDate = dueDate.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: dueDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
                      });

                      if (diffDays < 0) {
                        label = `Overdue (${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''})`;
                        colorClass = "bg-red-50 border-red-200 shadow-sm";
                        badgeClass = "bg-red-500 text-white";
                        iconColor = "text-red-500";
                      } else if (diffDays === 0) {
                        label = "Due today";
                        colorClass = "bg-orange-50 border-orange-200 shadow-sm";
                        badgeClass = "bg-orange-500 text-white";
                        iconColor = "text-orange-500";
                      } else if (diffDays === 1) {
                        label = "Tomorrow";
                        colorClass = "bg-yellow-50 border-yellow-200";
                        badgeClass = "bg-yellow-500 text-white";
                        iconColor = "text-yellow-600";
                      } else if (diffDays <= 3) {
                        label = `${diffDays} days`;
                        colorClass = "bg-yellow-50 border-yellow-200";
                        badgeClass = "bg-yellow-400 text-white";
                        iconColor = "text-yellow-500";
                      } else if (diffDays < 7) {
                        label = `${diffDays} days`;
                        colorClass = "bg-yellow-50 border-yellow-200";
                        badgeClass = "bg-blue-400 text-white";
                        iconColor = "text-blue-500";
                      } else {
                        label = formattedDate;
                        colorClass = "bg-green-50 border-green-200";
                        badgeClass = "bg-green-100 text-green-700";
                        iconColor = "text-green-500";
                      }
                    }

                    return (
                      <div
                        key={plan.planner_id}
                        className={`border rounded-xl p-4 ${colorClass} transition-all hover:shadow-md cursor-pointer group`}
                        onClick={() => window.location.href = '/planner'}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 ${iconColor}`}>
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="font-semibold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors">
                                {plan.title}
                              </p>
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeClass} shadow-sm whitespace-nowrap`}>
                                {label}
                              </span>
                              {formattedDate && (
                                <span className="text-xs text-gray-500 whitespace-nowrap">
                                  {formattedDate}
                                </span>
                              )}
                            </div>
                            {plan.description && (
                              <p className="text-xs text-gray-600 line-clamp-1">
                                {plan.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Calendar className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">No upcoming deadlines</p>
                    <p className="text-xs text-gray-400 mt-1">Create a plan with a deadline to see it here</p>
                  </div>
                )}
              </div>
            </div>

            {/* Pet Companion */}
            <div className="bg-white rounded-lg border border-gray-200 p-5" data-tutorial="pet-buddy">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-4 bg-purple-600 rounded"></div>
                <h2 className="text-sm font-semibold text-gray-900">Your Study Companion</h2>
              </div>
              <PetBuddy userId={user?.user_id} />
            </div>

            {/* Recent Achievements */}
            <div className="bg-white rounded-lg border border-gray-200 p-5" data-tutorial="achievements">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="bg-yellow-50 p-2 rounded-lg">
                    <Trophy className="w-4 h-4 text-yellow-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">Recent Achievement</h3>
                </div>
                <button 
                  onClick={() => setShowAchievementsModal(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  View all →
                </button>
              </div>
              <div className="space-y-3">
                {recentAchievements.length > 0 ? (
                  recentAchievements.map((achievement) => (
                    <div
                      key={achievement.achievement_id}
                      className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                    >
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center bg-opacity-20 flex-shrink-0"
                        style={{ backgroundColor: achievement.color }}
                      >
                        <Trophy className="w-5 h-5" style={{ color: achievement.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{achievement.title}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Unlocked {formatDate(achievement.unlocked_at)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No achievements yet</p>
                    <p className="text-xs text-gray-400 mt-1">Complete tasks to unlock achievements</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {showModal && <GenerateModal />}
          
          {showAchievementsModal && (
            <AchievementsModal 
              isOpen={showAchievementsModal} 
              onClose={() => setShowAchievementsModal(false)} 
            />
          )}

      {/* Loading Overlay */}
      {isGenerating && <AppLoader message="Generating AI Summary" />}

      {/* Tutorial Button */}
      <TutorialButton onClick={startTutorial} />
    </div>
  );
}
