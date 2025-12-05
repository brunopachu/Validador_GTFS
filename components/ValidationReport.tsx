import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { ValidationResult, ValidationStatus } from '../types';

interface ValidationReportProps {
  results: ValidationResult[];
}

const StatusIcon = ({ status }: { status: ValidationStatus }) => {
  switch (status) {
    case 'SUCESSO': return <CheckCircle2 className="w-6 h-6 text-green-500" />;
    case 'AVISO': return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
    case 'ERRO': return <XCircle className="w-6 h-6 text-red-500" />;
    case 'INFO': return <Info className="w-6 h-6 text-cyan-500" />;
    default: return null;
  }
};

const ResultCard: React.FC<{ result: ValidationResult }> = ({ result }) => {
  const [isOpen, setIsOpen] = useState(result.status === 'ERRO' || result.status === 'AVISO');

  const borderClass = {
    'SUCESSO': 'border-l-green-500',
    'AVISO': 'border-l-yellow-500',
    'ERRO': 'border-l-red-500',
    'INFO': 'border-l-cyan-500'
  }[result.status];

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-100 border-l-[6px] mb-4 overflow-hidden ${borderClass}`}>
      <div 
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex-1 pr-4">
          {result.description && <p className="text-xs text-gray-500 mb-1 italic">{result.description}</p>}
          <h3 className="font-semibold text-gray-800 text-lg">{result.title}</h3>
        </div>
        <div className="flex items-center gap-4">
            <StatusIcon status={result.status} />
            {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </div>
      
      {isOpen && (
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-100">
          <ul className="space-y-2">
            {result.messages.map((msg, idx) => (
              <li key={idx} className="text-sm font-mono text-gray-700 bg-white p-2 rounded border border-gray-200 break-words whitespace-pre-wrap">
                {msg}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export const ValidationReport: React.FC<ValidationReportProps> = ({ results }) => {
  const summary = {
    SUCESSO: results.filter(r => r.status === 'SUCESSO').length,
    AVISO: results.filter(r => r.status === 'AVISO').length,
    ERRO: results.filter(r => r.status === 'ERRO').length,
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow-sm text-center border-t-4 border-green-500">
          <h3 className="text-gray-500 font-medium uppercase text-xs">Sucesso</h3>
          <p className="text-3xl font-bold text-green-600">{summary.SUCESSO}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm text-center border-t-4 border-yellow-500">
          <h3 className="text-gray-500 font-medium uppercase text-xs">Avisos</h3>
          <p className="text-3xl font-bold text-yellow-600">{summary.AVISO}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm text-center border-t-4 border-red-500">
          <h3 className="text-gray-500 font-medium uppercase text-xs">Erros</h3>
          <p className="text-3xl font-bold text-red-600">{summary.ERRO}</p>
        </div>
      </div>

      <div>
        {results.map((result, idx) => (
          <ResultCard key={idx} result={result} />
        ))}
      </div>
    </div>
  );
};