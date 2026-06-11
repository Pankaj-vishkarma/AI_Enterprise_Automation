import React, { useState } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { MessageSquare, Trash2, Search } from 'lucide-react';

export default function ConversationsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [conversations] = useState([
    { id: 1, title: 'Q&A about product features', preview: 'Can you explain how the API works...', lastMessage: '2 hours ago' },
    { id: 2, title: 'Onboarding questions', preview: 'How do I get started with the platform...', lastMessage: '1 day ago' },
  ]);

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Conversations</h1>
          <p className="text-muted-foreground mt-2">Your conversation history</p>
        </div>

        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-muted-foreground" size={20} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No conversations found</div>
          ) : (
            filtered.map((conv) => (
              <div
                key={conv.id}
                className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="text-primary" size={20} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">{conv.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{conv.preview}</p>
                    </div>
                  </div>
                  <button className="text-destructive hover:bg-red-50 p-2 rounded-lg ml-2">
                    <Trash2 size={18} />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">{conv.lastMessage}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
}
