import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, MessageCircle, FileText, Bot, User, Copy, ThumbsUp, ThumbsDown, MoreVertical, Menu, X } from 'lucide-react';

const Chatbot = ({ currentNote, notes = [], onBack }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: `Hi! I'm here to help you with your note "${currentNote?.title || 'Untitled Note'}". What would you like to know or discuss about it?`,
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedNote, setSelectedNote] = useState(currentNote);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Default notes if none provided
  const defaultNotes = [
    {
      id: 1,
      title: 'Data Algorithms',
      words: 500,
      createdAt: new Date().toISOString(),
      content: 'Comprehensive notes on data algorithms...'
    },
    {
      id: 2,
      title: 'Machine Learning Basics',
      words: 750,
      createdAt: new Date().toISOString(),
      content: 'Introduction to machine learning concepts...'
    },
    {
      id: 3,
      title: 'React Components',
      words: 320,
      createdAt: new Date().toISOString(),
      content: 'Understanding React component patterns...'
    }
  ];

  const displayNotes = notes.length > 0 ? notes : defaultNotes;

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Close sidebar on mobile when clicking outside
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate bot response
    setTimeout(() => {
      const botResponses = [
        `Based on your note "${selectedNote?.title}", I can help you understand the key concepts better. What specific aspect would you like to explore?`,
        `I've analyzed your note content. Here are some insights and suggestions for improvement...`,
        `That's an interesting point about "${selectedNote?.title}". Let me provide some additional context and examples.`,
        `I can help you expand on this topic. Would you like me to suggest related concepts or provide more detailed explanations?`
      ];

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: botResponses[Math.floor(Math.random() * botResponses.length)],
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const switchNote = (note) => {
    setSelectedNote(note);
    setIsSidebarOpen(false); // Close sidebar on mobile after selection
    const switchMessage = {
      id: Date.now(),
      type: 'bot',
      content: `Now helping you with "${note.title}". What would you like to know about this note?`,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, switchMessage]);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex relative">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar - Notes List */}
      <div className={`
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 fixed lg:relative z-50 lg:z-auto
        w-80 sm:w-72 md:w-80 lg:w-80
        bg-white border-r border-slate-200 flex flex-col shadow-lg
        transition-transform duration-300 ease-in-out
        h-full
      `}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200 bg-black">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 text-white hover:bg-white/20 rounded-lg transition-all"
              title="Back to Notes"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 flex-1">
              <MessageCircle className="w-5 h-5 text-white" />
              <h2 className="text-white font-semibold">AI Assistant</h2>
            </div>
            {/* Close button for mobile */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-2 text-white hover:bg-white/20 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-3">
            <h3 className="text-sm font-medium text-slate-600 mb-3 px-2">Your Notes</h3>
            <div className="space-y-2">
              {displayNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => switchNote(note)}
                  className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedNote?.id === note.id
                      ? 'bg-gradient-to-r from-purple-50 to-blue-50 border-l-4 border-purple-500 shadow-md'
                      : 'hover:bg-slate-50 border border-transparent hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      selectedNote?.id === note.id 
                        ? 'bg-gradient-to-r from-purple-500 to-blue-500' 
                        : 'bg-slate-100'
                    }`}>
                      <FileText className={`w-4 h-4 ${
                        selectedNote?.id === note.id ? 'text-white' : 'text-slate-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-medium text-sm truncate ${
                        selectedNote?.id === note.id ? 'text-purple-700' : 'text-slate-800'
                      }`}>
                        {note.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        {note.words} words
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <div className="text-xs text-slate-500 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Bot className="w-3 h-3" />
              <span>AI Assistant Ready</span>
            </div>
            <p>Ask questions about your notes</p>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="bg-white border-b border-slate-200 p-3 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {/* Mobile menu button */}
              <button
                onClick={toggleSidebar}
                className="lg:hidden p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-800 text-sm sm:text-base">AI Assistant</h3>
                <p className="text-xs sm:text-sm text-slate-500 truncate">
                  Discussing: {selectedNote?.title}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <div className="hidden sm:flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Online
              </div>
              <div className="sm:hidden w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2 sm:gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.type === 'bot' && (
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
              )}
              
              <div className={`group max-w-[85%] sm:max-w-lg ${message.type === 'user' ? 'order-2' : ''}`}>
                <div
                  className={`p-3 sm:p-4 rounded-2xl shadow-sm ${
                    message.type === 'user'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white ml-auto'
                      : 'bg-white border border-slate-200'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                </div>
                
                <div className={`flex items-center gap-1 sm:gap-2 mt-1 px-2 ${
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                }`}>
                  <span className="text-xs text-slate-400">
                    {formatTime(message.timestamp)}
                  </span>
                  
                  {message.type === 'bot' && (
                    <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1 text-slate-400 hover:text-green-600 rounded transition-colors">
                        <ThumbsUp className="w-3 h-3" />
                      </button>
                      <button className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors">
                        <ThumbsDown className="w-3 h-3" />
                      </button>
                      <button className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors">
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {message.type === 'user' && (
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-slate-400 to-slate-600 rounded-full flex items-center justify-center flex-shrink-0 order-3">
                  <User className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex gap-2 sm:gap-3 justify-start">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="bg-white border-t border-slate-200 p-3 sm:p-4 safe-area-pb">
          <div className="flex gap-2 sm:gap-3 items-end">
            <div className="flex-1">
              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about your notes..."
                  className="w-full p-3 sm:p-4 pr-11 sm:pr-12 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none max-h-32 text-sm"
                  rows="1"
                  style={{ minHeight: '48px' }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isTyping}
                  className={`absolute right-2 sm:right-3 bottom-2 sm:bottom-3 p-2 rounded-full transition-all ${
                    inputMessage.trim() && !isTyping
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 shadow-lg hover:shadow-xl'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center justify-between mt-2 px-1">
            <p className="text-xs text-slate-500">
              Press Enter to send, Shift + Enter for new line
            </p>
            <p className="text-xs text-slate-400">
              {inputMessage.length}/2000
            </p>
          </div>
          {/* Mobile character counter */}
          <div className="sm:hidden flex justify-end mt-1 px-1">
            <p className="text-xs text-slate-400">
              {inputMessage.length}/2000
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;