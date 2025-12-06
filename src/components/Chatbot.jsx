import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Send, MessageCircle, Bot, User, Copy, AlertCircle, Sparkles } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config/api.config';
import { chatApi, aiUsageApi } from '../api/api';

const buildIntroMessage = (note) => {
  const noteContent = note?.content || '';
  const wordCount = noteContent.trim().split(/\s+/).filter(w => w.length > 0).length;
  
  if (!noteContent || wordCount < 30) {
    return {
      id: `intro-${note?.note_id || note?.id || 'default'}`,
      type: 'bot',
      content: `⚠️ This note "${note?.title || 'Untitled Note'}" doesn't have enough content for me to assist with. Please add at least 30 words to your note before using the AI assistant.`,
      timestamp: new Date().toISOString()
    };
  }
  
  return {
    id: `intro-${note?.note_id || note?.id || 'default'}`,
    type: 'bot',
    content: `Hi! I'm here to help you with your note "${note?.title || 'Untitled Note'}". I can answer questions, explain concepts, create summaries, and help you study this specific note. What would you like to know?`,
    timestamp: new Date().toISOString()
  };
};

const Chatbot = ({ currentNote, onBack }) => {
  const [messages, setMessages] = useState([buildIntroMessage(currentNote)]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);
  const [tokenUsage, setTokenUsage] = useState({ limit: 5000, remaining: 5000, used: 0 });
  const [isTokenUsageLoading, setIsTokenUsageLoading] = useState(true);
  const [deepThinkingMode, setDeepThinkingMode] = useState(false);
  const [userPhoto, setUserPhoto] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // Check if note has sufficient content
  const noteContent = currentNote?.content || '';
  const wordCount = noteContent.trim().split(/\s+/).filter(w => w.length > 0).length;
  const hasValidContent = noteContent.trim().length > 0 && wordCount >= 30;

  const normalizeId = (value) => {
    if (value === undefined || value === null) return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const loadChatHistory = useCallback(async () => {
    if (!currentNote) {
      setMessages([buildIntroMessage()]);
      setIsHistoryLoading(false);
      return;
    }

    const noteIdentifier = normalizeId(currentNote.id || currentNote.note_id);
    if (!noteIdentifier) {
      setMessages([buildIntroMessage(currentNote)]);
      setIsHistoryLoading(false);
      return;
    }

    setIsHistoryLoading(true);
    setHistoryError(null);
    setMessages([buildIntroMessage(currentNote)]);

    try {
      const { data } = await chatApi.getHistory(noteIdentifier);
      const historyEntries = data?.history || [];

      if (!historyEntries.length) {
        setMessages([buildIntroMessage(currentNote)]);
        setIsHistoryLoading(false);
        return;
      }

      const flattened = historyEntries.flatMap((entry) => {
        const timestamp = entry.timestamp || new Date().toISOString();
        return [
          {
            id: `chat-${entry.chat_id}-user`,
            type: 'user',
            content: entry.message,
            timestamp
          },
          {
            id: `chat-${entry.chat_id}-bot`,
            type: 'bot',
            content: entry.response,
            timestamp
          }
        ];
      });

      setMessages(flattened);
    } catch (error) {
      console.error('❌ [Chatbot] Failed to load chat history:', error);
      setHistoryError('Unable to load previous conversation. Starting fresh.');
      setMessages([buildIntroMessage(currentNote)]);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [currentNote]);

  useEffect(() => {
    loadChatHistory();
    // load user profile picture for avatar
    (async () => {
      try {
        const res = await axios.get(`${API_URL}/api/user/profile`, { withCredentials: true });
        const pic = res.data?.profile_picture || null;
        if (pic) {
          if (pic.startsWith('http') || pic.startsWith('/')) {
            setUserPhoto(pic);
          } else {
            setUserPhoto(`${API_URL}${pic}`);
          }
        } else {
          setUserPhoto(null);
        }
      } catch (err) {
        console.warn('Failed to fetch user profile for chatbot avatar:', err);
      }
    })();
  }, [loadChatHistory]);

  const fetchTokenUsage = useCallback(async () => {
    try {
      const { data } = await aiUsageApi.getToday();
      const limit = data?.limits?.chatbotTokens ?? 5000;
      const remaining = data?.remaining?.chatbotTokens ?? limit;
      setTokenUsage({
        limit,
        remaining,
        used: Math.max(limit - remaining, 0)
      });
    } catch (error) {
      console.error('❌ [Chatbot] Failed to fetch AI usage snapshot:', error);
    } finally {
      setIsTokenUsageLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokenUsage();
  }, [fetchTokenUsage]);

  const tokenLimitReached = !isTokenUsageLoading && tokenUsage.remaining <= 0;
  
  // Only scroll to bottom when user sends message or receives response
  useEffect(() => {
    if (messages.length > 1) { // Skip initial intro message scroll
      const lastMessage = messages[messages.length - 1];
      const isRecentMessage = Date.now() - new Date(lastMessage.timestamp).getTime() < 1000;
      if (isRecentMessage) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages]);
  
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !currentNote) return;

    const noteIdentifier = normalizeId(currentNote.id || currentNote.note_id);
    if (!noteIdentifier) return;
    
    if (!hasValidContent) {
      setHistoryError('This note doesn\'t have enough content. Please add at least 30 words to your note.');
      return;
    }

    if (tokenLimitReached) {
      setHistoryError('AI chatbot token limit reached. Try again tomorrow.');
      return;
    }

    const userMessage = {
      id: Date.now() + Math.random(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);
    await callOpenAIAPI(userMessage.content, noteIdentifier);
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  async function callOpenAIAPI(userQuestion, noteIdentifier) {
    try {
      const systemPrompt = deepThinkingMode
        ? `You are an AI study assistant helping with this note. You can use external knowledge to provide comprehensive answers ABOUT THE TOPICS IN THIS NOTE.

Note Title: "${currentNote?.title || 'Untitled Note'}"
Note Content:
"""
${currentNote?.content || ''}
"""

You are in DEEP THINKING mode:
1. Answer questions about the topics and concepts mentioned in the note content
2. You may supplement with external knowledge BUT ONLY about topics that are already in the note
3. Provide detailed explanations with additional context from broader knowledge about the note's topics
4. Help connect note concepts to real-world applications of those specific topics
5. Suggest additional resources or related information ONLY for topics mentioned in the note
6. IMPORTANT: Stay focused on the subject matter in the note - do not discuss unrelated topics
7. If asked about something not in the note, redirect: "I can only help with topics related to your note about '${currentNote?.title}'. Please ask about the content or concepts mentioned in your note."`
        : `You are an AI study assistant that ONLY answers questions about this specific note. 

Note Title: "${currentNote?.title || 'Untitled Note'}"
Note Content:
"""
${currentNote?.content || ''}
"""

IMPORTANT RULES:
1. Only answer questions related to the content above
2. If the user asks about topics not in the note, politely redirect them: "I can only help with questions about your note '${currentNote?.title}'. Please ask something related to the content above."
3. Do not provide information from external sources or general knowledge
4. Stay focused on explaining, summarizing, or clarifying concepts FROM THE NOTE ONLY
5. If the note content is insufficient to answer, say so clearly
6. Help with studying, understanding, and memorizing the note content`;

      const conversation = [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userQuestion
        }
      ];

      const response = await axios.post(
        `${API_URL}/api/openai/chat`,
        {
          messages: conversation,
          noteId: noteIdentifier,
          userMessage: userQuestion
        },
        { withCredentials: true }
      );

      const limitsFromResponse = response.data?.limits || response.data?.usage?.limits;
      const remainingTokensFromResponse = response.data?.remainingTokens ?? response.data?.usage?.remaining?.chatbotTokens;
      if (remainingTokensFromResponse !== undefined || limitsFromResponse?.chatbotTokens) {
        setTokenUsage((prev) => {
          const limit = limitsFromResponse?.chatbotTokens ?? prev.limit;
          const remaining = remainingTokensFromResponse !== undefined
            ? Math.max(remainingTokensFromResponse, 0)
            : Math.max(prev.remaining, 0);
          return {
            limit,
            remaining,
            used: Math.max(limit - remaining, 0)
          };
        });
      } else {
        fetchTokenUsage();
      }

      const botReply = response.data?.reply || "Sorry, I couldn't generate a response.";
      const chatRecord = response.data?.chat;
      const botMessage = {
        id: chatRecord?.chat_id ? `chat-${chatRecord.chat_id}-bot` : Date.now() + Math.random(),
        type: 'bot',
        content: botReply,
        timestamp: chatRecord?.timestamp || new Date().toISOString()
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("❌ [Chatbot] Error calling OpenAI API:", error);
      let handledError = false;
      if (error.response) {
        console.error("❌ [Chatbot] Response status:", error.response.status);
        console.error("❌ [Chatbot] Response data:", error.response.data);

        if (error.response.status === 422) {
          handledError = true;
          const moderationMessage = error.response.data?.error || 'Your message was blocked by our safety filters. Please rephrase and try again.';
          setHistoryError(moderationMessage);
          const moderationReply = {
            id: Date.now() + Math.random(),
            type: 'bot',
            content: moderationMessage,
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, moderationReply]);
        } else if (error.response.status === 429) {
          handledError = true;
          setTokenUsage((prev) => ({ ...prev, remaining: 0, used: prev.limit }));
          const quotaMessage = error.response.data?.error || 'Daily AI chatbot token limit reached. Try again tomorrow.';
          setHistoryError(quotaMessage);
          const quotaReply = {
            id: Date.now() + Math.random(),
            type: 'bot',
            content: quotaMessage,
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, quotaReply]);
        }
      }

      if (!handledError) {
        const errorMessage = {
          id: Date.now() + Math.random(),
          type: 'bot',
          content: "Oops! Something went wrong while contacting the AI service.",
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsTyping(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col overflow-hidden">
      {/* Chat Header */}
      <div className="bg-black border-b border-slate-800 p-3 sm:p-4 shadow-md flex-shrink-0 relative z-10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <button
              onClick={onBack}
              className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all flex-shrink-0 active:scale-95 touch-manipulation"
              title="Back to Notes"
              aria-label="Back to Notes"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-black">
              <img src="/StudAI_Logo-white.svg" alt="StudAI" className="w-6 h-6 sm:w-7 sm:h-7 object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-white text-sm sm:text-base truncate">StudAI Bot</h3>
              <p className="text-xs sm:text-sm text-slate-300 truncate">
                {currentNote?.title || 'Untitled Note'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Token Usage Banner */}
      <div className="bg-slate-50 border-b border-slate-200 px-3 sm:px-4 py-2 text-xs sm:text-sm flex-shrink-0 relative z-10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Bot className={`w-4 h-4 flex-shrink-0 ${tokenLimitReached ? 'text-red-500' : 'text-purple-500'}`} />
            <span className="text-slate-700 truncate">
              Tokens: <span className="font-semibold">{tokenUsage.used}/{tokenUsage.limit}</span>
            </span>
          </div>
          <span className={`font-semibold flex-shrink-0 ${tokenLimitReached ? 'text-red-600' : 'text-green-600'}`}>
            {tokenLimitReached ? 'Limit reached' : `${tokenUsage.remaining} left`}
          </span>
        </div>
      </div>

      {/* Content Warning (if note too short) */}
      {!hasValidContent && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-3 sm:px-4 py-3 flex-shrink-0 relative z-10">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-yellow-800">Content Too Short</p>
              <p className="text-xs text-yellow-700 mt-1">
                This note needs at least 30 words before the AI assistant can help. Please add more content to your note.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 min-h-0 relative">
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
          <div className="text-slate-200 font-bold text-6xl sm:text-7xl md:text-8xl lg:text-9xl opacity-5 transform rotate-[-30deg]">
            StudAI
          </div>
        </div>
        
        </div>
        
        {historyError && (
          <div className="text-xs sm:text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-lg shadow-sm relative z-10">
            {historyError}
          </div>
        )}
        {isHistoryLoading && (
          <div className="text-xs sm:text-sm text-slate-500 bg-slate-50 border border-slate-200 p-3 rounded-lg shadow-sm relative z-10">
            Loading your previous conversation...
          </div>
        )}
        {messages.map((message, index) => (
          <div
            key={message.id || index}
            className={`flex gap-2 sm:gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn relative z-10`}
          >
            {message.type === 'bot' && (
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-md bg-black self-start">
                <img src="/StudAI_Logo-white.svg" alt="StudAI" className="w-3 h-3 sm:w-4 sm:h-4 object-contain" />
              </div>
            )}
            
            <div className={`group max-w-[85%] sm:max-w-lg md:max-w-xl ${message.type === 'user' ? 'order-2' : ''}`}>
              <div
                className={`p-3 sm:p-4 rounded-2xl shadow-md transition-shadow hover:shadow-lg ${
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
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(message.content);
                      // Optional: Add toast notification for copy feedback
                    }}
                    className="p-1 text-slate-400 hover:text-blue-600 rounded transition-all opacity-0 group-hover:opacity-100 active:scale-95 touch-manipulation sm:opacity-100 sm:hover:bg-slate-100"
                    title="Copy message"
                    aria-label="Copy message"
                  >
                    <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                )}
              </div>
            </div>
            
            {message.type === 'user' && (
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full overflow-hidden order-3 shadow-md self-start">
                <img src={userPhoto || '/default-avatar.png'} alt="You" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        ))}
        
        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex gap-2 sm:gap-3 justify-start animate-fadeIn">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-md bg-black">
              <img src="/StudAI_Logo-white.svg" alt="StudAI" className="w-3 h-3 sm:w-4 sm:h-4 object-contain" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-md">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-slate-200 p-3 sm:p-4 flex-shrink-0 relative z-10 shadow-lg">
        <div className="flex gap-2 sm:gap-3 items-end max-w-4xl mx-auto">
          <div className="flex-1">
            <div className="relative">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={hasValidContent ? "Ask me anything about this note..." : "Add content to your note first..."}
                disabled={!hasValidContent || tokenLimitReached}
                className={`w-full p-3 sm:p-4 pr-20 sm:pr-24 border-2 border-slate-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none text-sm sm:text-base transition-all ${
                  (!hasValidContent || tokenLimitReached) ? 'bg-slate-50 cursor-not-allowed opacity-60' : 'bg-white'
                }`}
                rows="1"
                style={{ minHeight: '52px', maxHeight: '120px' }}
              />
              {/* Deep Thinking Toggle Button */}
              <button
                onClick={() => setDeepThinkingMode(!deepThinkingMode)}
                disabled={!hasValidContent || tokenLimitReached}
                className={`absolute right-12 sm:right-14 bottom-2 sm:bottom-3 p-2 rounded-full transition-all active:scale-95 touch-manipulation ${
                  deepThinkingMode
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl'
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                } ${
                  (!hasValidContent || tokenLimitReached) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title={deepThinkingMode ? 'Deep Thinking ON - AI can use external knowledge' : 'Deep Thinking OFF - AI limited to note only'}
                aria-label={deepThinkingMode ? 'Disable Deep Thinking' : 'Enable Deep Thinking'}
              >
                <Sparkles className={`w-4 h-4 ${deepThinkingMode ? 'animate-pulse' : ''}`} />
              </button>
              {/* Send Button */}
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isTyping || tokenLimitReached || !hasValidContent}
                className={`absolute right-2 sm:right-3 bottom-2 sm:bottom-3 p-2 rounded-full transition-all active:scale-95 touch-manipulation ${
                  inputMessage.trim() && !isTyping && !tokenLimitReached && hasValidContent
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 shadow-lg hover:shadow-xl'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-4xl mx-auto">
          {tokenLimitReached && (
            <p className="text-xs sm:text-sm text-red-600 font-semibold mt-2 px-1">
              Token limit reached. Try again tomorrow.
            </p>
          )}
          {!hasValidContent && !tokenLimitReached && (
            <p className="text-xs sm:text-sm text-yellow-600 font-semibold mt-2 px-1">
              Please add at least 30 words to your note before using the chatbot.
            </p>
          )}
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
