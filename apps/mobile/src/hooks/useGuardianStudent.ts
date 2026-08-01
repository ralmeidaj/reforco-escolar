import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export interface GuardianStudent { id: string; name: string; }

export function useGuardianStudent() {
  const [students, setStudents] = useState<GuardianStudent[]>([]);
  const [selected, setSelected] = useState<GuardianStudent | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(true);

  useEffect(() => {
    api.get<GuardianStudent[]>('/guardian/students')
      .then(({ data }) => {
        setStudents(data);
        if (data.length > 0) setSelected(data[0]);
      })
      .catch(() => {})
      .finally(() => setLoadingStudents(false));
  }, []);

  return { students, selected, setSelected, loadingStudents };
}
