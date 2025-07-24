import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { useChatWebSocket } from '../hooks/useChatWebSocket';

interface Message {
  id: string;
  message: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  isComplete: boolean;
}

const ChatPage: React.FC = () => {
  const { accessToken } = useAuth();
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const { sendMessage, isConnected, isConnecting, error } = useChatWebSocket({
    enabled: !!accessToken,
    onMessage: handleNewMessage,
  });

  function handleNewMessage(messageData: any) {
    const message: Message = {
      id: `${messageData.sender}-${Date.now()}-${Math.random()}`,
      message: messageData.message,
      sender: messageData.sender,
      timestamp: new Date(messageData.timestamp),
      isComplete: messageData.is_complete,
    };

    setMessages(prev => {
      // If this is a partial assistant message, replace the last assistant message
      if (messageData.sender === 'assistant' && !messageData.is_complete) {
        const lastIndex = prev.length - 1;
        if (lastIndex >= 0 && prev[lastIndex].sender === 'assistant' && !prev[lastIndex].isComplete) {
          // Replace the last incomplete assistant message
          return [...prev.slice(0, lastIndex), message];
        }
      }
      
      // If this is completing an assistant message, mark it as complete
      if (messageData.sender === 'assistant' && messageData.is_complete) {
        const lastIndex = prev.length - 1;
        if (lastIndex >= 0 && prev[lastIndex].sender === 'assistant' && !prev[lastIndex].isComplete) {
          // Replace the last incomplete assistant message with the complete one
          return [...prev.slice(0, lastIndex), message];
        }
      }
      
      // Otherwise, add as new message
      return [...prev, message];
    });
  }

  const handleSendMessage = () => {
    if (!inputMessage.trim() || !isConnected) return;
    
    const message = inputMessage.trim();
    setInputMessage('');
    
    sendMessage(message);
    
    // Focus back to input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on load
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  if (!accessToken) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 dark:text-gray-400">Please log in to access chat</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-screen">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Chat Assistant</h1>
          <div className="flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnecting
                  ? 'bg-yellow-500 animate-pulse'
                  : isConnected
                  ? 'bg-green-500'
                  : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        
        {error && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg flex items-center space-x-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="text-sm text-red-800 dark:text-red-200">{error}</span>
          </div>
        )}
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Start a conversation
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Ask me anything and I'll respond with some thoughtful lorem ipsum!
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  message.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}
              >
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.message}
                  {message.sender === 'assistant' && !message.isComplete && (
                    <span className="inline-block w-2 h-5 bg-current ml-1 animate-pulse" />
                  )}
                </div>
                <div
                  className={`text-xs mt-2 ${
                    message.sender === 'user'
                      ? 'text-blue-100'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isConnected
                  ? "Type your message and press Enter to send..."
                  : "Please wait for connection..."
              }
              disabled={!isConnected}
              rows={1}
              className="w-full resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400"
              style={{
                minHeight: '48px',
                maxHeight: '120px',
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = '48px';
                target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
              }}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || !isConnected}
            className="flex-shrink-0 inline-flex items-center justify-center w-12 h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors duration-200"
          >
            <PaperAirplaneIcon className="w-5 h-5 text-white" />
          </button>
        </div>
        
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
};

export default ChatPage; 