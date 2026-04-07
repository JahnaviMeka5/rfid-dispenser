
import React from 'react';

const LandingPage: React.FC<{ onStart: () => void }> = ({ onStart }) => {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-4 overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-20">
        {/* Animated background elements */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-cyan-500 rounded-full animate-blob filter blur-xl"></div>
        <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-blue-500 rounded-full animate-blob animation-delay-2000 filter blur-xl"></div>
        <div className="absolute bottom-1/4 left-1/3 w-32 h-32 bg-teal-500 rounded-full animate-blob animation-delay-4000 filter blur-xl"></div>
      </div>

      <div className="z-10 text-center animate-fade-in-up">
        <div className="mb-4 text-6xl text-cyan-400 animate-pulse">
            <span className="material-icons" style={{fontSize: '6rem'}}>health_and_safety</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
          IntelliMed Dispenser
        </h1>
        <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          Your intelligent health partner for medication management and wellness.
        </p>
        <button
          onClick={onStart}
          className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-8 rounded-full text-lg transition-transform transform hover:scale-105"
        >
          Get Started
        </button>
      </div>

      {/* FIX: Removed non-standard "jsx" prop from style tag. */}
      <style>{`
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 1s ease-out forwards;
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

export default LandingPage;