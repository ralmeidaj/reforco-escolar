export default function TeacherDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Painel do Professor</h1>
        <p className="mt-1 text-sm text-gray-500">Suas aulas e alunos de hoje</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Aulas hoje', value: '—' },
          { label: 'Alunos vinculados', value: '—' },
          { label: 'Tarefas pendentes', value: '—' },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-500">{kpi.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-400">Nenhuma aula agendada para hoje.</p>
      </div>
    </div>
  );
}
