import React, { useState } from 'react';
import { computeEisenhowerResult } from './eisenhowerLogic';

interface EisenhowerMatrixHelperProps {
  onComplete: (result: { priority: number; difficulty: number }) => void;
  onCancel: () => void;
}

export const EisenhowerMatrixHelper: React.FC<EisenhowerMatrixHelperProps> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState({
    important: false,
    urgent: false,
    complex: 1 as 1 | 2 | 3,
    time: 1 as 1 | 2,
  });

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const calculateResults = (timeOverride?: 1 | 2) => {
    const result = computeEisenhowerResult({
      ...answers,
      time: timeOverride ?? answers.time,
    });
    onComplete(result);
  };

  const completeWithTime = (time: 1 | 2) => {
    setAnswers(prev => ({ ...prev, time }));
    calculateResults(time);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-base-content/20 backdrop-blur-sm animate-in fade-in duration-300" onClick={onCancel} role="dialog" aria-modal="true">
      <div className="bg-base-100 border border-base-content/10 shadow-2xl rounded-3xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="h-1.5 w-full bg-base-200">
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
                <h2 className="text-2xl font-black text-base-content">Is this critical for your core mission?</h2>
                <p className="text-base-content/60">Does this move the needle on your long-term goals?</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <button type="button" onClick={() => { setAnswers({ ...answers, important: true }); nextStep(); }} className="btn btn-lg bg-base-200 hover:bg-base-300 border-base-content/10 text-base-content justify-between px-6 rounded-2xl group">
                  <span>Yes, it&apos;s vital</span>
                  <span className="badge badge-primary opacity-0 group-hover:opacity-100 transition-opacity">Select</span>
                </button>
                <button type="button" onClick={() => { setAnswers({ ...answers, important: false }); nextStep(); }} className="btn btn-lg bg-base-200 hover:bg-base-300 border-base-content/10 text-base-content justify-between px-6 rounded-2xl group">
                  <span>No, it&apos;s peripheral</span>
                  <span className="badge badge-ghost opacity-0 group-hover:opacity-100 transition-opacity">Select</span>
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
              <div className="space-y-2">
                <span className="text-primary font-bold text-sm tracking-widest uppercase">Step 2: Urgency</span>
                <h2 className="text-2xl font-black text-base-content">Does this have a pressing deadline?</h2>
                <p className="text-base-content/60">Are there immediate consequences if not done soon?</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <button type="button" onClick={() => { setAnswers({ ...answers, urgent: true }); nextStep(); }} className="btn btn-lg bg-base-200 hover:bg-base-300 border-base-content/10 text-base-content justify-between px-6 rounded-2xl group">
                  <span>Yes, time is sensitive</span>
                  <span className="badge badge-primary opacity-0 group-hover:opacity-100 transition-opacity">Select</span>
                </button>
                <button type="button" onClick={() => { setAnswers({ ...answers, urgent: false }); nextStep(); }} className="btn btn-lg bg-base-200 hover:bg-base-300 border-base-content/10 text-base-content justify-between px-6 rounded-2xl group">
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
                <h2 className="text-2xl font-black text-base-content">How complex is the execution?</h2>
                <p className="text-base-content/60">Do you have a clear plan, or is there research needed?</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <button type="button" onClick={() => { setAnswers({ ...answers, complex: 1 }); nextStep(); }} className="btn btn-lg bg-base-200 hover:bg-base-300 border-base-content/10 text-base-content justify-between px-6 rounded-2xl group">
                  <span>Easy / Clear steps</span>
                  <span className="text-xs text-base-content/50">Difficulty +1</span>
                </button>
                <button type="button" onClick={() => { setAnswers({ ...answers, complex: 2 }); nextStep(); }} className="btn btn-lg bg-base-200 hover:bg-base-300 border-base-content/10 text-base-content justify-between px-6 rounded-2xl group">
                  <span>Moderate / Some unknowns</span>
                  <span className="text-xs text-base-content/50">Difficulty +2</span>
                </button>
                <button type="button" onClick={() => { setAnswers({ ...answers, complex: 3 }); nextStep(); }} className="btn btn-lg bg-base-200 hover:bg-base-300 border-base-content/10 text-base-content justify-between px-6 rounded-2xl group">
                  <span>Hard / Requires heavy focus</span>
                  <span className="text-xs text-base-content/50">Difficulty +3</span>
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
              <div className="space-y-2">
                <span className="text-primary font-bold text-sm tracking-widest uppercase">Step 4: Duration</span>
                <h2 className="text-2xl font-black text-base-content">How much time will this take?</h2>
                <p className="text-base-content/60">Estimate the total active work time.</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <button type="button" onClick={() => completeWithTime(1)} className="btn btn-lg bg-base-200 hover:bg-base-300 border-base-content/10 text-base-content justify-between px-6 rounded-2xl group">
                  <span>Under 1 hour</span>
                  <span className="text-xs text-base-content/50">+1</span>
                </button>
                <button type="button" onClick={() => completeWithTime(2)} className="btn btn-lg bg-base-200 hover:bg-base-300 border-base-content/10 text-base-content justify-between px-6 rounded-2xl group">
                  <span>Over 1 hour</span>
                  <span className="text-xs text-base-content/50">+2</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mt-12">
            <button type="button" className={`btn btn-ghost text-base-content/60 ${step === 1 ? 'invisible' : ''}`} onClick={prevStep}>
              Back
            </button>
            <button type="button" className="btn btn-ghost text-base-content/50" onClick={onCancel}>Cancel Wizard</button>
          </div>
        </div>
      </div>
    </div>
  );
};
