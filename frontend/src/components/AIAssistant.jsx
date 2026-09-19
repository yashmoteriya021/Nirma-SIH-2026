import { useState, useRef, useEffect } from 'react';
import { ai, isServiceDown } from '../lib/api';
import { useLang } from '../context/LanguageContext';

export default function AIAssistant({ user }) {
  const { t, lang } = useLang();
  
  // Convert backend user profile to ML profile format if possible
  const profile = user ? {
    full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
    gender: user.gender,
    category: 'SC', // Assuming SC from the domain context
    annual_family_income: user.annual_income || 300000, // Default to a reasonable value if missing
  } : {};

  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: t('home.recommender.title') ? `Welcome! ${t('home.recommender.title')}. Please describe what kind of loan you are looking for.` : "Welcome! Please describe what kind of loan you are looking for. (e.g. 'I need a loan to start a tailoring business')",
      type: 'text'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const chatContainerRef = useRef(null);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userMessage = { sender: 'user', text: inputText, type: 'text' };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setError(null);

    try {
      const intentRes = await ai.intent({
        text: userMessage.text,
        profile,
        session_id: sessionId,
        language: lang === 'hi' ? 'hi' : 'en'
      });

      if (intentRes.session_id) {
        setSessionId(intentRes.session_id);
      }

      if (intentRes.complete) {
        // Show confirmation summary
        if (intentRes.confirmation_summary) {
          setMessages(prev => [...prev, {
            sender: 'ai',
            text: intentRes.confirmation_summary + "\n\nI am now finding the best schemes for you...",
            type: 'text'
          }]);
        }
        
        // Fetch matching schemes
        const matchRes = await ai.match(profile, intentRes.intent);
        
        if (matchRes.status === 'schemes_found') {
          setMessages(prev => [...prev, {
            sender: 'ai',
            text: `I found ${matchRes.recommendations.length} eligible schemes for you!`,
            type: 'schemes',
            schemes: matchRes.recommendations
          }]);
        } else {
          setMessages(prev => [...prev, {
            sender: 'ai',
            text: matchRes.message || "I couldn't find any perfectly matching schemes, but here is what you can do.",
            type: 'no-match',
            nearest_misses: matchRes.nearest_misses
          }]);
        }
      } else {
        // Follow up question needed
        setMessages(prev => [...prev, {
          sender: 'ai',
          text: intentRes.follow_up_question || "Could you provide more details?",
          type: 'text'
        }]);
      }
    } catch (err) {
      console.error(err);
      if (isServiceDown(err)) {
        setError("The AI service is currently unavailable. Please ensure the backend is running.");
      } else {
        setError(err.message || "Something went wrong communicating with the AI.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md border border-navy-200 flex flex-col h-[600px] w-full max-w-3xl mx-auto overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-navy-200 bg-navy-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-accent-gold/20 p-2 rounded-lg">
            <svg className="w-6 h-6 text-accent-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold">AI Scheme Assistant</h2>
            <p className="text-xs text-navy-200">Official Government Scheme Finder</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <span className="w-2 h-2 rounded-full bg-green-500"></span>
           <span className="text-xs text-navy-200 font-medium">Online</span>
        </div>
      </div>

      {/* Chat Area */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-offwhite-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
              msg.sender === 'user' 
                ? 'bg-navy-800 text-white rounded-tr-sm' 
                : 'bg-white text-navy-900 border border-navy-200 rounded-tl-sm'
            }`}>
              {msg.type === 'text' && (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
              )}
              
              {msg.type === 'schemes' && (
                <div className="space-y-4">
                  <p className="text-sm mb-4 font-medium">{msg.text}</p>
                  <div className="space-y-4">
                    {msg.schemes?.map((rec, i) => (
                      <div key={i} className="bg-offwhite-50 rounded-xl border border-navy-200 p-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-accent-gold text-navy-900 text-xs font-bold px-3 py-1.5 rounded-bl-xl">
                          Match #{rec.rank}
                        </div>
                        <h4 className="font-bold text-navy-900 text-base mb-1 pr-16">{rec.scheme_name}</h4>
                        <p className="text-xs text-navy-600 mb-4 font-medium">{rec.corporation}</p>
                        
                        {rec.explanation?.advantages?.length > 0 && (
                          <div className="mb-4 bg-white p-3 rounded-lg border border-navy-100">
                            <p className="text-xs font-bold text-navy-900 mb-2 uppercase tracking-wide">Why it fits you:</p>
                            <ul className="list-disc list-inside text-xs text-navy-700 space-y-1.5">
                              {rec.explanation.advantages.map((adv, j) => (
                                <li key={j}>{adv}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <a 
                          href={`/schemes/${rec.scheme_id}`} 
                          className="inline-flex items-center gap-1 mt-2 text-sm text-navy-900 font-bold hover:text-accent-gold transition-colors"
                        >
                          View Scheme Details
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {msg.type === 'no-match' && (
                <div className="space-y-4">
                  <p className="text-sm mb-4 font-medium text-navy-900">{msg.text}</p>
                  {msg.nearest_misses?.map((miss, i) => (
                    <div key={i} className="bg-red-50 rounded-xl border border-red-100 p-5">
                      <h4 className="font-bold text-navy-900 mb-3">{miss.scheme_name}</h4>
                      <div className="space-y-2">
                        {miss.suggestions?.map((sugg, j) => (
                          <p key={j} className="text-xs text-red-700 flex gap-2 items-start">
                            <span className="font-bold mt-0.5">•</span> 
                            <span>{sugg}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-navy-200 shadow-sm rounded-2xl rounded-tl-sm p-4 flex gap-2 items-center">
               <span className="text-sm text-navy-600 font-medium tracking-widest">Working...</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 text-red-700 text-sm font-medium text-center border-t border-red-200">
          {error}
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-navy-200">
        <form onSubmit={handleSubmit} className="flex gap-3 relative">
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Type your message here..."
            className="flex-1 px-5 py-3.5 bg-offwhite-50 border border-navy-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-900 focus:border-transparent transition-shadow text-navy-900 placeholder:text-navy-400 font-medium"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="bg-navy-900 text-white px-6 py-3.5 rounded-xl hover:bg-navy-800 disabled:opacity-50 disabled:hover:bg-navy-900 transition-colors font-bold text-sm flex items-center justify-center min-w-[100px] shadow-sm"
          >
            {isLoading ? 'Wait...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}
