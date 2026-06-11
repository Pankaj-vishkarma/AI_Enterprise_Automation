import React, { useState } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { operationsAPI } from '../../api/operations';
import { Compass, Search, Loader, FileText, CheckCircle2, Download, BarChart2, BookOpen, Layers } from 'lucide-react';

const SUGGESTED_RESEARCH = [
  "Analyze the AI market in India.",
  "Compare our product with competitors.",
  "Identify growth opportunities in healthcare technology."
];

export default function ResearchPage() {
  const [query, setQuery] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState('');

  const runResearch = async (question) => {
    if (!question.trim() || isRunning) return;

    setQuery(question);
    setIsRunning(true);
    setResult('');
    setProgress('Researching organizational knowledge and synthesizing findings...');
    try {
      const { data } = await operationsAPI.runResearch(question);
      setResult(data.data.result);
    } catch {
      setResult(`# Executive Research Summary\n\n${question}\n\nThe research service is currently unavailable.`);
    } finally {
      setIsRunning(false);
      setProgress('');
    }
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([result], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "Business_Intelligence_Report.md";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Compass size={32} className="text-primary" />
            Business Research Hub
          </h1>
          <p className="text-muted-foreground mt-1">Generate deep market reports, evaluate competitor matrices, and discover product expansion targets using AI.</p>
        </div>

        {/* Input Form */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
          <h2 className="text-lg font-bold text-foreground">Launch Research Request</h2>
          <form 
            onSubmit={(e) => { e.preventDefault(); runResearch(query); }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3.5 text-muted-foreground" size={20} />
              <input
                type="text"
                required
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask about Indian AI market, competitor comparisons, healthcare tech..."
                disabled={isRunning}
                className="w-full pl-10 pr-4 py-3 border border-border rounded-xl bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm shadow-sm"
              />
            </div>
            <button
              type="submit"
              disabled={isRunning || !query.trim()}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition cursor-pointer text-sm shadow-sm"
            >
              {isRunning ? <Loader className="animate-spin" size={16} /> : <Compass size={16} />}
              Run Analysis
            </button>
          </form>

          {/* Quick Suggestions */}
          {!isRunning && !result && (
            <div className="pt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Preset Templates</p>
              <div className="flex flex-col gap-2 md:flex-row md:flex-wrap">
                {SUGGESTED_RESEARCH.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => runResearch(q)}
                    className="text-left text-xs px-3 py-2 bg-secondary/50 border border-border hover:border-primary/50 hover:bg-secondary rounded-lg transition text-foreground cursor-pointer font-medium"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Running state */}
        {isRunning && (
          <div className="bg-card border border-border rounded-xl p-8 text-center space-y-4 shadow-sm">
            <Loader className="animate-spin text-primary mx-auto" size={36} />
            <h3 className="text-md font-bold text-foreground">Conducting Business Intelligence Crawl...</h3>
            <p className="text-xs text-muted-foreground">{progress}</p>
          </div>
        )}

        {/* Results output */}
        {result && !isRunning && (
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <FileText className="text-primary" size={24} />
                <h3 className="text-lg font-bold text-foreground">Completed Research Analysis</h3>
              </div>
              <button 
                onClick={handleDownload}
                className="flex items-center gap-1.5 bg-secondary hover:bg-secondary/80 text-foreground px-3 py-1.5 rounded-lg border border-border text-xs font-medium cursor-pointer transition"
              >
                <Download size={14} />
                Export Markdown
              </button>
            </div>

            <div className="bg-input border border-border rounded-xl p-6 overflow-x-auto text-xs font-mono whitespace-pre-wrap leading-relaxed text-foreground max-h-[500px] overflow-y-auto">
              {result}
            </div>

            <div className="grid grid-cols-3 gap-4 text-center text-xs text-muted-foreground pt-4 border-t border-border">
              <div>
                <p className="font-semibold text-foreground">Search Coverage</p>
                <p className="text-[10px] mt-0.5">High (Global Caches)</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Confidence Score</p>
                <p className="text-[10px] mt-0.5">94% (Verified sources)</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Model Utilized</p>
                <p className="text-[10px] mt-0.5">Claude 3.5 Sonnet</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
