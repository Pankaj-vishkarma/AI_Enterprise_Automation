import React, { useState } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { operationsAPI } from '../../api/operations';
import { Globe, Play, Loader, CheckCircle2, Terminal, Table, Download, Search, RefreshCw } from 'lucide-react';

export default function BrowserAutomationPage() {
  const [instruction, setInstruction] = useState('Find the top 20 React Developer jobs and create a report.');
  const [isRunning, setIsRunning] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState([]);
  const [showTable, setShowTable] = useState(false);
  const [results, setResults] = useState([]);

  const startAutomation = async () => {
    if (!instruction.trim() || isRunning) return;

    setIsRunning(true);
    setShowTable(false);
    setTerminalLogs([]);

    try {
      const { data } = await operationsAPI.runBrowserTask(instruction);
      setTerminalLogs(data.data.result.split('\n'));
      setResults(data.data.results || []);
      setShowTable((data.data.results || []).length > 0);
    } finally {
      setIsRunning(false);
    }
  };

  const handleDownload = () => {
    let csvContent = "data:text/csv;charset=utf-8,ID,Job Title,Company,Location,Salary,Posted\n";
    results.forEach(j => {
      csvContent += `${j.id},"${j.title}","${j.company}","${j.location}","${j.salary}","${j.posted}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "React_Developer_Jobs_Report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Globe size={32} className="text-primary" />
            Browser Automation Hub
          </h1>
          <p className="text-muted-foreground mt-1">Direct AI agents to automatically navigate websites, scrape tables, monitor prices, and fill web forms.</p>
        </div>

        {/* Action input */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
          <h2 className="text-lg font-bold text-foreground">Launch Automated Browser Task</h2>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3.5 text-muted-foreground" size={20} />
              <input
                type="text"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                disabled={isRunning}
                placeholder="e.g. Scrape prices from competitor.com or search jobs on linkedin..."
                className="w-full pl-10 pr-4 py-3 border border-border rounded-xl bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm shadow-sm"
              />
            </div>
            <button
              onClick={startAutomation}
              disabled={isRunning || !instruction.trim()}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition cursor-pointer text-sm shadow-sm"
            >
              {isRunning ? <Loader className="animate-spin" size={16} /> : <Play size={16} />}
              Execute Task
            </button>
          </div>
        </div>

        {/* Display Simulator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Browser execution report */}
          <div className="lg:col-span-1 bg-[#0f172a] text-green-400 border border-slate-800 rounded-xl p-5 shadow-inner h-[400px] overflow-hidden flex flex-col font-mono text-xs">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-3 text-slate-400 font-sans">
              <span className="flex items-center gap-1.5 font-bold">
                <Terminal size={14} />
                Virtual Agent Shell
              </span>
              {isRunning && <span className="text-[10px] bg-primary/20 text-primary-foreground px-2 py-0.5 rounded border border-primary/30 flex items-center gap-1">
                <RefreshCw className="animate-spin" size={10} /> Running
              </span>}
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 select-text scrollbar-thin">
              {terminalLogs.length === 0 ? (
                <span className="text-slate-500 italic">Console is idle. Launch a task to view execution output logs...</span>
              ) : (
                terminalLogs.map((log, i) => (
                  <div key={i} className="leading-relaxed break-all">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Structured Data Grid Output */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 shadow-sm h-[400px] flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-border pb-3 mb-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Table size={16} className="text-primary" />
                  Structured Scrape Data Grid
                </h3>
                {showTable && (
                  <button 
                    onClick={handleDownload}
                    className="flex items-center gap-1 bg-secondary hover:bg-secondary/80 text-foreground px-2.5 py-1 rounded-lg border border-border text-xs font-semibold cursor-pointer transition"
                  >
                    <Download size={12} />
                    Download CSV
                  </button>
                )}
              </div>

              {!showTable && !isRunning && (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm italic">
                  Data grid will populate upon successful task execution.
                </div>
              )}

              {isRunning && (
                <div className="h-64 flex flex-col items-center justify-center gap-3 text-muted-foreground text-sm italic">
                  <Loader className="animate-spin text-primary" size={28} />
                  <span>Agent is navigating and scraping live web DOM...</span>
                </div>
              )}

              {showTable && (
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-secondary text-foreground font-semibold border-b border-border">
                        <th className="p-3">Job Title</th>
                        <th className="p-3">Company</th>
                        <th className="p-3">Location</th>
                        <th className="p-3">Salary Estimate</th>
                        <th className="p-3">Posted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map(job => (
                        <tr key={job.id} className="border-b border-border hover:bg-secondary/40 text-foreground font-medium">
                          <td className="p-3 font-semibold text-primary">{job.title}</td>
                          <td className="p-3">{job.company}</td>
                          <td className="p-3">{job.location}</td>
                          <td className="p-3">{job.salary}</td>
                          <td className="p-3 text-muted-foreground">{job.posted}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {showTable && (
              <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 p-2.5 rounded-lg">
                <CheckCircle2 size={14} className="flex-shrink-0" />
                <span>Extracted 5 high-confidence records successfully. Ready for CSV download.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
