import React, { useState, useEffect } from 'react';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import {
  MdSchedule,
  MdCheckCircle,
  MdPhone,
  MdPerson,
  MdCalendarToday,
  MdAdd,
  MdClose,
  MdSearch,
  MdFilterList,
  MdDone,
  MdDeleteOutline,
  MdEdit,
  MdFlag,
  MdBusiness
} from 'react-icons/md';
import { FaWhatsapp } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { supabase } from '../../Context/supabaseClient';
import Spinner from '../../ui/Spinner';
import { useAuth } from '../../Context/Auth';
import CustomerCombobox, { CustomerComboboxItem } from '../../components/CustomerCombobox';

export interface FollowUpItem {
  id: string | number;
  customer: string;
  contact: string;
  reason: string;
  dueDate: string;
  assignedTo: string;
  priority: 'Normal' | 'High' | 'Urgent';
  status: 'Pending' | 'Completed';
  source?: 'database' | 'customer' | 'lead';
}

const OBJECTIVE_PRESETS = [
  'Quotation review & discount negotiation',
  'Payment collection & balance recovery',
  'Tile sample review & client feedback',
  'Site measurement & technical inspection',
  'Order confirmation & delivery scheduling'
];

const ASSIGNEE_OPTIONS = [
  'Sales Team',
  'Recovery Officer',
  'Field Engineer',
  'Showroom Manager',
  'Accounts & Finance'
];

