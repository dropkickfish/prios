import React, { useState } from 'react';

interface EisenhowerMatrixHelperProps {
  onComplete: (result: { priority: number; difficulty: number }) => void;
  onCancel: () => void;
}

export const EisenhowerMatrixHelper: React.FC<EisenhowerMatrixHelperProps> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState({
    important: false,
    urgent: false,
    complex: 1, // 1: Simple, 2: Moderate, 3: Heavy
    time: 1, // 1: < 1h, 2: > 1h
  });

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const calculateResults = () => {
    // Priority logic (1 is highest)
    let priority = 4;
    if (answers.important && answers.urgent) priority = 1;
    else if (answers.important && !answers.urgent) priority = 2;
    else if (!answers.important && answers.urgent) priority = 3;

    // Difficulty logic (1-5)
    const difficulty = Math.min(5, answers.complex + answers.time);

    onComplete({ priority, difficulty });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-700 shadow-2xl rounded-3xl max-w-lg w-full overflow-hidden">
        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-slate-800">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out" 
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        <div className="p-8">
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
              <div className="space-y-2">
                <span className="text-primary font-bold text-sm tracking-widest uppercase">Step 1: Importance</span>
                <h2 className="text-2xl font-black text-white">Is this critical for your core mission?</h2>
                <p className="text-slate-400">Does this move the needle on your long-term goals?</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <button onClick={() => { setAnswers({...answers, important: true}); nextStep(); }} className="btn btn-lg bg-slate-800 hover:bg-slate-700 border-slate-700 text-white justify-between px-6 rounded-2xl group">
                  <span>Yes, it's vital</span>
                  <span className="badge badge-primary opacity-0 group-hover:opacity-100 transition-opacity">Select</span>
                </button>
                <button onClick={() => { setAnswers({...answers, important: false}); nextStep(); }} className="btn btn-lg bg-slate-800 hover:bg-slate-700 border-slate-700 text-white justify-between px-6 rounded-2xl group">
                  <span>No, it's peripheral</span>
                  <span className="badge badge-ghost opacity-0 group-hover:opacity-100 transition-opacity">Select</span>
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
              <div className="space-y-2">
                <span className="text-primary font-bold text-sm tracking-widest uppercase">Step 2: Urgency</span>
                <h2 className="text-2xl font-black text-white">Does this have a pressing deadline?</h2>
                <p className="text-slate-400">Are there immediate consequences if not done soon?</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <button onClick={() => { setAnswers({...answers, urgent: true}); nextStep(); }} className="btn btn-lg bg-slate-800 hover:bg-slate-700 border-slate-700 text-white justify-between px-6 rounded-2xl group">
                  <span>Yes, time is sensitive</span>
                  <span className="badge badge-primary opacity-0 group-hover:opacity-100 transition-opacity">Select</span>
                </button>
                <button onClick={() => { setAnswers({...answers, urgent: false}); nextStep(); }} className="btn btn-lg bg-slate-800 hover:bg-slate-700 border-slate-700 text-white justify-between px-6 rounded-2xl group">
                   <span>No, it can wait</span>
                   <span className="badge badge-ghost opacity-0 group-hover:opacity-100 transition-opacity">Select</span>
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
              <div className="space-y-2">
                <span className="text-primary font-bold text-sm tracking-widest uppercase">Step 3: Complexity</span>
                <h2 className="text-2xl font-black text-white">How complex is the execution?</h2>
                <p className="text-slate-400">Do you have a clear plan, or is there research needed?</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <button onClick={() => { setAnswers({...answers, complex: 1}); nextStep(); }} className="btn btn-lg bg-slate-800 hover:bg-slate-700 border-slate-700 text-white justify-between px-6 rounded-2xl group">
                  <span>Easy / Clear steps</span>
                  <span className="text-xs text-slate-500">Difficulty +1</span>
                </button>
                <button onClick={() => { setAnswers({...answers, complex: 2}); nextStep(); }} className="btn btn-lg bg-slate-800 hover:bg-slate-700 border-slate-700 text-white justify-between px-6 rounded-2xl group">
                  <span>Moderate / Some unknowns</span>
                  <span className="text-xs text-slate-500">Difficulty +2</span>
                </button>
                <button onClick={() => { setAnswers({...answers, complex: 3}); nextStep(); }} className="btn btn-lg bg-slate-800 hover:bg-slate-700 border-slate-700 text-white justify-between px-6 rounded-2xl group">
                  <span>Hard / Requires heavy focus</span>
                  <span className="text-xs text-slate-500">Difficulty +3</span>
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
              <div className="space-y-2">
                <span className="text-primary font-bold text-sm tracking-widest uppercase">Step 4: Duration</span>
                <h2 className="text-2xl font-black text-white">How much time will this take?</h2>
                <p className="text-slate-400">Estimate the total active work time.</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <button onClick={() => { setAnswers({...answers, time: 1}); }} className="btn btn-lg bg-slate-800 hover:bg-slate-700 border-slate-700 text-white justify-between px-6 rounded-2xl group" onClickCapture={() => { setAnswers({...answers, time: 1}); setTimeout(calculateResults, 0); }}>
                  <span>Under 1 hour</span>
                  <span className="text-xs text-slate-500">+1</span>
                </button>
                <button onClick={() => { setAnswers({...answers, time: 2}); }} className="btn btn-lg bg-slate-800 hover:bg-slate-700 border-slate-700 text-white justify-between px-6 rounded-2xl group" onClickCapture={() => { setAnswers({...answers, time: 2}); setTimeout(calculateResults, 0); }}>
                   <span>Over 1 hour</span>
                   <span className="text-xs text-slate-500">+2</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mt-12">
            <button 
              className={`btn btn-ghost text-slate-500 ${step === 1 ? 'invisible' : ''}`}
              onClick={prevStep}
            >
              Back
            </button>
            <button className="btn btn-ghost text-slate-400" onClick={onCancel}>Cancel Wizard</button>
          </div>
        </div>
      </div>
    </div>
  );
};
