import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import Button from './Button';

type ModalProps = {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export default function Modal({ title, open, onClose, children }: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-ink/30 px-3 pb-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6"
      onClick={onClose}
    >
      <section
        className="max-h-[92vh] w-full overflow-auto rounded-3xl bg-paper p-5 shadow-soft sm:max-w-lg sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-ink">{title}</h2>
          <Button type="button" variant="ghost" onClick={onClose} className="h-10 w-10 rounded-full p-0" aria-label="Close">
            <X size={18} aria-hidden="true" />
          </Button>
        </div>
        {children}
      </section>
    </div>
  );
}
