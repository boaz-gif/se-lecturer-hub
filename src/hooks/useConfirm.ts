import { useState, useCallback } from 'react';

export function useConfirm() {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const requestConfirm = useCallback((id: string) => {
    setConfirmId(id);
  }, []);

  const cancelConfirm = useCallback(() => {
    setConfirmId(null);
  }, []);

  const isConfirming = (id: string) => confirmId === id;

  return { confirmId, requestConfirm, cancelConfirm, isConfirming };
}
