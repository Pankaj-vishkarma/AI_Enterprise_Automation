import React, { useState } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { GitMerge, Play, Send, Loader, FileText, CheckCircle2, User, Bot, ArrowRight, Download } from 'lucide-react';

const PRESET_TEAMS = [
  {
    id: "market-research",
    name: "Market Research & Analysis Team",
    agents: [
      { name: "Research Agent", role: "Information Gatherer", desc: "Crawls web sources and databases to collect raw data." },
      { name: "Analyst Agent", role: "Trend Spotter", desc: "Processes statistics, prices, and identifies core opportunities." },
      { name: "Writer Agent", role: "Drafting Specialist", desc: "Translates analytics into structured professional narratives." },
      { name: "Reviewer Agent", role: "Quality Assurance", desc: "Refines text structure, corrects formatting, and ensures depth." }
    ]
  },
  {
    id: "code-dev",
    name: "Software Architecture & Dev Team",
    agents: [
      { name: "Architect Agent", role: "System Planner", desc: "Defines class structures, tech stack, and module scopes." },
      { name: "Coder Agent", role: "Developer", desc: "Writes clean, functional React / Python code blocks." },
      { name: "Tester Agent", role: "QA Engineer", desc: "Identifies logical errors, edge cases, and drafts unit tests." },
      { name: "Reviewer Agent", role: "Senior Dev", desc: "Polishes syntax, implements optimizations, and reviews docs." }
    ]
  }
];

const MOCK_COLLABORATION_LOGS = [
  {
    agent: "Research Agent",
    status: "Collecting data...",
    log: "Scraping EV market statistics for 2026. Queried 14 sources including Bloomberg, McKinsey Reports, and CleanTechnica. Retrieved sales metrics, manufacturer battery costs (average $95/kWh), and charging station distributions."
  },
  {
    agent: "Analyst Agent",
    status: "Spotting trends...",
    log: "Processing raw data. Key insights identified: 1. Sales volumes grew 28% YoY. 2. Battery pack prices fell below the $100/kWh threshold for the first time. 3. Primary growth bottlenecks are public fast-charging grid capacity and grid integration issues."
  },
  {
    agent: "Writer Agent",
    status: "Drafting report...",
    log: "Drafting market analysis sections. Structuring report with: Executive Summary, Market Growth Drivers, Tech Breakthroughs (Solid-State & LFP chemistry), Competitor Landscaping (Tesla, BYD, local OEMs), and Policy Recommendations."
  },
  {
    agent: "Reviewer Agent",
    status: "Polishing formatting...",
    log: "Reviewed draft. Corrected spelling in 'LFP chemistry', formatted statistics into responsive markdown tables, added header hierarchies, and verified source citations. Final draft validated for presentation."
  }
];

const MOCK_REPORT_MARKDOWN = `
# Executive Market Report: Electric Vehicles (EV) Trends 2026

## 1. Executive Summary
The Electric Vehicle market has experienced unprecedented development in the first half of 2026. Advancements in LFP (Lithium Iron Phosphate) and solid-state cell chemistries, combined with critical scaling in production, have driven average battery pack costs down to **$95/kWh**, achieving cost parity with internal combustion engines (ICE) across multiple car segments.

## 2. Key Growth Trends
* **Battery Cost Parity:** Average cell pack price reached **$95/kWh** (down 12% from 2025).
* **Grid Innovation:** Smart charging stations and V2G (Vehicle-to-Grid) platforms are helping stabilize charging peaks.
* **Urban Commuter Demands:** Small and compact micro-EVs are leading sales in high-density European and Asian urban centers.

## 3. Market Share Analysis
| Region | market Share | Growth Rate (YoY) | Primary Bottlenecks |
| :--- | :--- | :--- | :--- |
| **North America** | 22% | +18% | Public DC fast-charging capacity |
| **Europe** | 34% | +24% | High energy prices, grid load limits |
| **Asia-Pacific** | 44% | +35% | Rural charging network density |

---

*Report prepared collaboratively by: Research Agent, Analyst Agent, Writer Agent, and Reviewer Agent.*
`;

