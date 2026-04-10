import AdminLayout from '../../components/admin/AdminLayout';
import NotesPanel from '../../components/admin/NotesPanel';

export default function NotesPage() {
  return (
    <AdminLayout
      pageTitle="Admin Notes"
      breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Notes' }]}
    >
      <div className="p-6 max-w-3xl mx-auto">
        <p className="text-sm text-gray-500 mb-6">
          Global notes visible to all admin staff. Use these for reminders, action items, and team communications.
        </p>
        <NotesPanel title="Global Notes" />
      </div>
    </AdminLayout>
  );
}
