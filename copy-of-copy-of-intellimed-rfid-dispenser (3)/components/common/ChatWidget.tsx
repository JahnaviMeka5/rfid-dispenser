import React, { useState, useContext, useRef, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import { Patient, ChatMessage } from '../../types';
import { generateHealthChatMessageStream } from '../../services/geminiService';

const ChatWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [streamingResponse, setStreamingResponse] = useState<string>('');
    
    const context = useContext(AppContext);
    const patient = context?.currentUser as Patient;
    const { addChatMessage } = context!;
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [patient?.chatHistory, isOpen, streamingResponse]);

    if (!patient) return null;

    const handleSendMessage = async () => {
        if (!userInput.trim() || isLoading) return;
        const newUserMessage = userInput;

        addChatMessage(patient.id, { sender: 'user', text: newUserMessage });
        setUserInput('');
        setIsLoading(true);
        setStreamingResponse('');
        
        const history = patient.chatHistory.map(msg => ({
            role: msg.sender,
            parts: [{ text: msg.text }]
        }));

        let accumulatedResponse = '';
        try {
            const stream = await generateHealthChatMessageStream(history, newUserMessage);
             for await (const chunk of stream) {
                accumulatedResponse += chunk.text;
                setStreamingResponse(accumulatedResponse);
            }
            addChatMessage(patient.id, { sender: 'model', text: accumulatedResponse });
        } catch (error) {
            console.error("Health chat failed:", error);
            const errorMsg = "I'm sorry, I'm having trouble responding right now.";
            addChatMessage(patient.id, { sender: 'model', text: errorMsg });
        } finally {
            setIsLoading(false);
            setStreamingResponse('');
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 bg-cyan-600 text-white w-16 h-16 rounded-full shadow-lg flex items-center justify-center hover:bg-cyan-700 transition-transform transform hover:scale-110 z-50"
                aria-label="Open AI Health Coach"
            >
                <span className="material-icons text-3xl">smart_toy</span>
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 w-full max-w-sm h-[70vh] bg-gray-800 rounded-xl shadow-2xl flex flex-col z-50 animate-fade-in-up">
            <header className="bg-gray-900 p-4 flex justify-between items-center rounded-t-xl">
                <h3 className="font-bold text-lg text-cyan-400">AI Health Coach</h3>
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
                    <span className="material-icons">close</span>
                </button>
            </header>
            <div className="flex-grow p-4 overflow-y-auto flex flex-col space-y-4">
                 {patient.chatHistory.map((msg: ChatMessage) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs p-3 rounded-lg ${msg.sender === 'user' ? 'bg-cyan-600 text-white' : 'bg-gray-600 text-white'}`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                        </div>
                    </div>
                ))}
                 {streamingResponse && (
                    <div className="flex justify-start">
                        <div className="max-w-xs p-3 rounded-lg bg-gray-600 text-white">
                            <p className="text-sm whitespace-pre-wrap">{streamingResponse}</p>
                        </div>
                    </div>
                 )}
                 {isLoading && !streamingResponse && (
                    <div className="flex justify-start">
                        <div className="max-w-xs p-3 rounded-lg bg-gray-600 text-white">
                            <p className="text-sm animate-pulse">Thinking...</p>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>
            <div className="p-4 border-t border-gray-700">
                <div className="flex gap-2">
                     <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
                        placeholder="Ask a question..."
                        className="flex-grow bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        disabled={isLoading}
                    />
                    <button onClick={handleSendMessage} disabled={isLoading} className="bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-cyan-700 disabled:bg-gray-500">Send</button>
                </div>
            </div>
            <style>{`
                .animate-fade-in-up {
                animation: fadeInUp 0.3s ease-out forwards;
                }
                @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
                }
            `}</style>
        </div>
    );
};

export default ChatWidget;