import React, { useState, useContext, useRef, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import { analyzeMealImage, generateHealthChatMessageStream } from '../../services/geminiService';
import { Patient, HealthLogType, ChatMessage } from '../../types';

const HealthCoach: React.FC = () => {
    const context = useContext(AppContext);
    const patient = context?.currentUser as Patient;
    const { addHealthLog, addChatMessage } = context!;

    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [mealAnalysis, setMealAnalysis] = useState<string | null>(null);
    const [streamingResponse, setStreamingResponse] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [patient.chatHistory, streamingResponse]);

    const handleSendMessage = async () => {
        if (!userInput.trim() || isLoading) return;
        const newUserMessage = userInput;
        
        addChatMessage(patient.id, { sender: 'user', text: newUserMessage });
        addHealthLog(patient.id, { type: HealthLogType.AICoachQuery, description: `Asked AI Coach: "${newUserMessage}"` });
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

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
            setMealAnalysis(null);
        }
    };

    const handleAnalyzeMeal = async () => {
        if (!imageFile) return;
        setIsLoading(true);
        setMealAnalysis(null);
        const reader = new FileReader();
        reader.readAsDataURL(imageFile);
        reader.onloadend = async () => {
            const base64String = (reader.result as string).split(',')[1];
            const analysis = await analyzeMealImage(base64String);
            setMealAnalysis(analysis);
            addHealthLog(patient.id, { type: HealthLogType.MealAnalyzed, description: `Analyzed a meal.` });
            setIsLoading(false);
        };
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Chatbot */}
            <div className="bg-gray-700/50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-cyan-300 mb-4">Chat with your AI Health Coach</h3>
                <div className="h-96 bg-gray-800 rounded-lg p-4 overflow-y-auto flex flex-col space-y-4 mb-4">
                    {patient.chatHistory.map((msg: ChatMessage) => (
                        <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs md:max-w-md p-3 rounded-lg ${msg.sender === 'user' ? 'bg-cyan-600 text-white' : 'bg-gray-600 text-white'}`}>
                                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    {streamingResponse && (
                         <div className="flex justify-start">
                            <div className="max-w-xs md:max-w-md p-3 rounded-lg bg-gray-600 text-white">
                                <p className="text-sm whitespace-pre-wrap">{streamingResponse}</p>
                            </div>
                        </div>
                    )}
                    {isLoading && !streamingResponse && (
                        <div className="flex justify-start">
                            <div className="max-w-xs md:max-w-md p-3 rounded-lg bg-gray-600 text-white">
                                <p className="text-sm animate-pulse">Thinking...</p>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
                        placeholder="Ask a health question..."
                        className="flex-grow bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        disabled={isLoading}
                    />
                    <button onClick={handleSendMessage} disabled={isLoading} className="bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-cyan-700 disabled:bg-gray-500">Send</button>
                </div>
            </div>

            {/* Meal Analyzer */}
            <div className="bg-gray-700/50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-cyan-300 mb-4">Analyze Your Meal</h3>
                <div className="flex flex-col items-center">
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 bg-teal-500 text-white font-bold rounded-lg hover:bg-teal-600 mb-4">
                        {imagePreview ? 'Change Meal Photo' : 'Upload Meal Photo'}
                    </button>
                    {imagePreview && (
                        <div className="mb-4 w-full max-w-sm">
                            <img src={imagePreview} alt="Meal preview" className="rounded-lg w-full h-auto object-cover" />
                        </div>
                    )}
                    <button onClick={handleAnalyzeMeal} disabled={isLoading || !imageFile} className="w-full py-3 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 disabled:bg-gray-500">
                        {isLoading ? 'Analyzing...' : 'Analyze Meal'}
                    </button>
                </div>
                {mealAnalysis && (
                    <div className="mt-6 bg-gray-800 p-4 rounded-lg prose prose-invert max-w-none">
                        <pre className="whitespace-pre-wrap font-sans">{mealAnalysis}</pre>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HealthCoach;