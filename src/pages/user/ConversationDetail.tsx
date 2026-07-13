import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MessageSquarePlus } from 'lucide-react';
import { getConversation, listMessages, getFeedbackForMessages } from '../../lib/api';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageLoader, ErrorState, EmptyState, Button } from '../../components/ui';
import { MessageBubble } from '../../components/features/MessageBubble';
import { formatDateTime } from '../../lib/format';

export default function ConversationDetail() {
  const { conversationId } = useParams();
  const navigate = useNavigate();

  const convQ = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => getConversation(conversationId!),
    enabled: !!conversationId,
  });
  const msgQ = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => listMessages(conversationId!),
    enabled: !!conversationId,
  });
  const fbQ = useQuery({
    queryKey: ['feedback', conversationId, msgQ.data?.length],
    queryFn: () => getFeedbackForMessages((msgQ.data ?? []).map((m) => m.id)),
    enabled: !!msgQ.data?.length,
  });

  const feedbackMap: Record<string, -1 | 1> = {};
  fbQ.data?.forEach((f) => (feedbackMap[f.message_id] = f.rating));

  if (convQ.isLoading || msgQ.isLoading) return <PageLoader />;
  if (convQ.isError || !convQ.data)
    return (
      <PageContainer title="Percakapan">
        <ErrorState message="Percakapan tidak ditemukan atau tidak dapat diakses." />
      </PageContainer>
    );

  return (
    <PageContainer
      title={convQ.data.title}
      description={`Dibuat ${formatDateTime(convQ.data.created_at)}`}
      actions={
        <>
          <Button variant="secondary" onClick={() => navigate('/app/history')}>
            <ArrowLeft size={16} /> Kembali
          </Button>
          <Link to={`/app/chat/${conversationId}`} className="btn-primary">
            <MessageSquarePlus size={16} /> Lanjutkan
          </Link>
        </>
      }
    >
      {!msgQ.data?.length ? (
        <EmptyState title="Tidak ada pesan pada percakapan ini." />
      ) : (
        <div className="mx-auto max-w-3xl space-y-5">
          {msgQ.data.map((m) => (
            <MessageBubble key={m.id} message={m} feedbackRating={feedbackMap[m.id] ?? null} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
