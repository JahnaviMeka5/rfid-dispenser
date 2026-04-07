import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import { HealthLogType } from '../../types';
import { generateYogaVideo } from '../../services/geminiService';

const yogaPoses = [
    {
        name: "Mountain Pose (Tadasana)",
        description: "A foundational pose that improves posture and firms muscles. Stand tall with feet together, arms at your sides.",
        img: "https://picsum.photos/seed/mountain/400/300"
    },
    {
        name: "Downward-Facing Dog (Adho Mukha Svanasana)",
        description: "An energizing stretch for the whole body. Form an inverted V-shape with your body.",
        img: "https://picsum.photos/seed/dog/400/300"
    },
    {
        name: "Warrior II (Virabhadrasana II)",
        description: "Builds strength and stamina in the legs and ankles. Stand with legs wide apart, one foot turned out.",
        img: "https://picsum.photos/seed/warrior/400/300"
    },
];

const healthFacts = [
    "Drinking enough water can improve your energy levels and brain function.",
    "A 20-minute walk each day can significantly reduce the risk of several chronic diseases.",
    "Quality sleep is just as important as a healthy diet and regular exercise.",
    "Laughing is good for the heart and can increase blood flow by 20 percent."
];

// FIX: Removed declare global block to avoid conflicting with existing global type definitions.

const YogaAndFitness: React.FC = () => {
    const context = useContext(AppContext);
    const { addHealthLog, currentUser } = context!;
    const [generatingVideo, setGeneratingVideo] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [videoError, setVideoError] = useState<string | null>(null);
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [apiKeySelected, setApiKeySelected] = useState(false);

    const checkApiKey = async () => {
        if (window.aistudio) {
            const hasKey = await window.aistudio.hasSelectedApiKey();
            setApiKeySelected(hasKey);
        }
    };

    useEffect(() => {
        checkApiKey();
    }, []);

    const handleLogYoga = () => {
        addHealthLog(currentUser!.id, {
            type: HealthLogType.YogaSession,
            description: "Completed a yoga and fitness session."
        });
        alert("Yoga session logged in your Health Diary!");
    };
    
    const handleGenerateVideo = async (poseName: string) => {
        if (!apiKeySelected) {
            if (window.aistudio) {
                await window.aistudio.openSelectKey();
                // Assume success after dialog opens to avoid race condition
                setApiKeySelected(true); 
            }
            // return; // Let user click again
        }
        
        setGeneratingVideo(poseName);
        setVideoError(null);
        setVideoUrl(null);
        try {
            const prompt = `A clear, instructional video of a person demonstrating the ${poseName} yoga pose in a calm, minimalist setting.`;
            const url = await generateYogaVideo(prompt);
            setVideoUrl(url);
            setShowVideoModal(true);
        } catch (error: any) {
            console.error(error);
            setVideoError(error.message || "An unknown error occurred.");
             if (error.message.includes("API key is invalid")) {
                setApiKeySelected(false);
            }
        } finally {
            setGeneratingVideo(null);
        }
    };

    return (
        <div className="space-y-8">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-white">Yoga & Fitness</h2>
                <p className="text-gray-400 mt-2">Nurture your body and mind.</p>
            </div>

            <div className="bg-gray-700/50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-cyan-300 mb-4">Guided Poses</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {yogaPoses.map(pose => (
                        <div key={pose.name} className="bg-gray-800 p-4 rounded-lg flex flex-col justify-between">
                            <img src={pose.img} alt={pose.name} className="rounded-md mb-4 w-full h-40 object-cover" />
                            <h4 className="font-bold text-lg text-white">{pose.name}</h4>
                            <p className="text-gray-400 text-sm mb-4 flex-grow">{pose.description}</p>
                            <button
                                onClick={() => handleGenerateVideo(pose.name)}
                                disabled={generatingVideo === pose.name}
                                className="w-full mt-2 px-4 py-2 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 disabled:bg-cyan-800 disabled:cursor-not-allowed transition-colors"
                            >
                                {generatingVideo === pose.name ? 'Generating...' : 'Generate Video'}
                            </button>
                        </div>
                    ))}
                </div>
                 {!apiKeySelected && window.aistudio && (
                    <div className="mt-4 text-center p-4 bg-yellow-500/20 text-yellow-300 rounded-lg">
                        <p>To generate videos, you need to select an API key.</p>
                        <button onClick={async () => {
                            await window.aistudio!.openSelectKey();
                            setApiKeySelected(true);
                        }} className="mt-2 px-4 py-1 bg-yellow-500 text-black font-semibold rounded hover:bg-yellow-600">Select API Key</button>
                         <p className="text-xs mt-2">Billing charges may apply. <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline">Learn more</a>.</p>
                    </div>
                )}
                 {videoError && <p className="mt-4 text-center text-red-400">{videoError}</p>}
                 {videoUrl && !showVideoModal && (
                      <div className="mt-4 text-center">
                        <button onClick={() => setShowVideoModal(true)} className="px-6 py-2 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600">
                           Watch Demo
                        </button>
                    </div>
                 )}
            </div>

            <div className="bg-gray-700/50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-cyan-300 mb-4">Daily Wellness</h3>
                 <div className="space-y-3 text-gray-300">
                    {healthFacts.map((fact, index) => (
                        <p key={index} className="pl-4 border-l-2 border-cyan-500">{fact}</p>
                    ))}
                </div>
                <button onClick={handleLogYoga} className="mt-6 px-6 py-3 bg-teal-500 text-white font-bold rounded-lg hover:bg-teal-600 transition-colors">Log Yoga Session to Diary</button>
            </div>
            
            {showVideoModal && videoUrl && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowVideoModal(false)}>
                    <div className="bg-gray-900 p-4 rounded-lg max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
                        <video src={videoUrl} controls autoPlay className="w-full rounded"></video>
                        <button onClick={() => setShowVideoModal(false)} className="mt-4 w-full py-2 bg-red-600 text-white rounded hover:bg-red-700">Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default YogaAndFitness;