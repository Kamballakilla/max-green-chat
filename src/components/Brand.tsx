import { MessageCircle } from 'lucide-react';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <span className="brand-icon">
        <MessageCircle size={compact ? 23 : 28} strokeWidth={2.5} />
      </span>
      <span>
        MAX<span className="brand-light"> Chat</span>
      </span>
    </div>
  );
}
