import { useState } from 'react';

export default function Accordion({ question, answer, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-navy-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-4 text-left bg-offwhite-0 hover:bg-offwhite-50 transition-colors duration-200 min-h-[44px]"
        aria-expanded={isOpen}
      >
        <span className="font-medium text-ink-900 text-sm sm:text-base pr-4">
          {question}
        </span>
        <svg
          className={`w-5 h-5 text-navy-700 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-5 py-4 text-ink-900 text-sm leading-relaxed bg-offwhite-50 border-t border-navy-100">
          {answer}
        </div>
      </div>
    </div>
  );
}
