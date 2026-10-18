import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../Context/supabaseClient';
import { useAuth } from '../../../Context/Auth';
import Spinner from '../../../ui/Spinner';
import { 
  MdAddCircle, 
  MdPlaylistAdd, 
  MdSearch, 
  MdArrowBack, 
  MdBusiness, 
  MdEvent, 
  MdInventory2 
} from 'react-icons/md';

interface ReceiveGrnModalProps {
  onClose: () => void;
  defaultLocation?: 'WAREHOUSE' | 'SHOP' | 'ALL';
}

const ReceiveGrnModal: React.FC<ReceiveGrnModalProps> = ({ onClose, defaultLocation }) => {
  const navigate = useNavigate();
  const { tenantId } = useAuth();
  const [step, setStep] = useState<'CHOICE' | 'LIST'>('CHOICE');
  const [grns, setGrns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchActiveGrns = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('grn_receipts')
        .select('*, grn_items(*)')
        .neq('status', 'Billed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGrns(data || []);
    } catch (err: any) {
      console.error('Failed to fetch open GRNs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step === 'LIST') {
      fetchActiveGrns();
    }
  }, [step]);

  const handleCreateNew = () => {
    onClose();
    const locParam = defaultLocation && defaultLocation !== 'ALL' ? `?prefLoc=${defaultLocation}` : '';
    navigate(`${tenantId ? `/${tenantId}` : ''}/Purchase/GRN/Add${locParam}`);
  };

  const handleSelectExisting = (grnId: string) => {
    onClose();
    navigate(`${tenantId ? `/${tenantId}` : ''}/Purchase/GRN/Edit/${grnId}`);
  };

  const filteredGrns = grns.filter(g => {
    const q = searchTerm.toLowerCase().trim();
    return (
      (g.grn_no || '').toLowerCase().includes(q) ||
      (g.vendor_name || '').toLowerCase().includes(q) ||
      (g.receipt_date || '').toLowerCase().includes(q)
    );
  });

  if (step === 'CHOICE') {
    return (
      <div className="p-4 sm:p-6 text-black dark:text-white">
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
            <MdInventory2 size={28} />
          </div>
          <h3 className="text-lg font-bold text-black dark:text-white">
            Receive Goods (GRN)
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Choose how you want to record incoming inventory from your supplier
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {/* OPTION 1: CREATE NEW GRN */}
          <div 
            onClick={handleCreateNew}
            className="group cursor-pointer p-5 rounded-xl border-2 border-stroke dark:border-strokedark hover:border-primary dark:hover:border-primary bg-white dark:bg-boxdark hover:bg-primary/5 dark:hover:bg-primary/10 transition-all flex flex-col justify-between shadow-sm hover:shadow-md"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <MdAddCircle size={24} />
              </div>
              <h4 className="text-sm font-bold text-black dark:text-white mb-1">
                Create New GRN
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Start a fresh receiving document for a brand-new supplier shipment or container.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-stroke dark:border-strokedark flex items-center justify-between text-xs font-bold text-primary">
              <span>Start New Document</span>
              <span>&rarr;</span>
            </div>
          </div>

          {/* OPTION 2: ADD TO EXISTING GRN */}
          <div 
            onClick={() => setStep('LIST')}
            className="group cursor-pointer p-5 rounded-xl border-2 border-stroke dark:border-strokedark hover:border-indigo-500 dark:hover:border-indigo-400 bg-white dark:bg-boxdark hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-all flex flex-col justify-between shadow-sm hover:shadow-md"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <MdPlaylistAdd size={24} />
              </div>
              <h4 className="text-sm font-bold text-black dark:text-white mb-1">
                Add to Existing GRN
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Append newly arrived items to an active unbilled shipment already in progress.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-stroke dark:border-strokedark flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
              <span>View Active Shipments</span>
              <span>&rarr;</span>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // STEP: LIST OF ACTIVE UNBILLED GRNs
  return (
    <div className="p-4 sm:p-6 text-black dark:text-white text-xs">
      <div className="flex items-center justify-between gap-3 mb-4 border-b border-stroke dark:border-strokedark pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setStep('CHOICE')}
            className="p-1.5 rounded-lg border border-stroke dark:border-strokedark hover:bg-gray-100 dark:hover:bg-meta-4 text-gray-600 dark:text-gray-300 transition"
            title="Back to options"
          >
            <MdArrowBack size={18} />
          </button>
          <div>
            <h3 className="text-base font-bold text-black dark:text-white">
              Select Active Unbilled GRN
            </h3>
            <p className="text-[11px] text-gray-400">
              Choose the GRN to append additional items into
            </p>
          </div>
        </div>

        <div className="relative w-64">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search GRN # or Vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-stroke dark:border-strokedark bg-transparent text-xs font-medium outline-none focus:border-primary text-black dark:text-white"
          />
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="py-12 flex justify-center"><Spinner /></div>
        ) : filteredGrns.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 italic mb-3">No active unbilled GRNs found.</p>
            <button
              onClick={handleCreateNew}
              className="px-4 py-2 bg-primary text-white rounded-lg font-bold text-xs hover:bg-opacity-90"
            >
              + Create New GRN Instead
            </button>
          </div>
        ) : (
          <table className="w-full table-auto border-collapse text-left">
            <thead>
              <tr className="bg-gray-100 dark:bg-meta-4 text-[10px] font-black uppercase text-gray-600 dark:text-gray-300 border-b border-stroke dark:border-strokedark">
                <th className="py-2.5 px-3">GRN #</th>
                <th className="py-2.5 px-3">Vendor</th>
                <th className="py-2.5 px-3 text-center">Date</th>
                <th className="py-2.5 px-3 text-center">Items</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stroke dark:divide-strokedark">
              {filteredGrns.map((g) => (
                <tr 
                  key={g.id} 
                  className="hover:bg-primary/5 dark:hover:bg-primary/10 transition font-semibold"
                >
                  <td className="py-2.5 px-3 font-mono font-bold text-primary">{g.grn_no}</td>
                  <td className="py-2.5 px-3">
                    <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-200">
                      <MdBusiness className="text-gray-400" size={14} />
                      {g.vendor_name}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center text-gray-500 font-mono text-[11px]">
                    <span className="inline-flex items-center gap-1">
                      <MdEvent size={12} />
                      {g.receipt_date}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono">
                    {g.grn_items?.length || 0}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2 py-0.5 border text-[10px] rounded-full font-bold uppercase tracking-wide bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60">
                      {g.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => handleSelectExisting(g.id)}
                      className="px-3 py-1 bg-primary text-white rounded font-bold hover:bg-opacity-90 transition shadow-xs text-xs"
                    >
                      Select & Add Items &rarr;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-stroke dark:border-strokedark flex items-center justify-between">
        <button
          onClick={handleCreateNew}
          className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
        >
          <MdAddCircle size={14} />
          Create New GRN instead
        </button>
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded border border-stroke dark:border-strokedark text-gray-500 hover:bg-gray-100 dark:hover:bg-meta-4 text-xs font-semibold"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default ReceiveGrnModal;
