import { useState, useEffect } from "react";
import axios from "axios";
import { Eye, Trash2, Menu, Search } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import ToastContainer from "../../components/ToastContainer";
import { useToast } from "../../hooks/useToast";
import ConfirmDialog from "../../components/ConfirmDialog";
import QuestionsModal from "../../components/QuestionsModal";
import { useConfirm } from "../../hooks/useConfirm";
import { API_URL } from "../../config/api.config";

export default function QuizManagement() {
    const { toasts, toast, removeToast } = useToast();
    const { confirmState, confirm, closeConfirm } = useConfirm();
    const [quizzes, setQuizzes] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("All");
    const quizzesPerPage = 13;
    const [questionsModalState, setQuestionsModalState] = useState({
        isOpen: false,
        quiz: null,
        questions: []
    });

    useEffect(() => {
        const fetchQuizzes = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/admin/quizzes`, {
                    withCredentials: true,
                });
                setQuizzes(res.data || []);
            } catch (err) {
                console.error("Failed to fetch quizzes:", err);
            }
        };
        fetchQuizzes();
    }, []);

    const handleViewQuestions = async (quiz) => {
        try {
            const res = await axios.get(`${API_URL}/api/admin/quizzes/${quiz.quiz_id}/questions`, {
                withCredentials: true,
            });
            setQuestionsModalState({
                isOpen: true,
                quiz: quiz,
                questions: res.data || []
            });
        } catch (err) {
            toast.error("Failed to load questions. Please try again.");
        }
    };

    const handleDeleteQuestion = async (questionId) => {
        try {
            await axios.delete(`${API_URL}/api/admin/questions/${questionId}`, {
                withCredentials: true,
            });

            setQuestionsModalState(prev => ({
                ...prev,
                questions: prev.questions.filter(q => q.question_id !== questionId)
            }));

            setQuizzes(prev => prev.map(quiz =>
                quiz.quiz_id === questionsModalState.quiz.quiz_id
                    ? { ...quiz, questions: quiz.questions - 1 }
                    : quiz
            ));

            toast.success("Question deleted successfully!");
        } catch (err) {
            console.error("Failed to delete question:", err);
            toast.error("Failed to delete question. Please try again.");
        }
    };

    const closeQuestionsModal = () => {
        setQuestionsModalState({
            isOpen: false,
            quiz: null,
            questions: []
        });
    };

    const handleDeleteQuiz = async (quizId) => {
        await confirm({
            title: 'Delete Quiz',
            message: 'Are you sure you want to delete this quiz? This action cannot be undone.',
            confirmText: 'Delete',
            cancelText: 'Cancel',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await axios.delete(`${API_URL}/api/admin/quizzes/${quizId}`, {
                        withCredentials: true,
                    });
                    setQuizzes((prev) => prev.filter((q) => q.quiz_id !== quizId));
                    toast.success("Quiz deleted successfully!");
                } catch (err) {
                    console.error("Failed to delete quiz:", err);
                    toast.error("Failed to delete quiz. Please try again.");
                }
            }
        });
    };

    // Filter and search 
    const filteredQuizzes = quizzes.filter((quiz) => {
        const matchesSearch =
            quiz.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            quiz.creator?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            quiz.quiz_id?.toString().includes(searchTerm);
        const matchesFilter = filterStatus === "All" || quiz.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    const indexOfLastQuiz = currentPage * quizzesPerPage;
    const indexOfFirstQuiz = indexOfLastQuiz - quizzesPerPage;
    const currentQuizzes = filteredQuizzes.slice(indexOfFirstQuiz, indexOfLastQuiz);
    const totalPages = Math.ceil(filteredQuizzes.length / quizzesPerPage);

    const handleNext = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
    const handlePrev = () => currentPage > 1 && setCurrentPage(currentPage - 1);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterStatus]);

    return (
        <div className="flex w-full min-h-screen bg-gray-100 relative">
            <ToastContainer toasts={toasts} removeToast={removeToast} />
            <ConfirmDialog
                isOpen={confirmState.isOpen}
                onClose={closeConfirm}
                onConfirm={confirmState.onConfirm}
                title={confirmState.title}
                message={confirmState.message}
                confirmText={confirmState.confirmText}
                cancelText={confirmState.cancelText}
                variant={confirmState.variant}
            />
            <QuestionsModal
                isOpen={questionsModalState.isOpen}
                onClose={closeQuestionsModal}
                quiz={questionsModalState.quiz}
                questions={questionsModalState.questions}
                onDeleteQuestion={handleDeleteQuestion}
            />

            {/* Desktop Sidebar */}
            <div className="hidden md:block fixed top-0 left-0 h-screen w-64 bg-yellow-400">
                <Sidebar />
            </div>

            {/* Mobile Sidebar Overlay */}
            <div
                className={`fixed inset-0 bg-black bg-opacity-40 z-50 md:hidden transition-opacity ${sidebarOpen ? "opacity-100 visible" : "opacity-0 invisible"
                    }`}
                onClick={() => setSidebarOpen(false)}
            >
                <div
                    className={`absolute top-0 left-0 h-full w-64 bg-yellow-400 shadow-lg transform transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
                        }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col md:ml-64 min-h-screen">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
                    <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                className="md:hidden p-2 rounded-lg hover:bg-gray-100"
                                onClick={() => setSidebarOpen(true)}
                            >
                                <Menu className="w-6 h-6 text-gray-800" />
                            </button>
                            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                                Quiz Management
                            </h1>
                        </div>
                    </div>
                </div>

                {/* Table Section */}
                <div className="flex-1 overflow-y-auto px-2 sm:px-4 md:px-6 py-6 sm:py-8">
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                                Quiz List
                            </h2>

                            {/* Search and Filter */}
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                <div className="relative flex-1 sm:flex-none">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search quizzes..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 focus:border-transparent w-full sm:w-64"
                                    />
                                </div>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                                >
                                    <option value="All">All Status</option>
                                    <option value="Open">Open</option>
                                    <option value="Private">Private</option>
                                </select>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full table-fixed text-xs sm:text-sm text-left">
                                <thead>
                                    <tr className="border-b border-gray-200 text-gray-600">
                                        <th className="py-2 px-2 sm:px-3 w-20">Quiz ID</th>
                                        <th className="py-2 px-2 sm:px-3 w-28">Creator</th>
                                        <th className="py-2 px-2 sm:px-3 w-40">Details</th>
                                        <th className="py-2 px-2 sm:px-3 w-24">Questions</th>
                                        <th className="py-2 px-2 sm:px-3 w-28">Times Taken</th>
                                        <th className="py-2 px-2 sm:px-3 w-24">Status</th>
                                        <th className="py-2 px-2 sm:px-3 w-28">Created</th>
                                        <th className="py-2 px-2 sm:px-3 w-32">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentQuizzes.length > 0 ? (
                                        currentQuizzes.map((quiz) => (
                                            <tr key={quiz.quiz_id} className="border-b border-gray-100">
                                                <td className="py-2 px-2 sm:px-3 truncate">{quiz.quiz_id}</td>
                                                <td className="py-2 px-2 sm:px-3 font-medium truncate">{quiz.creator}</td>
                                                <td className="py-2 px-2 sm:px-3">
                                                    <div>
                                                        <p className="font-medium text-gray-800 break-words">
                                                            {quiz.title}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="py-2 px-2 sm:px-3 truncate">{quiz.questions}</td>
                                                <td className="py-2 px-2 sm:px-3 truncate">{quiz.timesTaken}</td>
                                                <td className="py-2 px-2 sm:px-3">
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-xs font-medium ${quiz.status === "Open"
                                                            ? "bg-green-100 text-green-800"
                                                            : "bg-gray-200 text-gray-700"
                                                            }`}
                                                    >
                                                        {quiz.status}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-2 sm:px-3 text-gray-600 truncate">
                                                    {quiz.created}
                                                </td>
                                                <td className="py-2 px-2 sm:px-3 flex space-x-1 sm:space-x-2">
                                                    <button
                                                        onClick={() => handleViewQuestions(quiz)}
                                                        className="flex items-center bg-blue-500 text-white px-2 sm:px-3 py-1.5 rounded-lg text-xs hover:bg-blue-600"
                                                    >
                                                        <Eye className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                                                        <span className="hidden sm:inline">View</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteQuiz(quiz.quiz_id)}
                                                        className="flex items-center bg-red-500 text-white px-2 sm:px-3 py-1.5 rounded-lg text-xs hover:bg-red-600"
                                                    >
                                                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                                                        <span className="hidden sm:inline">Delete</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="8" className="text-center py-4 text-gray-500">
                                                No quizzes found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between mt-6 sm:p-2 gap-3">
                            <button
                                onClick={handlePrev}
                                disabled={currentPage === 1}
                                className="w-full sm:w-auto px-4 py-2 text-sm font-medium bg-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-300"
                            >
                                Previous
                            </button>

                            <span className="text-sm text-gray-700">
                                Page {currentPage} of {totalPages}
                            </span>

                            <button
                                onClick={handleNext}
                                disabled={currentPage === totalPages}
                                className="w-full sm:w-auto px-4 py-2 text-sm font-medium bg-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-300"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}