import React, { useRef, useEffect } from 'react';

interface PinInputProps {
  id?: string;
  value: string;
  onChange: (pin: string) => void;
  onComplete?: (pin: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  error?: boolean;
  mask?: boolean;
  size?: 'md' | 'lg';
}

export const PinInput: React.FC<PinInputProps> = ({
  id = 'pin-input',
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = false,
  error = false,
  mask = false,
  size = 'lg'
}) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const digits = (value || '').padEnd(6, ' ').slice(0, 6).split('');

  useEffect(() => {
    if (autoFocus && inputsRef.current[0] && !disabled) {
      inputsRef.current[0].focus();
    }
  }, [autoFocus, disabled]);

  const handleDigitChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Extract only digits
    const cleanVal = val.replace(/\D/g, '');

    if (!cleanVal) {
      // User erased
      const newDigits = [...digits];
      newDigits[index] = '';
      const newPin = newDigits.join('').trim();
      onChange(newPin);
      return;
    }

    if (cleanVal.length > 1) {
      // Multiple digits pasted into one input
      handlePasteString(cleanVal, index);
      return;
    }

    // Single digit
    const digit = cleanVal[cleanVal.length - 1];
    const newDigits = [...digits.map(d => d.trim())];
    newDigits[index] = digit;
    const newPin = newDigits.join('').slice(0, 6);
    onChange(newPin);

    // Auto focus next input
    if (index < 5 && digit) {
      inputsRef.current[index + 1]?.focus();
    }

    if (newPin.length === 6 && onComplete) {
      onComplete(newPin);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] || digits[index] === ' ') {
        if (index > 0) {
          inputsRef.current[index - 1]?.focus();
          const newDigits = [...digits.map(d => d.trim())];
          newDigits[index - 1] = '';
          onChange(newDigits.join(''));
        }
      } else {
        const newDigits = [...digits.map(d => d.trim())];
        newDigits[index] = '';
        onChange(newDigits.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePasteString = (pastedText: string, startIndex = 0) => {
    const cleaned = pastedText.replace(/\D/g, '').slice(0, 6);
    if (!cleaned) return;

    let newPin = value || '';
    const arr = (newPin.padEnd(6, ' ')).split('');

    for (let i = 0; i < cleaned.length && startIndex + i < 6; i++) {
      arr[startIndex + i] = cleaned[i];
    }

    const finalPin = arr.join('').trim();
    onChange(finalPin);

    // Focus appropriate input
    const nextIdx = Math.min(startIndex + cleaned.length, 5);
    inputsRef.current[nextIdx]?.focus();

    if (finalPin.length === 6 && onComplete) {
      onComplete(finalPin);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    handlePasteString(text, 0);
  };

  const boxSizeClass = size === 'lg' 
    ? 'w-11 h-14 sm:w-14 sm:h-16 text-2xl sm:text-3xl' 
    : 'w-9 h-12 sm:w-11 sm:h-14 text-xl sm:text-2xl';

  return (
    <div id={id} className="flex items-center justify-center gap-2 sm:gap-3.5">
      {[0, 1, 2, 3, 4, 5].map((index) => {
        const val = digits[index] && digits[index] !== ' ' ? digits[index] : '';
        const isFilled = Boolean(val);

        return (
          <input
            key={index}
            ref={(el) => { inputsRef.current[index] = el; }}
            type={mask ? 'password' : 'text'}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            disabled={disabled}
            value={val}
            onChange={(e) => handleDigitChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            aria-label={`PIN Digit ${index + 1}`}
            className={`
              ${boxSizeClass}
              text-center font-mono font-bold rounded-xl transition-all duration-200
              outline-none select-none
              ${
                error
                  ? 'bg-rose-50 border-2 border-rose-500 text-rose-700 shadow-sm shadow-rose-100'
                  : isFilled
                  ? 'bg-blue-50/60 border-2 border-blue-600 text-slate-900 shadow-sm'
                  : 'bg-white border-2 border-slate-200 text-slate-900 hover:border-slate-300 focus:border-blue-500 focus:bg-white'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : 'cursor-pointer'}
              focus:ring-2 focus:ring-blue-500/20 focus:scale-[1.02]
            `}
          />
        );
      })}
    </div>
  );
};
