import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import MainLayout from '../../components/layout/MainLayout';
import { conversationsAPI } from '../../api/conversations';
import { MessageSquare, Plus, Search, Trash2 } from 'lucide-react';
import {
  appPageShell, appToolbarRow, appSearchWrap, appPageTitle, appPageDesc, appInputWithIcon, appBtnPrimary, appBtnIconDanger,
  appGlassCard, appEmpty, appLoading,
} from '../../styles/appStyles';

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
      <div className={appPageShell}>
        <div>
          <h1 className={appPageTitle}>Conversations</h1>
          <p className={appPageDesc}>Organization conversation history</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className={appToolbarRow}>
          <div className={`${appSearchWrap} relative`}>
            <Plus className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6A6A60]" size={18} />
            <input
              type="text"
              placeholder="New conversation title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={appInputWithIcon}
            />
          </div>
          <button type="submit" disabled={createMutation.isPending} className={appBtnPrimary}>
            Create
          </button>
        </form>

        <div className={appSearchWrap}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6A6A60]" size={18} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={appInputWithIcon}
            />
          </div>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <div className={appLoading}>Loading conversations...</div>
          ) : filtered.length === 0 ? (
            <div className={appEmpty}>No conversations found</div>
          ) : (
            filtered.map((conversation) => (
              <div key={conversation.id} className={`${appGlassCard} !p-4 sm:!p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-[#1A1A14]/5 border border-[#1A1A14]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="text-[#1A1A14]" size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-[#1A1A14] truncate">{conversation.title || 'Untitled conversation'}</h3>
                      <p className="text-sm text-[#6A6A60] mt-1">Conversation #{conversation.id}</p>
                    </div>
                  </div>
                  <button onClick={() => deleteMutation.mutate(conversation.id)} className={appBtnIconDanger} title="Delete conversation">
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
