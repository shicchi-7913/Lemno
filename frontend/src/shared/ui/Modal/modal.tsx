import styles from './modal.module.scss';
import { useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';

interface ModalProps {
  children: ReactNode;
  titleId: string;
  descriptionId: string;
  className?: string;
  pending: boolean;
  onDismiss: () => void;
  initialFocusRef: RefObject<HTMLElement | null>;
}

export const Modal = ({
  children,
  titleId,
  descriptionId,
  className = '',
  pending,
  onDismiss,
  initialFocusRef,
}: ModalProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current!;
    const returnFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    initialFocusRef.current?.focus();

    return () => {
      dialog.close();
      if (returnFocus?.isConnected) returnFocus.focus();
    };
  }, [initialFocusRef]);

  return (
    <dialog
      ref={dialogRef}
      className={`${styles.modal} ${className}`}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onDismiss();
      }}
      onClick={(event) => {
        if (pending || event.target !== event.currentTarget) return;
        const box = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < box.left ||
          event.clientX > box.right ||
          event.clientY < box.top ||
          event.clientY > box.bottom
        )
          onDismiss();
      }}
    >
      {children}
    </dialog>
  );
};
