import { useState, useEffect, useRef } from 'react';

const PASSCODE = '8888';

export default function PasscodeModal({ open, gameName, title = 'Enter passcode to delete', onConfirm, onCancel }) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const refs = [useRef(), useRef(), useRef(), useRef()];

  useEffect(() => {
    if (open) {
      setDigits(['', '', '', '']);
      setError(false);
      setTimeout(() => refs[0].current?.focus(), 50);
    }
  }, [open]);

  const handleDigit = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    setError(false);
    if (val && i < 3) refs[i + 1].current?.focus();
    if (next.every(d => d !== '') && next.join('') === PASSCODE) {
      onConfirm();
    } else if (next.every(d => d !== '')) {
      setError(true);
      setTimeout(() => {
        setDigits(['', '', '', '']);
        refs[0].current?.focus();
      }, 600);
    }
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      refs[i - 1].current?.focus();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center mb-5">
          <p className="text-2xl mb-2">🔒</p>
          <p className="text-base font-bold text-white">{title}</p>
          <p className="text-sm text-gray-500 mt-1 truncate">"{gameName}"</p>
        </div>

        {/* 4-digit input */}
        <div className="flex justify-center gap-3 mb-4">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={refs[i]}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => handleDigit(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              className={`w-12 h-14 text-center text-xl font-bold rounded-xl bg-gray-800 text-white border-2 focus:outline-none transition-colors ${
                error ? 'border-red-500' : d ? 'border-yellow-500' : 'border-gray-700 focus:border-yellow-500'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-sm text-red-400 mb-3">Incorrect passcode</p>
        )}

        <button
          onClick={onCancel}
          className="w-full py-3 rounded-xl bg-gray-800 text-gray-300 font-semibold text-sm active:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
