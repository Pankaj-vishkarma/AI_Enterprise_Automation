import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import MainLayout from '../../components/layout/MainLayout';
import { conversationsAPI } from '../../api/conversations';
import { MessageSquare, Plus, Search, Trash2 } from 'lucide-react';

export default function ConversationsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [title, setTitle] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => conversationsAPI.list(),
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['conversations'] });
  const createMutation = useMutation({
    mutationFn: () => conversationsAPI.create({ title: title || 'Untitled conversation' }),
    onSuccess: () => { setTitle(''); invalidate(); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => conversationsAPI.delete(id),
    onSuccess: invalidate,
  });
  const conversations = data?.data || [];
  const filtered = conversations.filter((conversation) =>
    (conversation.title || 'Untitled conversation').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Conversations</h1>
          <p className="text-muted-foreground mt-2">Organization conversation history</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="flex items-center gap-3">
          <div className="flex-1 max-w-md relative">
            <Plus className="absolute left-3 top-2.5 text-muted-foreground" size={20} />
            <input
              type="text"
              placeholder="New conversation title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button disabled={createMutation.isPending} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90">
            Create
          </button>
        </form>

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
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading conversations...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No conversations found</div>
          ) : (
            filtered.map((conversation) => (
              <div key={conversation.id} className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="text-primary" size={20} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">{conversation.title || 'Untitled conversation'}</h3>
                      <p className="text-sm text-muted-foreground mt-1">Conversation #{conversation.id}</p>
                    </div>
                  </div>
                  <button onClick={() => deleteMutation.mutate(conversation.id)} className="text-destructive hover:bg-red-50 p-2 rounded-lg ml-2" title="Delete conversation">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
}
