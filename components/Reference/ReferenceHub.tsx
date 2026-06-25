import React, { useState } from 'react';
import { Search, MessageSquare, FileText } from 'lucide-react';
import { askTubistaAssistant } from '../../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { PIPE_SCHEDULE } from '../../constants';

const ReferenceHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'AI' | 'SCH'>('AI');
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResponse('');
    const result = await askTubistaAssistant(query);
    setResponse(result);
    setLoading(false);
  };

  return (
    <div className="h-full flex flex-col bg-slate-950">
      <div className="flex bg-slate-900 border-b border-slate-800">
        <button 
          onClick={() => setActiveTab('AI')}
          className={`flex-1 py-4 flex justify-center gap-2 items-center ${activeTab === 'AI' ? 'text-safety-yellow border-b-2 border-safety-yellow' : 'text-slate-400'}`}
        >
          <MessageSquare size={18} /> Mestre Virtual
        </button>
        <button 
          onClick={() => setActiveTab('SCH')}
          className={`flex-1 py-4 flex justify-center gap-2 items-center ${activeTab === 'SCH' ? 'text-safety-yellow border-b-2 border-safety-yellow' : 'text-slate-400'}`}
        >
          <FileText size={18} /> Tabelas
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'AI' ? (
          <div className="flex flex-col h-full p-4">
            <div className="flex-1 overflow-y-auto mb-4 bg-slate-900 rounded-lg p-4 border border-slate-800">
              {response ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{response}</ReactMarkdown>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500">
                  <Search size={48} className="mb-4 opacity-20" />
                  <p className="text-center">Pergunte sobre procedimentos de solda, tipos de válvulas, conexões ou cálculos complexos.</p>
                </div>
              )}
              {loading && <div className="text-safety-yellow animate-pulse mt-4">Consultando Mestre Tubista...</div>}
            </div>

            <div className="flex gap-2">
              <input 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex: Qual a diferença entre válvula globo e gaveta?"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
              />
              <button 
                onClick={handleAsk}
                disabled={loading}
                className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-500 disabled:opacity-50"
              >
                Enviar
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-white">Tabela Pipe Schedule (Resumo)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-400">
                <thead className="text-xs text-slate-200 uppercase bg-slate-800">
                  <tr>
                    <th className="px-4 py-3">NPS</th>
                    <th className="px-4 py-3">D.E. (mm)</th>
                    <th className="px-4 py-3">Sch 40 (mm)</th>
                    <th className="px-4 py-3">Sch 80 (mm)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(PIPE_SCHEDULE).map((item, index) => (
                    <tr key={item.nps} className={index % 2 === 0 ? 'bg-slate-900' : 'bg-slate-800'}>
                      <td className="px-4 py-3 font-medium text-white">{item.nps}"</td>
                      <td className="px-4 py-3">{item.od}</td>
                      <td className="px-4 py-3">{item.sch40_wall}</td>
                      <td className="px-4 py-3">{item.sch80_wall}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferenceHub;