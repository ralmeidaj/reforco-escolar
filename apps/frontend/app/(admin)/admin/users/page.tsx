'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';
import { Spinner } from '@/app/components/Spinner';
import { cn } from '@/app/lib/utils';

interface User {
  id: string; name: string; email: string; role: string;
  birthDate?: string | null; address?: string | null; notes?: string | null; paymentDay?: number | null;
}
interface Subject { id: string; name: string; color: string }

type Tab = 'teachers' | 'students' | 'guardians';

const TAB_ROLES: Record<Tab, string> = {
  teachers: 'teacher',
  students: 'student',
  guardians: 'guardian',
};

const TAB_LABELS: Record<Tab, string> = {
  teachers: 'Professores',
  students: 'Alunos',
  guardians: 'Responsáveis',
};

const TAB_INVITE_ROLE: Record<Tab, string> = {
  teachers: 'teacher',
  students: 'student',
  guardians: 'guardian',
};

interface TeacherSubjectLink { id: string; subject: Subject }
interface GuardianStudentLink { id: string; student: { id: string; name: string } }

export default function UsersPage() {
  const [tab, setTab] = useState<Tab>('teachers');
  const [users, setUsers] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  // mapa teacherId → disciplinas já vinculadas
  const [linkedMap, setLinkedMap] = useState<Record<string, TeacherSubjectLink[]>>({});
  // mapa guardianId → alunos já vinculados
  const [guardianLinkedMap, setGuardianLinkedMap] = useState<Record<string, GuardianStudentLink[]>>({});

  // Modal de vínculo professor ↔ disciplina
  const [linkModal, setLinkModal] = useState<{ teacher: User } | null>(null);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState('');

  // Modal de vínculo responsável ↔ aluno
  const [guardianLinkModal, setGuardianLinkModal] = useState<{ guardian: User } | null>(null);
  const [selectedStudentForLink, setSelectedStudentForLink] = useState('');
  const [linkingStudent, setLinkingStudent] = useState(false);
  const [linkStudentError, setLinkStudentError] = useState('');

  // Modal de convite
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteError, setInviteError] = useState('');

  // Modal de cadastro direto
  const [registerModal, setRegisterModal] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    name: '', email: '', password: '', birthDate: '', address: '', notes: '', paymentDay: '',
  });
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState('');

  // Modal de edição
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: '', birthDate: '', address: '', notes: '', paymentDay: '' });
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState('');

  // Modal de exclusão
  const [deleteModal, setDeleteModal] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  async function loadTeacherSubjects(teachers: User[]) {
    const entries = await Promise.all(
      teachers.map((t) =>
        api.get<TeacherSubjectLink[]>(`/teacher-subjects?teacherId=${t.id}`)
          .then(({ data }) => [t.id, data] as const)
          .catch(() => [t.id, []] as const),
      ),
    );
    setLinkedMap(Object.fromEntries(entries));
  }

  async function loadGuardianStudents(guardians: User[]) {
    const entries = await Promise.all(
      guardians.map((g) =>
        api.get<GuardianStudentLink[]>(`/guardian-students?guardianId=${g.id}`)
          .then(({ data }) => [g.id, data] as const)
          .catch(() => [g.id, []] as const),
      ),
    );
    setGuardianLinkedMap(Object.fromEntries(entries));
  }

  useEffect(() => {
    setLoading(true);
    setLinkedMap({});
    setGuardianLinkedMap({});
    Promise.all([
      api.get<User[]>(`/auth/users?role=${TAB_ROLES[tab]}`),
      api.get<Subject[]>('/subjects'),
      tab === 'guardians' ? api.get<User[]>('/auth/users?role=student') : Promise.resolve(null),
    ])
      .then(([usersRes, subjectsRes, studentsRes]) => {
        setUsers(usersRes.data);
        setSubjects(subjectsRes.data);
        if (tab === 'teachers') loadTeacherSubjects(usersRes.data);
        if (tab === 'guardians' && studentsRes) {
          setAllStudents(studentsRes.data);
          loadGuardianStudents(usersRes.data);
        }
      })
      .finally(() => setLoading(false));
  }, [tab]);

  async function handleLink() {
    if (!linkModal || !selectedSubject) return;
    setLinkError('');
    setLinking(true);
    try {
      await api.post('/teacher-subjects', {
        teacherId: linkModal.teacher.id,
        subjectId: selectedSubject,
      });
      // atualiza o mapa local sem recarregar tudo
      const newLink: TeacherSubjectLink = {
        id: '',
        subject: subjects.find((s) => s.id === selectedSubject)!,
      };
      setLinkedMap((prev) => ({
        ...prev,
        [linkModal.teacher.id]: [...(prev[linkModal.teacher.id] ?? []), newLink],
      }));
      setLinkModal(null);
      setSelectedSubject('');
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'Erro ao vincular disciplina';
      setLinkError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLinking(false);
    }
  }

  async function handleUnlink(teacherId: string, linkId: string) {
    try {
      await api.delete(`/teacher-subjects/${linkId}`);
      setLinkedMap((prev) => ({
        ...prev,
        [teacherId]: (prev[teacherId] ?? []).filter((l) => l.id !== linkId),
      }));
    } catch {}
  }

  async function handleLinkStudent() {
    if (!guardianLinkModal || !selectedStudentForLink) return;
    setLinkStudentError('');
    setLinkingStudent(true);
    try {
      const { data } = await api.post<{ id: string }>('/guardian-students', {
        guardianId: guardianLinkModal.guardian.id,
        studentId: selectedStudentForLink,
      });
      const newLink: GuardianStudentLink = {
        id: data.id,
        student: allStudents.find((s) => s.id === selectedStudentForLink)!,
      };
      setGuardianLinkedMap((prev) => ({
        ...prev,
        [guardianLinkModal.guardian.id]: [...(prev[guardianLinkModal.guardian.id] ?? []), newLink],
      }));
      setGuardianLinkModal(null);
      setSelectedStudentForLink('');
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'Erro ao vincular aluno';
      setLinkStudentError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLinkingStudent(false);
    }
  }

  async function handleUnlinkStudent(guardianId: string, linkId: string) {
    try {
      await api.delete(`/guardian-students/${linkId}`);
      setGuardianLinkedMap((prev) => ({
        ...prev,
        [guardianId]: (prev[guardianId] ?? []).filter((l) => l.id !== linkId),
      }));
    } catch {}
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');
    setInviting(true);
    try {
      await api.post('/auth/invite', { email: inviteEmail, role: TAB_INVITE_ROLE[tab] });
      setInviteSuccess(`Convite enviado para ${inviteEmail}`);
      setInviteEmail('');
    } catch (err: any) {
      const msg = Array.isArray(err.response?.data?.message)
        ? err.response.data.message.join(', ')
        : (err.response?.data?.message ?? 'Erro ao enviar convite');
      setInviteError(msg);
    } finally {
      setInviting(false);
    }
  }

  function closeInviteModal() {
    setInviteModal(false);
    setInviteEmail('');
    setInviteError('');
    setInviteSuccess('');
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegisterError('');
    setRegistering(true);
    try {
      await api.post('/auth/users', {
        name: registerForm.name,
        email: registerForm.email,
        password: registerForm.password,
        role: TAB_INVITE_ROLE[tab],
        birthDate: registerForm.birthDate || undefined,
        address: registerForm.address || undefined,
        ...(tab === 'students' ? { notes: registerForm.notes || undefined } : {}),
        ...(tab === 'guardians' && registerForm.paymentDay ? { paymentDay: Number(registerForm.paymentDay) } : {}),
      });
      setRegisterModal(false);
      setRegisterForm({ name: '', email: '', password: '', birthDate: '', address: '', notes: '', paymentDay: '' });
      setLoading(true);
      api.get<User[]>(`/auth/users?role=${TAB_ROLES[tab]}`).then(({ data }) => setUsers(data)).finally(() => setLoading(false));
    } catch (err: any) {
      const msg = Array.isArray(err.response?.data?.message)
        ? err.response.data.message.join(', ')
        : (err.response?.data?.message ?? 'Erro ao cadastrar');
      setRegisterError(msg);
    } finally {
      setRegistering(false);
    }
  }

  function openEditModal(u: User) {
    setEditUser(u);
    setEditForm({
      name: u.name,
      birthDate: u.birthDate ?? '',
      address: u.address ?? '',
      notes: u.notes ?? '',
      paymentDay: u.paymentDay != null ? String(u.paymentDay) : '',
    });
    setEditError('');
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setEditError('');
    setEditing(true);
    try {
      const { data } = await api.patch<User>(`/auth/users/${editUser.id}`, {
        name: editForm.name,
        birthDate: editForm.birthDate || undefined,
        address: editForm.address || undefined,
        ...(editUser.role === 'student' ? { notes: editForm.notes || undefined } : {}),
        ...(editUser.role === 'guardian' && editForm.paymentDay ? { paymentDay: Number(editForm.paymentDay) } : {}),
      });
      setUsers((prev) => prev.map((u) => (u.id === editUser.id ? { ...u, ...data } : u)));
      setEditUser(null);
    } catch (err: any) {
      const msg = Array.isArray(err.response?.data?.message)
        ? err.response.data.message.join(', ')
        : (err.response?.data?.message ?? 'Erro ao salvar');
      setEditError(msg);
    } finally {
      setEditing(false);
    }
  }

  async function handleDeleteUser() {
    if (!deleteModal) return;
    setDeleteError('');
    setDeleting(true);
    try {
      await api.delete(`/auth/users/${deleteModal.id}`);
      setUsers((prev) => prev.filter((u) => u.id !== deleteModal.id));
      setDeleteModal(null);
    } catch (err: any) {
      const msg = Array.isArray(err.response?.data?.message)
        ? err.response.data.message.join(', ')
        : (err.response?.data?.message ?? 'Erro ao excluir usuário');
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="mt-1 text-sm text-gray-500">Professores, alunos e responsáveis</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setRegisterModal(true); setRegisterError(''); }}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            + Cadastrar
          </button>
          <button
            onClick={() => setInviteModal(true)}
            className="rounded-lg border border-brand-300 px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50"
          >
            Convidar por e-mail
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {(['teachers', 'students', 'guardians'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-lg px-4 py-1.5 text-sm font-medium transition-all',
              tab === t
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Spinner size="lg" className="text-brand-600" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-400">Nenhum {TAB_LABELS[tab].toLowerCase().slice(0, -1)} cadastrado ainda.</p>
            <p className="mt-1 text-xs text-gray-400">
              Clique em &quot;+ Convidar&quot; para enviar um convite por e-mail.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {users.map((u) => (
              <li key={u.id} className="px-5 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                    {tab === 'teachers' && (linkedMap[u.id] ?? []).length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {(linkedMap[u.id] ?? []).map((l) => (
                          <span key={l.id} className="inline-flex items-center gap-1 rounded-full bg-brand-50 border border-brand-200 px-2 py-0.5 text-xs text-brand-700">
                            {l.subject.name}
                            <button
                              onClick={() => handleUnlink(u.id, l.id)}
                              className="ml-0.5 text-brand-400 hover:text-red-500 font-bold leading-none"
                              title="Remover vínculo"
                            >×</button>
                          </span>
                        ))}
                      </div>
                    )}
                    {tab === 'guardians' && (guardianLinkedMap[u.id] ?? []).length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {(guardianLinkedMap[u.id] ?? []).map((l) => (
                          <span key={l.id} className="inline-flex items-center gap-1 rounded-full bg-brand-50 border border-brand-200 px-2 py-0.5 text-xs text-brand-700">
                            {l.student.name}
                            <button
                              onClick={() => handleUnlinkStudent(u.id, l.id)}
                              className="ml-0.5 text-brand-400 hover:text-red-500 font-bold leading-none"
                              title="Remover vínculo"
                            >×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {tab === 'teachers' && (
                      <button
                        onClick={() => { setLinkModal({ teacher: u }); setLinkError(''); setSelectedSubject(''); }}
                        className="rounded-lg border border-brand-200 px-3 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
                      >
                        + Disciplina
                      </button>
                    )}
                    {tab === 'guardians' && (
                      <button
                        onClick={() => { setGuardianLinkModal({ guardian: u }); setLinkStudentError(''); setSelectedStudentForLink(''); }}
                        className="rounded-lg border border-brand-200 px-3 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
                      >
                        + Aluno
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(u)}
                      className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => { setDeleteModal(u); setDeleteError(''); }}
                      className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal de cadastro direto */}
      {registerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">
              Cadastrar {TAB_LABELS[tab].slice(0, -1)}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              O acesso é criado imediatamente, sem precisar de convite.
            </p>
            <form onSubmit={handleRegister} className="mt-4 space-y-3">
              {registerError && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{registerError}</div>
              )}
              <input
                required
                disabled={registering}
                value={registerForm.name}
                onChange={(e) => setRegisterForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Nome completo"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
              />
              <input
                type="email"
                required
                disabled={registering}
                value={registerForm.email}
                onChange={(e) => setRegisterForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="E-mail"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
              />
              <input
                type="password"
                required
                minLength={6}
                disabled={registering}
                value={registerForm.password}
                onChange={(e) => setRegisterForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="Senha provisória (mín. 6 caracteres)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
              />
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Data de nascimento (opcional)</label>
                <input
                  type="date"
                  disabled={registering}
                  value={registerForm.birthDate}
                  onChange={(e) => setRegisterForm((p) => ({ ...p, birthDate: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Endereço completo (opcional)</label>
                <input
                  disabled={registering}
                  value={registerForm.address}
                  onChange={(e) => setRegisterForm((p) => ({ ...p, address: e.target.value }))}
                  placeholder="Rua, número, bairro, cidade"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
                />
              </div>
              {tab === 'students' && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Observação — onde precisa melhorar (opcional)</label>
                  <textarea
                    rows={2}
                    disabled={registering}
                    value={registerForm.notes}
                    onChange={(e) => setRegisterForm((p) => ({ ...p, notes: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
                  />
                </div>
              )}
              {tab === 'guardians' && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Dia fixo de pagamento (opcional)</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    disabled={registering}
                    value={registerForm.paymentDay}
                    onChange={(e) => setRegisterForm((p) => ({ ...p, paymentDay: e.target.value }))}
                    placeholder="Ex.: 10"
                    className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
                  />
                </div>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setRegisterModal(false); setRegisterForm({ name: '', email: '', password: '', birthDate: '', address: '', notes: '', paymentDay: '' }); }}
                  className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {registering ? <><Spinner size="sm" className="text-white" /> Cadastrando...</> : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de convite */}
      {inviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">Convidar usuário</h3>
            <p className="mt-1 text-sm text-gray-500">
              O papel será: <strong>{TAB_LABELS[tab].slice(0, -1)}</strong>
            </p>

            {inviteSuccess ? (
              <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                {inviteSuccess}
              </div>
            ) : (
              <form onSubmit={handleInvite} className="mt-4 space-y-3">
                {inviteError && (
                  <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{inviteError}</div>
                )}
                <input
                  type="email"
                  required
                  disabled={inviting}
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:opacity-60"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeInviteModal}
                    className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={inviting}
                    className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {inviting ? <><Spinner size="sm" className="text-white" /> Enviando...</> : 'Enviar convite'}
                  </button>
                </div>
              </form>
            )}

            {inviteSuccess && (
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setInviteSuccess('')}
                  className="rounded-lg px-4 py-2 text-sm text-brand-600 hover:bg-brand-50"
                >
                  Enviar outro
                </button>
                <button
                  onClick={closeInviteModal}
                  className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de vínculo */}
      {linkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">
              Vincular disciplina — {linkModal.teacher.name}
            </h3>
            {linkError && (
              <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{linkError}</div>
            )}
            {(() => {
              const alreadyLinked = (linkedMap[linkModal.teacher.id] ?? []).map((l) => l.subject.id);
              const available = subjects.filter((s) => !alreadyLinked.includes(s.id));
              return available.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500">Todas as disciplinas já estão vinculadas a este professor.</p>
              ) : (
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">Selecione uma disciplina</option>
                  {available.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              );
            })()}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setLinkModal(null)}
                className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleLink}
                disabled={!selectedSubject || linking}
                className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {linking ? <><Spinner size="sm" className="text-white" /> Vinculando...</> : 'Vincular'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de vínculo responsável ↔ aluno */}
      {guardianLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">
              Vincular aluno — {guardianLinkModal.guardian.name}
            </h3>
            {linkStudentError && (
              <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{linkStudentError}</div>
            )}
            {(() => {
              const alreadyLinked = (guardianLinkedMap[guardianLinkModal.guardian.id] ?? []).map((l) => l.student.id);
              const available = allStudents.filter((s) => !alreadyLinked.includes(s.id));
              return available.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500">
                  {allStudents.length === 0 ? 'Nenhum aluno cadastrado ainda.' : 'Todos os alunos já estão vinculados a este responsável.'}
                </p>
              ) : (
                <select
                  value={selectedStudentForLink}
                  onChange={(e) => setSelectedStudentForLink(e.target.value)}
                  className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">Selecione um aluno</option>
                  {available.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              );
            })()}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setGuardianLinkModal(null)}
                className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleLinkStudent}
                disabled={!selectedStudentForLink || linkingStudent}
                className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {linkingStudent ? <><Spinner size="sm" className="text-white" /> Vinculando...</> : 'Vincular'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de edição */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">Editar {editUser.name}</h3>
            <p className="mt-1 text-sm text-gray-500">{editUser.email}</p>
            <form onSubmit={handleUpdateUser} className="mt-4 space-y-3">
              {editError && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{editError}</div>
              )}
              <input
                required
                disabled={editing}
                value={editForm.name}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Nome completo"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
              />
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Data de nascimento</label>
                <input
                  type="date"
                  disabled={editing}
                  value={editForm.birthDate}
                  onChange={(e) => setEditForm((p) => ({ ...p, birthDate: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Endereço completo</label>
                <input
                  disabled={editing}
                  value={editForm.address}
                  onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
                  placeholder="Rua, número, bairro, cidade"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
                />
              </div>
              {editUser.role === 'student' && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Observação — onde precisa melhorar</label>
                  <textarea
                    rows={2}
                    disabled={editing}
                    value={editForm.notes}
                    onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
                  />
                </div>
              )}
              {editUser.role === 'guardian' && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Dia fixo de pagamento</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    disabled={editing}
                    value={editForm.paymentDay}
                    onChange={(e) => setEditForm((p) => ({ ...p, paymentDay: e.target.value }))}
                    placeholder="Ex.: 10"
                    className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
                  />
                </div>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editing}
                  className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {editing ? <><Spinner size="sm" className="text-white" /> Salvando...</> : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de exclusão */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">Excluir {deleteModal.name}?</h3>
            <p className="mt-2 text-sm text-gray-500">
              O usuário perde o acesso ao sistema imediatamente. Matrículas, pagamentos e mensagens já registrados são preservados no histórico.
            </p>
            {deleteError && (
              <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{deleteError}</div>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                disabled={deleting}
                className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={deleting}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {deleting ? <><Spinner size="sm" className="text-white" /> Excluindo...</> : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