export default function CollaborationPage() {
  const [selectedTeam, setSelectedTeam] = useState(PRESET_TEAMS[0]);
  const [prompt, setPrompt] = useState('Create a market research report about electric vehicles.');
  const [isRunning, setIsRunning] = useState(false);
  const [step, setStep] = useState(-1);
  const [logs, setLogs] = useState([]);
  const [isFinished, setIsFinished] = useState(false);

  const startCollaboration = () => {
    if (!prompt.trim() || isRunning) return;

    setIsRunning(true);
    setIsFinished(false);
    setLogs([]);
    setStep(0);

    // Simulate Agent Step 0
    setTimeout(() => {
      setLogs(prev => [...prev, MOCK_COLLABORATION_LOGS[0]]);
      setStep(1);

      // Simulate Agent Step 1
      setTimeout(() => {
        setLogs(prev => [...prev, MOCK_COLLABORATION_LOGS[1]]);
        setStep(2);

        // Simulate Agent Step 2
        setTimeout(() => {
          setLogs(prev => [...prev, MOCK_COLLABORATION_LOGS[2]]);
          setStep(3);

          // Simulate Agent Step 3
          setTimeout(() => {
            setLogs(prev => [...prev, MOCK_COLLABORATION_LOGS[3]]);
            setStep(4);
            setIsRunning(false);
            setIsFinished(true);
          }, 1500);
        }, 1500);
      }, 1500);
    }, 1000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([MOCK_REPORT_MARKDOWN], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "EV_Market_Research_Report_2026.md";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <GitMerge size={32} className="text-primary" />
            Multi-Agent Collaboration Studio
          </h1>
          <p className="text-muted-foreground mt-1">Combine specialized AI workers into automated teams to solve complex objectives collaboratively.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Column */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h2 className="text-lg font-bold text-foreground">1. Select Agent Team</h2>
              <div className="space-y-2">
                {PRESET_TEAMS.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => {
                      if (!isRunning) {
                        setSelectedTeam(team);
                        if (team.id === "market-research") {
                          setPrompt("Create a market research report about electric vehicles.");
                        } else {
                          setPrompt("Design a microservice architecture for user profile caching.");
                        }
                      }
                    }}
                    disabled={isRunning}
                    className={`w-full text-left p-3 rounded-lg border transition text-sm cursor-pointer ${
                      selectedTeam.id === team.id
                        ? 'border-primary bg-primary/5 text-primary-foreground font-semibold'
                        : 'border-border bg-input hover:bg-secondary/40 text-foreground'
                    }`}
                  >
                    {team.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h2 className="text-lg font-bold text-foreground">2. Members Involved</h2>
              <div className="space-y-3">
                {selectedTeam.agents.map((agent, i) => (
                  <div key={i} className="flex gap-3 items-start p-2.5 rounded-lg bg-secondary/50 border border-border">
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 text-primary font-bold text-xs">
                      A{i+1}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{agent.name}</p>
                      <p className="text-xs text-primary font-medium">{agent.role}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{agent.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Prompt & Timeline Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-foreground">Configure Task Request</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isRunning}
                  placeholder="Ask your agent team to do something..."
                  className="flex-1 px-4 py-3 border border-border rounded-xl bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
                <button
                  onClick={startCollaboration}
                  disabled={isRunning || !prompt.trim()}
                  className="bg-primary text-primary-foreground px-6 py-3 rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition cursor-pointer text-sm"
                >
                  {isRunning ? <Loader className="animate-spin" size={16} /> : <Play size={16} />}
                  Run Team
                </button>
              </div>
            </div>

            {/* Run logs or outcome */}
            {(step >= 0 || isFinished) && (
              <div className="bg-card border border-border rounded-xl p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    {isRunning && <Loader className="animate-spin text-primary" size={20} />}
                    {isFinished && <CheckCircle2 className="text-green-600" size={20} />}
                    Team Activity Timeline
                  </h2>
                  {isFinished && (
                    <button 
                      onClick={handleDownload}
                      className="flex items-center gap-1.5 bg-secondary hover:bg-secondary/80 text-foreground px-3 py-1.5 rounded-lg border border-border text-xs font-medium cursor-pointer transition"
                    >
                      <Download size={14} />
                      Export Markdown
                    </button>
                  )}
                </div>

                {/* Vertical Timeline */}
                <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
                  {logs.map((log, index) => (
                    <div key={index} className="flex gap-4 items-start relative pl-1">
                      <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs z-10 flex-shrink-0 ${
                        step > index || isFinished
                          ? 'bg-green-600 border-green-600 text-white'
                          : 'bg-primary border-primary text-white animate-pulse'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="bg-input border border-border rounded-xl p-4 flex-1 space-y-2">
                        <div className="flex justify-between items-center">
                          <h4 className="font-bold text-sm text-foreground">{log.agent}</h4>
                          <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
                            {log.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{log.log}</p>
                      </div>
                    </div>
                  ))}

                  {isRunning && step < selectedTeam.agents.length && (
                    <div className="flex gap-4 items-start relative pl-1">
                      <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground z-10 flex-shrink-0 animate-pulse">
                        {step + 1}
                      </div>
                      <div className="p-3 border border-border border-dashed rounded-xl flex-1 text-sm text-muted-foreground italic flex items-center gap-2">
                        <Loader className="animate-spin" size={14} />
                        {selectedTeam.agents[step].name} is reading previous output and running sub-tasks...
                      </div>
                    </div>
                  )}
                </div>

                {/* Final preview tab */}
                {isFinished && (
                  <div className="border-t border-border pt-6 space-y-4">
                    <h3 className="text-md font-bold text-foreground flex items-center gap-1.5">
                      <FileText size={18} className="text-primary" />
                      Generated Final Output
                    </h3>
                    <div className="bg-input border border-border rounded-xl p-5 overflow-x-auto text-xs font-mono whitespace-pre-wrap leading-relaxed text-foreground max-h-80 overflow-y-auto">
                      {selectedTeam.id === "market-research" ? MOCK_REPORT_MARKDOWN : `
# Software Design Document: User Profile Cache Microservice

## 1. Objective
Enable ultra-fast user profile access within the organization with under 5ms latency, leveraging Redis.

## 2. Technical Stack
- **Languages:** Python (FastAPI)
- **Database:** PostgreSQL (Primary), Redis (Caching layer)
- **Containerization:** Docker & Docker Compose

## 3. Workflow Diagram
Client request -> Cache check -> (Hit: return details) -> (Miss: query PostgreSQL -> Save to cache -> Return details)

## 4. Code Sample (Coder Agent)
\`\`\`python
@router.get("/user/{user_id}/profile")
async def get_profile(user_id: int, redis = Depends(get_redis)):
    cached = await redis.get(f"profile:{user_id}")
    if cached:
        return json.loads(cached)
    # query postgres and populate cache...
\`\`\`
                      `}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
