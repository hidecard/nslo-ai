
import React from 'react';
import { ProficiencyLevel } from '../types';

interface LevelSelectorProps {
  onSelect: (level: ProficiencyLevel) => void;
}

const levels: { id: ProficiencyLevel; title: string; desc: string; icon: string }[] = [
  { id: 'Beginner', title: 'Beginner (အခြေခံ)', desc: 'Start with basic words and sentences.', icon: '🌱' },
  { id: 'Intermediate', title: 'Intermediate (အလယ်အလတ်)', desc: 'Improve your grammar and communication.', icon: '🌿' },
  { id: 'Advanced', title: 'Advanced (အဆင့်မြင့်)', desc: 'Master complex structures and fluency.', icon: '🌳' },
  { id: 'IELTS', title: 'IELTS Prep', desc: 'Focus on Exam techniques and academic English.', icon: '🎓' },
];

const LevelSelector: React.FC<LevelSelectorProps> = ({ onSelect }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-indigo-700 mb-4">မင်္ဂလာပါ! I am NSLO AI</h1>
        <p className="text-lg text-gray-600 myanmar-text">သင်၏ အင်္ဂလိပ်စာ လေ့လာမှုခရီးစဉ်ကို စတင်ရန် အဆင့်တစ်ခု ရွေးချယ်ပါ။</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {levels.map((level) => (
          <button
            key={level.id}
            onClick={() => onSelect(level.id)}
            className="flex items-start p-6 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-indigo-500 hover:shadow-md transition-all text-left"
          >
            <span className="text-4xl mr-4">{level.icon}</span>
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-1">{level.title}</h3>
              <p className="text-gray-500 myanmar-text">{level.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default LevelSelector;
