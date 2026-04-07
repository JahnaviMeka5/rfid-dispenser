
import React, { useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { Patient, HealthLogType } from '../../types';

const HealthDiary: React.FC = () => {
    const context = useContext(AppContext);
    const patient = context?.currentUser as Patient;

    const getIconForType = (type: HealthLogType) => {
        switch (type) {
            case HealthLogType.MedicationTaken:
                return <span className="material-icons text-green-400">medication</span>;
            case HealthLogType.AICoachQuery:
                return <span className="material-icons text-cyan-400">smart_toy</span>;
            case HealthLogType.MealAnalyzed:
                return <span className="material-icons text-orange-400">restaurant</span>;
            case HealthLogType.YogaSession:
                return <span className="material-icons text-purple-400">self_improvement</span>;
            default:
                return <span className="material-icons text-gray-400">event_note</span>;
        }
    };

    return (
        <div>
            <h2 className="text-3xl font-bold text-white text-center mb-6">Your Health Diary</h2>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {patient.healthLog.length > 0 ? (
                    patient.healthLog.map(log => (
                        <div key={log.id} className="flex items-start gap-4 p-4 bg-gray-700/50 rounded-lg">
                            <div className="flex-shrink-0 w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center">
                                {getIconForType(log.type)}
                            </div>
                            <div>
                                <p className="font-semibold text-white">{log.description}</p>
                                <p className="text-sm text-gray-400">{new Date(log.timestamp).toLocaleString()}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-gray-500">No activities logged yet. Start interacting with the app to see your diary grow!</p>
                )}
            </div>
        </div>
    );
};

export default HealthDiary;