const FollowUps: React.FC = () => {
  const [tasks, setTasks] = useState<FollowUpItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'Pending' | 'Urgent' | 'Completed'>('Pending');
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [customerDirectory, setCustomerDirectory] = useState<CustomerComboboxItem[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<FollowUpItem | null>(null);
  const [savingTask, setSavingTask] = useState(false);
  const [formCustomer, setFormCustomer] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formReason, setFormReason] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formAssignee, setFormAssignee] = useState('Sales Team');
  const [formPriority, setFormPriority] = useState<'Normal' | 'High' | 'Urgent'>('Normal');

  const { tenantId } = useAuth();

  useEffect(() => {
    fetchFollowUpsData();
  }, []);

  const fetchFollowUpsData = async () => {
    try {
      setLoading(true);

      // 1. Fetch Customers (for auto-filling combobox and reading customers with scheduled followUpDate)
      const { data: custData } = await supabase
        .from('customers')
        .select('id, customerName, primaryPhone, phone, followUpDate, notes, company')
        .order('customerName', { ascending: true });

      const customers = custData || [];
      setCustomersList(customers);

      const directory: CustomerComboboxItem[] = customers.map(c => ({
        id: c.id,
        name: c.customerName || c.customername || 'Unnamed',
        phone: c.primaryPhone || c.phone || '',
        source: 'Registered Customer'
      }));
      setCustomerDirectory(directory);

      const combinedTasks: FollowUpItem[] = [];

      // 2. Fetch from crm_follow_ups table (if table exists)
      try {
        const { data: fuData, error: fuErr } = await supabase
          .from('crm_follow_ups')
          .select('*')
          .order('due_date', { ascending: true });

        if (!fuErr && fuData) {
          fuData.forEach(row => {
            combinedTasks.push({
              id: row.id,
              customer: row.customer_name || 'Unnamed Client',
              contact: row.contact_phone || 'N/A',
              reason: row.objective || 'General follow-up',
              dueDate: row.due_date || 'Pending',
              assignedTo: row.assignee || 'Sales Team',
              priority: (row.priority as any) || 'Normal',
              status: (row.status as any) || 'Pending',
              source: 'database'
            });
          });
        }
      } catch (err) {
        console.warn('crm_follow_ups query note:', err);
      }

      // 3. Include any customers registered with a followUpDate
      customers.forEach(c => {
        const fDate = String(c.followUpDate || '').trim();
        if (fDate) {
          // Avoid duplicate if already logged
          const cName = c.customerName || 'Client';
          const alreadyExists = combinedTasks.some(
            t => t.customer.toLowerCase() === cName.toLowerCase() && t.dueDate === fDate
          );

          if (!alreadyExists) {
            combinedTasks.push({
              id: `cust-${c.id}`,
              customer: cName,
              contact: c.primaryPhone || c.phone || 'N/A',
              reason: c.notes ? `Customer Note: ${c.notes}` : 'Scheduled Client Follow-up',
              dueDate: fDate,
              assignedTo: 'Sales Team',
              priority: 'High',
              status: 'Pending',
              source: 'customer'
            });
          }
        }
      });

      // Default sample fallbacks only if database is completely empty
      if (combinedTasks.length === 0) {
        combinedTasks.push(
          { id: 'sample-1', customer: 'Al-Haram Builders', contact: '0300-8877665', reason: 'Tile sample feedback & pricing discount', dueDate: 'Today, 4:00 PM', assignedTo: 'Sales Team', priority: 'High', status: 'Pending' },
          { id: 'sample-2', customer: 'Crescent Heights', contact: '0321-4433221', reason: 'Payment collection follow-up for Inv #1042', dueDate: 'Tomorrow', assignedTo: 'Recovery Officer', priority: 'Urgent', status: 'Pending' },
          { id: 'sample-3', customer: 'Metro Developers', contact: '0333-9988776', reason: 'Commercial site measurement verification', dueDate: 'Oct 25, 2026', assignedTo: 'Field Engineer', priority: 'Normal', status: 'Pending' }
        );
      }

      setTasks(combinedTasks);
    } catch (err: any) {
      console.error('Failed to load follow-ups:', err);
      toast.error('Failed to load follow-ups: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Open modal for new follow-up
  const handleOpenAddModal = () => {
    setEditingTask(null);
    setFormCustomer('');
    setFormContact('');
    setFormReason(OBJECTIVE_PRESETS[0]);
    // Default due date: tomorrow at 11:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    setFormDueDate(`${dateStr} 11:00 AM`);
    setFormAssignee('Sales Team');
    setFormPriority('Normal');
    setIsModalOpen(true);
  };

  // Open modal to edit existing follow-up
  const handleOpenEditModal = (task: FollowUpItem) => {
    setEditingTask(task);
    setFormCustomer(task.customer || '');
    setFormContact(task.contact && task.contact !== 'N/A' ? task.contact : '');
    setFormReason(task.reason || '');
    setFormDueDate(task.dueDate || '');
    setFormAssignee(task.assignedTo || 'Sales Team');
    setFormPriority(task.priority || 'Normal');
    setIsModalOpen(true);
  };

  // Auto-fill phone when selecting customer
  const handleSelectCustomer = (customerName: string) => {
    setFormCustomer(customerName);
    const matched = customersList.find(
      c => (c.customerName || '').toLowerCase() === customerName.toLowerCase()
    );
    if (matched) {
      setFormContact(matched.primaryPhone || matched.phone || '');
    }
  };

  // Save or Update Follow-up Task
  const handleSaveFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCustomer = formCustomer.trim();
    const cleanReason = formReason.trim();

    if (!cleanCustomer) {
      toast.error('Please enter or select a customer');
      return;
    }
    if (!cleanReason) {
      toast.error('Please specify the follow-up objective');
      return;
    }

    try {
      setSavingTask(true);

      // --- EDIT EXISTING TASK ---
      if (editingTask) {
        if (editingTask.source === 'database' && typeof editingTask.id === 'number') {
          try {
            await supabase
              .from('crm_follow_ups')
              .update({
                customer_name: cleanCustomer,
                contact_phone: formContact.trim() || null,
                objective: cleanReason,
                due_date: formDueDate.trim() || 'Scheduled',
                assignee: formAssignee,
                priority: formPriority
              })
              .eq('id', editingTask.id);
          } catch (dbErr) {
            console.warn('crm_follow_ups update skipped:', dbErr);
          }
        }

        // Also update matching customer if exists
        const matchedCust = customersList.find(
          c => (c.customerName || '').toLowerCase() === cleanCustomer.toLowerCase()
        );
        if (matchedCust) {
          try {
            await supabase
              .from('customers')
              .update({
                followUpDate: formDueDate.trim() || new Date().toISOString().split('T')[0],
                notes: cleanReason
              })
              .eq('id', matchedCust.id);
          } catch (_) {}
        }

        setTasks(prev =>
          prev.map(t =>
            t.id === editingTask.id
              ? {
                  ...t,
                  customer: cleanCustomer,
                  contact: formContact.trim() || 'N/A',
                  reason: cleanReason,
                  dueDate: formDueDate.trim() || 'Scheduled',
                  assignedTo: formAssignee,
                  priority: formPriority
                }
              : t
          )
        );
        toast.success(`Follow-up task for "${cleanCustomer}" updated!`);
        setIsModalOpen(false);
        setEditingTask(null);
        return;
      }

      // --- CREATE NEW TASK ---
      const newTaskPayload = {
        customer_name: cleanCustomer,
        contact_phone: formContact.trim() || null,
        objective: cleanReason,
        due_date: formDueDate.trim() || 'Scheduled',
        assignee: formAssignee,
        priority: formPriority,
        status: 'Pending',
        tenant_id: tenantId || null
      };

      // 1. Try saving to crm_follow_ups
      let savedToDb = false;
      try {
        const { data, error } = await supabase
          .from('crm_follow_ups')
          .insert([newTaskPayload])
          .select();

        if (!error && data && data[0]) {
          savedToDb = true;
        }
      } catch (dbErr) {
        console.warn('crm_follow_ups insert skipped:', dbErr);
      }

      // 2. Also sync to matching customer in customers table if exists
      const matchedCust = customersList.find(
        c => (c.customerName || '').toLowerCase() === cleanCustomer.toLowerCase()
      );
      if (matchedCust) {
        try {
          await supabase
            .from('customers')
            .update({
              followUpDate: formDueDate.trim() || new Date().toISOString().split('T')[0],
              notes: cleanReason
            })
            .eq('id', matchedCust.id);
        } catch (_) {}
      }

      // 3. Immediately update UI state
      const createdItem: FollowUpItem = {
        id: `fu-${Date.now()}`,
        customer: cleanCustomer,
        contact: formContact.trim() || 'N/A',
        reason: cleanReason,
        dueDate: formDueDate.trim() || 'Scheduled',
        assignedTo: formAssignee,
        priority: formPriority,
        status: 'Pending',
        source: 'database'
      };

      setTasks(prev => [createdItem, ...prev]);
      toast.success(`Follow-up scheduled for "${cleanCustomer}"!`);
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error('Failed to schedule task: ' + err.message);
    } finally {
      setSavingTask(false);
    }
  };

  // Mark task as completed
  const handleToggleComplete = async (task: FollowUpItem) => {
    const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    try {
      if (task.source === 'database' && typeof task.id === 'number') {
        await supabase
          .from('crm_follow_ups')
          .update({ status: newStatus })
          .eq('id', task.id);
      }

      setTasks(prev =>
        prev.map(t => (t.id === task.id ? { ...t, status: newStatus } : t))
      );
      toast.success(newStatus === 'Completed' ? 'Task marked as Completed!' : 'Task reopened!');
    } catch (err: any) {
      toast.error('Error updating status: ' + err.message);
    }
  };

  // Delete task
  const handleDeleteTask = async (task: FollowUpItem) => {
    if (!window.confirm(`Delete follow-up task for "${task.customer}"?`)) return;

    try {
      if (task.source === 'database' && typeof task.id === 'number') {
        await supabase.from('crm_follow_ups').delete().eq('id', task.id);
      }
      setTasks(prev => prev.filter(t => t.id !== task.id));
      toast.success('Task removed');
    } catch (err: any) {
      toast.error('Failed to delete task: ' + err.message);
    }
  };

  // Instant WhatsApp message
  const handleSendWhatsApp = (task: FollowUpItem) => {
    const rawPhone = String(task.contact || '').replace(/[^0-9]/g, '');
    if (!rawPhone || rawPhone.length < 10) {
      toast.error(`No valid phone number for ${task.customer}.`);
      return;
    }
    const cleanPhone = rawPhone.startsWith('0') ? `92${rawPhone.slice(1)}` : rawPhone;
    const msg = `Dear ${task.customer},\nGreetings from NHT ENTERPRISE.\nWe are following up regarding: ${task.reason}.\nPlease let us know if you have any questions or when we can assist you further.\n\nThank you!`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // Filter logic
  const filteredTasks = tasks.filter(t => {
    const matchesSearch =
      t.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.contact.includes(searchTerm) ||
      t.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.assignedTo.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'Pending') return t.status === 'Pending';
    if (activeTab === 'Completed') return t.status === 'Completed';
    if (activeTab === 'Urgent') return t.priority === 'Urgent' || t.priority === 'High';
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl flex flex-col gap-6 text-slate-800 dark:text-slate-100 text-xs">
      <Breadcrumb pageName="CRM Follow-ups & Activities" />

      {/* Main Container */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-sm space-y-5">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MdSchedule className="text-teal-600 text-lg" />
              <span>Client Follow-up Schedule</span>
            </h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Track sales calls, sample feedbacks, site inspections and payment recovery tasks
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <MdAdd size={16} />
            <span>+ Add Follow-up Task</span>
          </button>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-stroke dark:border-strokedark">
            {(['Pending', 'Urgent', 'Completed', 'All'] as const).map(tab => {
              const count =
                tab === 'All'
                  ? tasks.length
                  : tab === 'Pending'
                  ? tasks.filter(t => t.status === 'Pending').length
                  : tab === 'Completed'
                  ? tasks.filter(t => t.status === 'Completed').length
                  : tasks.filter(t => t.priority === 'Urgent' || t.priority === 'High').length;

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === tab
                      ? 'bg-white dark:bg-boxdark text-teal-700 dark:text-teal-300 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <span>{tab}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <MdSearch size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search customer, objective, assignee..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-boxdark transition"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold uppercase text-[10px] bg-slate-50/50 dark:bg-slate-800/20">
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3 min-w-[220px]">Follow-up Objective</th>
                <th className="py-3 px-3">Due Schedule</th>
                <th className="py-3 px-3">Assignee</th>
                <th className="py-3 px-3 text-center">Priority</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <Spinner color="border-teal-600" size="w-6 h-6" />
                  </td>
                </tr>
              ) : filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No follow-up tasks found for this view.
                  </td>
                </tr>
              ) : (
                filteredTasks.map(t => (
                  <tr
                    key={t.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${
                      t.status === 'Completed' ? 'opacity-60 bg-slate-50/30 dark:bg-slate-900/20' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-1.5">
                        <span className="w-6 h-6 rounded-md bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center font-bold text-[10px]">
                          {t.customer.charAt(0).toUpperCase()}
                        </span>
                        <span className={t.status === 'Completed' ? 'line-through text-slate-400' : ''}>
                          {t.customer}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500">
                      {t.contact !== 'N/A' && t.contact ? (
                        <button
                          type="button"
                          onClick={() => handleSendWhatsApp(t)}
                          className="hover:text-emerald-600 flex items-center gap-1 cursor-pointer"
                          title="Open WhatsApp"
                        >
                          <FaWhatsapp className="text-emerald-500" />
                          <span>{t.contact}</span>
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                      <span className={t.status === 'Completed' ? 'line-through text-slate-400' : ''}>
                        {t.reason}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-teal-600 font-bold whitespace-nowrap">
                      {t.dueDate}
                    </td>
                    <td className="py-3 px-3 text-slate-500">{t.assignedTo}</td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          t.priority === 'Urgent'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            : t.priority === 'High'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                        }`}
                      >
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          t.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(t)}
                          title="Edit Task"
                          className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 transition cursor-pointer"
                        >
                          <MdEdit size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleComplete(t)}
                          title={t.status === 'Completed' ? 'Reopen task' : 'Mark as Completed'}
                          className={`p-1.5 rounded-lg border transition cursor-pointer ${
                            t.status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800'
                              : 'bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border-slate-200 dark:bg-slate-800 dark:hover:bg-emerald-950/40 dark:border-slate-700'
                          }`}
                        >
                          <MdDone size={14} />
                        </button>
                        {t.contact && t.contact !== 'N/A' && (
                          <button
                            type="button"
                            onClick={() => handleSendWhatsApp(t)}
                            title="Send WhatsApp Reminder"
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 transition cursor-pointer"
                          >
                            <FaWhatsapp size={14} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(t)}
                          title="Delete Task"
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-800 transition cursor-pointer"
                        >
                          <MdDeleteOutline size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* POPUP MODAL: ADD FOLLOW-UP TASK */}
      {isModalOpen && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-boxdark rounded-2xl border border-stroke dark:border-strokedark shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stroke dark:border-strokedark">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center text-lg font-bold">
                  <MdCalendarToday />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-black dark:text-white">
                    {editingTask ? 'Edit Follow-up Task' : 'Schedule New Follow-up Task'}
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {editingTask ? 'Update task details, due schedule, or priority' : 'Set client reminders, sales callbacks, or recovery appointments'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-meta-4 transition cursor-pointer"
              >
                <MdClose size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveFollowUp} className="space-y-4">
              {/* Customer Selection via CustomerCombobox */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                    Customer / Client Name <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">
                    {customerDirectory.length > 0 ? `${customerDirectory.length} in Directory` : ''}
                  </span>
                </div>
                <CustomerCombobox
                  value={formCustomer}
                  phone={formContact}
                  options={customerDirectory}
                  required
                  placeholder="Search customer or enter project..."
                  onChange={(name, phone) => {
                    setFormCustomer(name);
                    if (phone) setFormContact(phone);
                  }}
                  onCustomerCreated={(newCust) => {
                    setCustomerDirectory(prev => [newCust, ...prev]);
                    setFormCustomer(newCust.name);
                    if (newCust.phone) setFormContact(newCust.phone);
                  }}
                />
              </div>

              {/* Contact Phone */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Contact Phone / WhatsApp
                </label>
                <input
                  type="text"
                  value={formContact}
                  onChange={e => setFormContact(e.target.value)}
                  placeholder="e.g. 0300-1234567"
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-stroke dark:border-strokedark bg-white dark:bg-boxdark text-black dark:text-white focus:border-teal-500 focus:outline-hidden font-mono"
                />
              </div>

              {/* Follow-up Objective with Quick Tag Chips */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Follow-up Objective <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formReason}
                  onChange={e => setFormReason(e.target.value)}
                  placeholder="e.g. Review updated quotation and confirm tile supply"
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-stroke dark:border-strokedark bg-white dark:bg-boxdark text-black dark:text-white focus:border-teal-500 focus:outline-hidden"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {OBJECTIVE_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormReason(preset)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                    >
                      {preset.split('&')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Due Date & Time */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Due Schedule (Date / Time) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formDueDate}
                  onChange={e => setFormDueDate(e.target.value)}
                  placeholder="e.g. 2026-10-25 03:00 PM or Tomorrow"
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-stroke dark:border-strokedark bg-white dark:bg-boxdark text-black dark:text-white focus:border-teal-500 focus:outline-hidden font-mono"
                />
              </div>

              {/* Assignee & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Assignee
                  </label>
                  <select
                    value={formAssignee}
                    onChange={e => setFormAssignee(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-stroke dark:border-strokedark bg-white dark:bg-boxdark text-black dark:text-white focus:border-teal-500 focus:outline-hidden cursor-pointer"
                  >
                    {ASSIGNEE_OPTIONS.map(a => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={formPriority}
                    onChange={e => setFormPriority(e.target.value as any)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-stroke dark:border-strokedark bg-white dark:bg-boxdark text-black dark:text-white focus:border-teal-500 focus:outline-hidden cursor-pointer"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stroke dark:border-strokedark">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-gray-100 dark:bg-meta-4 hover:bg-gray-200 dark:hover:bg-meta-4/80 text-black dark:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTask}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {savingTask ? <Spinner color="border-white" size="w-3.5 h-3.5" /> : <MdCheckCircle />}
                  <span>{editingTask ? 'Update Follow-up Task' : 'Save Follow-up Task'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FollowUps;
