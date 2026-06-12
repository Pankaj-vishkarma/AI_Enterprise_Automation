export const BRAND = {
  shortMark: 'AI',
  name: 'Automation',
  fullName: 'AI Enterprise Automation Platform',
};

export const NAV_LINKS = [
  { href: '#employees', label: 'AI Employees' },
  { href: '#workflows', label: 'Workflows' },
  { href: '#knowledge', label: 'Knowledge' },
  { href: '#research', label: 'Research' },
  { href: '#analytics', label: 'Analytics' },
];

export const LOGIN_CORE_NODES = [
  { label: 'AI Employees', iconName: 'Users', angle: 0, color: '#1A1A14' },
  { label: 'Automation', iconName: 'Zap', angle: 60, color: '#4B4B42' },
  { label: 'Knowledge', iconName: 'BookOpen', angle: 120, color: '#6A6A60' },
  { label: 'Research', iconName: 'Search', angle: 180, color: '#4B4B42' },
  { label: 'Analytics', iconName: 'BarChart3', angle: 240, color: '#1A1A14' },
  { label: 'Support', iconName: 'LifeBuoy', angle: 300, color: '#6A6A60' },
];

export const CORE_AGENTS = [
  { label: 'HR AI', iconName: 'Users', angle: 0, color: '#1A1A14' },
  { label: 'Sales AI', iconName: 'Briefcase', angle: 72, color: '#4B4B42' },
  { label: 'Research AI', iconName: 'Search', angle: 144, color: '#6A6A60' },
  { label: 'Support AI', iconName: 'LifeBuoy', angle: 216, color: '#4B4B42' },
  { label: 'Docs AI', iconName: 'FileText', angle: 288, color: '#1A1A14' },
];

export const TRUST_MARQUEE = [
  'Enterprise',
  'SaaS',
  'Healthcare',
  'Finance',
  'Manufacturing',
  'Retail',
  'Technology',
  'Logistics',
];

export const EMPLOYEES = [
  { name: 'HR Assistant', role: 'People & Culture', iconName: 'Users', tasks: ['Leave policies', 'Benefits', 'Onboarding'], color: '#1A1A14' },
  { name: 'Support Agent', role: 'Customer Success', iconName: 'LifeBuoy', tasks: ['Inquiries', 'Troubleshooting', 'Escalations'], color: '#4B4B42' },
  { name: 'Sales Closer', role: 'Revenue', iconName: 'Briefcase', tasks: ['Lead qualification', 'Pricing', 'Recommendations'], color: '#6A6A60' },
  { name: 'Research Lead', role: 'Strategy', iconName: 'Search', tasks: ['Market analysis', 'Competitor intel', 'Trends'], color: '#4B4B42' },
  { name: 'Docs Writer', role: 'Operations', iconName: 'FileText', tasks: ['SOPs', 'Policies', 'Guides'], color: '#1A1A14' },
  { name: 'Finance Ops', role: 'Finance', iconName: 'Coins', tasks: ['Reimbursements', 'Reports', 'Approvals'], color: '#6A6A60' },
];

export const MULTI_AGENT_STEPS = [
  { iconName: 'Search', title: 'Research Agent', text: 'Crawls sources, gathers data, validates references.' },
  { iconName: 'Brain', title: 'Analyst Agent', text: 'Spots trends, builds the narrative, runs comparisons.' },
  { iconName: 'FileText', title: 'Writer Agent', text: 'Drafts the report in your brand voice and structure.' },
  { iconName: 'Shield', title: 'Reviewer Agent', text: 'Fact-checks, polishes, and signs off the final delivery.' },
];

export const MULTI_AGENT_PIPELINE = ['Spawn 4 agents', 'Allocate context', 'Execute in parallel', 'Synthesize report'];

export const WORKFLOW_STEPS = ['Trigger', 'AI Review', 'Approval', 'Execute'];

export const WORKFLOW_PROGRESS = [
  { l: 'Onboarding', v: 92 },
  { l: 'Refunds', v: 67 },
  { l: 'Approvals', v: 81 },
];

export const DEPARTMENTS = ['HR', 'Sales', 'Ops', 'Support', 'Finance', 'Marketing', 'Eng'];

export const KNOWLEDGE_QUESTIONS = [
  'What is the reimbursement policy?',
  'How many annual leaves are allowed?',
  'What is our customer refund process?',
  'What is the probation period?',
];

export const KNOWLEDGE_SOURCES = [
  { name: 'Employee Handbook', t: 'Policy' },
  { name: 'Refund SOP v3.2', t: 'Process' },
  { name: 'HR Benefits Guide', t: 'Benefits' },
  { name: 'Vendor Master Contract', t: 'Contract' },
];

export const KNOWLEDGE_FEATURES = [
  'Cited answers from your sources',
  'Zero hallucinations, full audit trail',
  'Department-scoped permissions',
  'Voice search built in',
];

export const RESEARCH_ITEMS = [
  { q: 'Analyze the AI market in India', t: 'Generating insights...' },
  { q: 'Compare our product vs competitors', t: '12 sources synthesized' },
  { q: 'Growth opportunities in health-tech', t: 'Report ready' },
];

export const BROWSER_STEPS = [
  'Find top 20 React Developer jobs',
  'Visited 47 pages',
  'Extracted 20 listings',
  'Compiled report.csv',
];

export const SUPPORT_TICKETS = [
  { c: 'Billing', s: 'Frustrated', color: '#1A1A14' },
  { c: 'Technical', s: 'Neutral', color: '#6A6A60' },
  { c: 'Feature Req', s: 'Positive', color: '#4B4B42' },
];

export const OMNICHANNEL_CHANNELS = ['Web Chat', 'Slack', 'Telegram', 'Email', 'In-App'];

export const ANALYTICS_STATS = [
  { label: 'Hours saved / week', value: '1,420', color: '#1A1A14' },
  { label: 'Tickets auto-resolved', value: '87%', color: '#4B4B42' },
  { label: 'Workflows automated', value: '312', color: '#6A6A60' },
  { label: 'Knowledge queries', value: '24.6k', color: '#4B4B42' },
];

export const FOOTER_COLUMNS = [
  { t: 'Platform', links: ['AI Employees', 'Workflows', 'Knowledge', 'Browser'] },
  { t: 'Company', links: ['About', 'Customers', 'Careers', 'Contact'] },
  { t: 'Resources', links: ['Docs', 'Changelog', 'Security', 'Status'] },
];
