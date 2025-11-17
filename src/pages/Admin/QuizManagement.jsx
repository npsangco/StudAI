import { useState, useEffect } from "react";
import axios from "axios";
import { Edit3, Trash2 } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import ToastContainer from "../../components/ToastContainer";
import { useToast } from "../../hooks/useToast";
import ConfirmDialog from "../../components/ConfirmDialog";
import { useConfirm } from "../../hooks/useConfirm";
import { API_URL } from "../../config/api.config";

export default function QuizManagement() {
    const { toasts, toast, removeToast } = useToast();
    const { confirmState, confirm, closeConfirm } = useConfirm();
    const [quizzes, setQuizzes] = useState([]);

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

    const handleEdit = (quizId) => {
        
        // You can later redirect to an edit page or open a modal here
    };

    const handleDelete = async (quizId) => {
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

    return (
        <div className="flex min-h-screen bg-gray-100">
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
            {/* Sidebar */}
            <div className="hidden md:block fixed top-0 left-0 h-screen">
                <Sidebar />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col md:ml-64">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
                    <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                        <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                            Quiz Management
                        </h1>
                    </div>
                </div>

                {/* Table Section */}
                <div className="flex-1 overflow-y-auto px-4 md:px-6 py-8">
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            Quiz List
                        </h2>

                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm text-left">
                                <thead>
                                    <tr className="border-b border-gray-200 text-gray-600">
                                        <th className="py-2 px-3">Quiz ID</th>
                                        <th className="py-2 px-3">Creator</th>
                                        <th className="py-2 px-3">Details</th>
                                        <th className="py-2 px-3">Questions</th>
                                        <th className="py-2 px-3">Times Taken</th>
                                        <th className="py-2 px-3">Status</th>
                                        <th className="py-2 px-3">Created</th>
                                        <th className="py-2 px-3">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {quizzes.length > 0 ? (
                                        quizzes.map((quiz) => (
                                            <tr key={quiz.quiz_id} className="border-b border-gray-100">
                                                <td className="py-2 px-3">{quiz.quiz_id}</td>
                                                <td className="py-2 px-3 font-medium">{quiz.creator}</td>
                                                <td className="py-2 px-3">
                                                    <div>
                                                        <p className="font-medium text-gray-800">
                                                            {quiz.title}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {quiz.details}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="py-2 px-3">{quiz.questions}</td>
                                                <td className="py-2 px-3">{quiz.timesTaken}</td>
                                                <td className="py-2 px-3">
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-xs font-medium ${quiz.status === "Open"
                                                                ? "bg-green-100 text-green-800"
                                                                : "bg-gray-200 text-gray-700"
                                                            }`}
                                                    >
                                                        {quiz.status}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-3 text-gray-600">
                                                    {quiz.created}
                                                </td>
                                                <td className="py-2 px-3 flex space-x-2">
                                                    <button
                                                        onClick={() => handleEdit(quiz.quiz_id)}
                                                        className="flex items-center bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-blue-600"
                                                    >
                                                        <Edit3 className="w-4 h-4 mr-1" /> Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(quiz.quiz_id)}
                                                        className="flex items-center bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-red-600"
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-1" /> Delete
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
                </div>
            </div>
        </div>
    );
}
