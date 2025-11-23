import { useState } from 'react';
import { BookOpen, Trophy, MessageCircle, Users, Calendar, FileText, Video, Brain, Github, Linkedin, Mail, Phone, MapPin } from 'lucide-react';
import ToastContainer from "../components/ToastContainer";
import { useToast } from "../hooks/useToast";

export default function LandingPage() {
    const { toasts, toast, removeToast } = useToast();
    const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });

    const scrollToSection = (id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleContactSubmit = (e) => {
        e.preventDefault();
        toast.success('Thank you for your message! We will get back to you soon.');
        setContactForm({ name: '', email: '', message: '' });
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <ToastContainer toasts={toasts} removeToast={removeToast} />
            {/* Hero Section */}
            <section className="pt-20 pb-20 bg-gray-100">
                <div className="container mx-auto px-6">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="inline-block mb-4 px-4 py-2 bg-white rounded-full shadow-sm">
                            <span className="text-sm font-semibold bg-gradient-to-r from-yellow-600 to-blue-500 bg-clip-text text-transparent">
                                AI-Powered Study Assistance Platform
                            </span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
                            Study Smarter with
                            <span className="block bg-gradient-to-r from-yellow-600 to-blue-500 bg-clip-text text-transparent">
                                Artificial Intelligence
                            </span>
                        </h1>
                        <p className="text-xl text-gray-600 mb-10 leading-relaxed">
                            Transform your study materials into powerful learning tools with AI-powered summaries, 
                            interactive quizzes, collaborative study sessions, and your own personal pet companion
                            to help you deal with stress. Join thousands of students 
                            achieving academic excellence.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <button
                                onClick={() => window.location.href = '/signup'}
                                className="bg-gradient-to-r from-yellow-500 to-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 hover:scale-105"
                            >
                                Start Learning
                            </button>
                            <button
                                onClick={() => scrollToSection('features')}
                                className="bg-white border-2 border-gray-900 text-gray-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-900 hover:text-white transition-all transform hover:-translate-y-1"
                            >
                                Explore Features
                            </button>
                        </div>

                        <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-yellow-600">0</div>
                                <div className="text-sm text-gray-600 mt-1">Active Students</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-blue-600">0</div>
                                <div className="text-sm text-gray-600 mt-1">Notes Generated</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-black-600">0%</div>
                                <div className="text-sm text-gray-600 mt-1">Success Rate</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 bg-white">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                            Everything You Need to Excel
                        </h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            Comprehensive tools designed to enhance your learning experience and boost your academic performance
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                        <div className="group p-4 md:p-8 rounded-xl md:rounded-2xl bg-gradient-to-br from-yellow-100 to-blue-100 hover:shadow-xl transition-all transform hover:-translate-y-2">
                            <div className="w-10 h-10 md:w-14 md:h-14 bg-yellow-600 rounded-lg md:rounded-xl flex items-center justify-center mb-3 md:mb-6 group-hover:scale-110 transition-transform">
                                <Trophy className="w-5 h-5 md:w-7 md:h-7 text-white" />
                            </div>
                            <h3 className="text-sm md:text-xl font-bold mb-2 md:mb-3 text-gray-900">Smart Quizzes</h3>
                            <p className="text-xs md:text-base text-gray-600 leading-relaxed">
                                AI-generated quizzes that adapt to your learning pace. Practice with multiple-choice,
                                true/false, and matching questions tailored to your study materials.
                            </p>
                        </div>

                        <div className="group p-4 md:p-8 rounded-xl md:rounded-2xl bg-gradient-to-br from-blue-100 to-yellow-100 hover:shadow-xl transition-all transform hover:-translate-y-2">
                            <div className="w-10 h-10 md:w-14 md:h-14 bg-blue-600 rounded-lg md:rounded-xl flex items-center justify-center mb-3 md:mb-6 group-hover:scale-110 transition-transform">
                                <Brain className="w-5 h-5 md:w-7 md:h-7 text-white" />
                            </div>
                            <h3 className="text-sm md:text-xl font-bold mb-2 md:mb-3 text-gray-900">AI Summarization</h3>
                            <p className="text-xs md:text-base text-gray-600 leading-relaxed">
                                Upload PDFs and presentations to get instant, comprehensive summaries.
                                Extract key concepts and save hours of study time.
                            </p>
                        </div>

                        <div className="group p-4 md:p-8 rounded-xl md:rounded-2xl bg-gradient-to-br from-yellow-100 to-blue-100 hover:shadow-xl transition-all transform hover:-translate-y-2">
                            <div className="w-10 h-10 md:w-14 md:h-14 bg-pink-600 rounded-lg md:rounded-xl flex items-center justify-center mb-3 md:mb-6 group-hover:scale-110 transition-transform">
                                <MessageCircle className="w-5 h-5 md:w-7 md:h-7 text-white" />
                            </div>
                            <h3 className="text-sm md:text-xl font-bold mb-2 md:mb-3 text-gray-900">Study Buddy AI</h3>
                            <p className="text-xs md:text-base text-gray-600 leading-relaxed">
                                24/7 AI assistant ready to answer questions, explain complex topics,
                                and provide personalized learning support whenever you need it.
                            </p>
                        </div>

                        <div className="group p-4 md:p-8 rounded-xl md:rounded-2xl bg-gradient-to-br from-blue-100 to-yellow-100 hover:shadow-xl transition-all transform hover:-translate-y-2">
                            <div className="w-10 h-10 md:w-14 md:h-14 bg-green-600 rounded-lg md:rounded-xl flex items-center justify-center mb-3 md:mb-6 group-hover:scale-110 transition-transform">
                                <Users className="w-5 h-5 md:w-7 md:h-7 text-white" />
                            </div>
                            <h3 className="text-sm md:text-xl font-bold mb-2 md:mb-3 text-gray-900">Group Learning</h3>
                            <p className="text-xs md:text-base text-gray-600 leading-relaxed">
                                Collaborate with peers in real-time study sessions. Share notes,
                                compete in quiz battles, and learn together effectively.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Study Tools Section */}
            <section id="tools" className="py-20 bg-gray-100">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                            Complete Study Toolkit
                        </h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            Access a full suite of integrated tools designed to streamline your entire study workflow
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 max-w-6xl mx-auto">
                        <div className="bg-white p-3 md:p-6 rounded-lg md:rounded-xl shadow-sm hover:shadow-lg transition-all border border-gray-200">
                            <div className="flex items-start space-x-2 md:space-x-4">
                                <div className="w-8 h-8 md:w-12 md:h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <FileText className="w-4 h-4 md:w-6 md:h-6 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-1 md:mb-2 text-xs md:text-base">Smart Notes</h3>
                                    <p className="text-xs md:text-sm text-gray-600">Create, organize, and share notes with rich text formatting and AI assistance</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-3 md:p-6 rounded-lg md:rounded-xl shadow-sm hover:shadow-lg transition-all border border-gray-200">
                            <div className="flex items-start space-x-2 md:space-x-4">
                                <div className="w-8 h-8 md:w-12 md:h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Trophy className="w-4 h-4 md:w-6 md:h-6 text-purple-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-1 md:mb-2 text-xs md:text-base">Quiz Builder</h3>
                                    <p className="text-xs md:text-sm text-gray-600">Create custom quizzes or generate them automatically from your study materials</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-3 md:p-6 rounded-lg md:rounded-xl shadow-sm hover:shadow-lg transition-all border border-gray-200">
                            <div className="flex items-start space-x-2 md:space-x-4">
                                <div className="w-8 h-8 md:w-12 md:h-12 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Calendar className="w-4 h-4 md:w-6 md:h-6 text-pink-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-1 md:mb-2 text-xs md:text-base">Study Planner</h3>
                                    <p className="text-xs md:text-sm text-gray-600">Plan your study schedule with smart reminders and deadline tracking</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-3 md:p-6 rounded-lg md:rounded-xl shadow-sm hover:shadow-lg transition-all border border-gray-200">
                            <div className="flex items-start space-x-2 md:space-x-4">
                                <div className="w-8 h-8 md:w-12 md:h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Video className="w-4 h-4 md:w-6 md:h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-1 md:mb-2 text-xs md:text-base">Video Sessions</h3>
                                    <p className="text-xs md:text-sm text-gray-600">Host or join live study sessions with integrated Zoom functionality</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-3 md:p-6 rounded-lg md:rounded-xl shadow-sm hover:shadow-lg transition-all border border-gray-200">
                            <div className="flex items-start space-x-2 md:space-x-4">
                                <div className="w-8 h-8 md:w-12 md:h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <MessageCircle className="w-4 h-4 md:w-6 md:h-6 text-green-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-1 md:mb-2 text-xs md:text-base">AI Chatbot</h3>
                                    <p className="text-xs md:text-sm text-gray-600">Get instant answers and explanations from your personal AI study assistant</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-3 md:p-6 rounded-lg md:rounded-xl shadow-sm hover:shadow-lg transition-all border border-gray-200">
                            <div className="flex items-start space-x-2 md:space-x-4">
                                <div className="w-8 h-8 md:w-12 md:h-12 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <BookOpen className="w-4 h-4 md:w-6 md:h-6 text-yellow-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-1 md:mb-2 text-xs md:text-base">Resource Library</h3>
                                    <p className="text-xs md:text-sm text-gray-600">Access and organize all your study materials in one centralized location</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Developers Section */}
            <section id="developers" className="py-20 bg-white">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                            Meet the Team
                        </h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            Passionate developers dedicated to revolutionizing education through technology
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 max-w-6xl mx-auto">
                        {[
                            { name: 'Bunyi, Denise Arielle', role: 'Developer', image: '' },
                            { name: 'Sangco, Nimrod', role: 'Developer', image: '' },
                            { name: 'Taloyo, Denniel Gerald', role: 'Developer', image: '/Taloyo_Pic.png' },
                            { name: 'Viaña, Vince Carl', role: 'Developer', image: '' },
                        ].map((dev, index) => (
                            <div key={index} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl md:rounded-2xl p-4 md:p-6 text-center hover:shadow-xl transition-all transform hover:-translate-y-2">
                                <div className="text-4xl md:text-6xl mb-2 md:mb-4">{dev.image}</div>
                                <h3 className="text-sm md:text-xl font-bold text-gray-900 mb-1">{dev.name}</h3>
                                <p className="text-xs md:text-base text-gray-600 mb-3 md:mb-4">{dev.role}</p>
                                <div className="flex justify-center space-x-2 md:space-x-3">
                                    <button className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-lg flex items-center justify-center hover:bg-gray-900 hover:text-white transition-all shadow-sm hover:shadow-md group">
                                        <Github className="w-4 h-4 md:w-5 md:h-5 text-gray-700 group-hover:text-white transition-colors" />
                                    </button>
                                    <button className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-lg flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm hover:shadow-md group">
                                        <Linkedin className="w-4 h-4 md:w-5 md:h-5 text-gray-700 group-hover:text-white transition-colors" />
                                    </button>
                                    <button className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm hover:shadow-md group">
                                        <Mail className="w-4 h-4 md:w-5 md:h-5 text-gray-700 group-hover:text-white transition-colors" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}