import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { supabase } from '../../../Context/supabaseClient';
import { toast } from 'react-hot-toast';
import Spinner from '../../../ui/Spinner';
import { useAuth } from '../../../Context/Auth';
import { posService } from '../../../service/posService';
import { MdAccountBalance, MdArrowBack } from 'react-icons/md';

const AddBank = () => {
    const { tenantId } = useAuth();
    const [loading, setLoading] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const editData = location.state?.bank;
    const isEditMode = !!editData;

    const blockInvalidChar = (e: React.KeyboardEvent<HTMLInputElement>) =>
        ['-', 'e', 'E', '+'].includes(e.key) && e.preventDefault();

    const validationSchema = Yup.object().shape({
        bankName: Yup.string().required('Bank Name is required'),
        accountTitle: Yup.string().required('Account Title is required'),
        accountNumber: Yup.string().required('Account Number is required'),
        branchName: Yup.string(),
        openingBalance: Yup.number().min(0, 'Min 0').required('Opening balance is required'),
    });

    const initialValues = {
        bankName: editData?.bank_name || editData?.bankName || '',
        accountTitle: editData?.account_title || editData?.accountTitle || '',
        accountNumber: editData?.account_number || editData?.accountNumber || '',
        branchName: editData?.branch_name || editData?.branchName || '',
        openingBalance: Number(editData?.current_balance ?? editData?.currentBalance ?? editData?.opening_balance ?? 0),
    };

    const handleSubmit = async (values: any) => {
        setLoading(true);
        try {
            const isNumericDbId = isEditMode && editData?.id && !isNaN(Number(editData.id));

            // Check for duplicate account number
            let query = supabase
                .from('banks')
                .select('id')
                .or(`account_number.eq.${values.accountNumber.trim()},accountNumber.eq.${values.accountNumber.trim()}`);

            if (isEditMode && isNumericDbId) {
                query = query.neq('id', Number(editData.id));
            }

            const { data: existingAccount, error: checkError } = await query;
            if (checkError) throw checkError;

            if (existingAccount && existingAccount.length > 0) {
                toast.error('A bank account with this Account Number already exists!');
                setLoading(false);
                return;
            }

            const cleanTenant = tenantId || 'bashir';
            const dbPayload: any = {
                tenant_id: cleanTenant,
                bank_name: values.bankName.trim(),
                bankName: values.bankName.trim(),
                account_title: values.accountTitle.trim(),
                accountTitle: values.accountTitle.trim(),
                account_number: values.accountNumber.trim(),
                accountNumber: values.accountNumber.trim(),
                branch_name: values.branchName?.trim() || '',
                current_balance: Number(values.openingBalance || 0)
            };

            if (isEditMode && isNumericDbId) {
                const { error } = await supabase
                    .from('banks')
                    .update(dbPayload)
                    .eq('id', Number(editData.id));
                if (error) throw error;

                // Sync with chart_of_accounts if exists
                try {
                    const originalName = editData.bank_name || editData.bankName;
                    await supabase
                        .from('chart_of_accounts')
                        .update({
                            account_title: values.bankName.trim(),
                            opening_balance: Number(values.openingBalance || 0),
                            notes: `Bank ledger account for ${values.accountTitle.trim()} (A/C: ${values.accountNumber.trim()})`
                        })
                        .or(`account_title.eq.${originalName},notes.ilike.%${editData.id}%`);
                } catch (coaErr) {
                    console.warn('COA sync note:', coaErr);
                }

                posService.syncBankToPOSAccount({ id: editData.id, ...values });
                toast.success('Account Details Updated Successfully!');
                navigate('/Registration/Bank-Account/BankAccountList');
            } else {
                const { data: insertedBank, error } = await supabase
                    .from('banks')
                    .insert([dbPayload])
                    .select('id')
                    .single();
                if (error) throw error;

                // Auto-create next 1020-xxx chart of account
                try {
                    const { data: existingCodes } = await supabase
                        .from('chart_of_accounts')
                        .select('account_code')
                        .like('account_code', '1020-%')
                        .order('account_code', { ascending: false })
                        .limit(1);

                    let nextCode = '1020-001';
                    if (existingCodes && existingCodes.length > 0) {
                        const lastNum = parseInt(existingCodes[0].account_code.split('-')[1] || '0', 10);
                        nextCode = `1020-${String(lastNum + 1).padStart(3, '0')}`;
                    }

                    await supabase.from('chart_of_accounts').insert([{
                        tenant_id: cleanTenant,
                        account_code: nextCode,
                        account_title: values.bankName.trim(),
                        control_code: 'Bank',
                        category_code: '1. ASSETS',
                        sub_category_code: 'Current Assets',
                        opening_balance: Number(values.openingBalance || 0),
                        balance_nature: 'Debit',
                        notes: `Bank ledger account for ${values.accountTitle.trim()} (A/C: ${values.accountNumber.trim()})`,
                        is_active: true
                    }]);
                } catch (coaInsertErr) {
                    console.warn('COA insert note:', coaInsertErr);
                }

                posService.syncBankToPOSAccount({ id: insertedBank?.id, ...values }, true);
                toast.success('Bank Account Registered Successfully!');
                navigate('/Registration/Bank-Account/BankAccountList');
            }
        } catch (err: any) {
            toast.error(err.message || 'Operation failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mx-auto max-w-4xl p-4 sm:p-6">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="border-b border-slate-100 dark:border-slate-800 py-4 px-6 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/40">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                            <MdAccountBalance size={22} />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                                {isEditMode ? `Modify Account: ${initialValues.accountTitle || initialValues.bankName}` : 'Register Bank / Digital Wallet Account'}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {isEditMode ? 'Update bank details and initial opening ledger' : 'Configure a new bank or wallet for sales, vouchers & POS payments'}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => navigate('/Registration/Bank-Account/BankAccountList')}
                        className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition shadow-2xs cursor-pointer"
                    >
                        <MdArrowBack size={14} /> Back to List
                    </button>
                </div>

                <Formik
                    initialValues={initialValues}
                    enableReinitialize={true}
                    validationSchema={validationSchema}
                    onSubmit={handleSubmit}
                >
                    {({ handleChange, values, errors, touched }) => (
                        <Form className="p-6">
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                                <div>
                                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Bank Name <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        name="bankName"
                                        placeholder="e.g. Meezan Bank Ltd, Habib Bank Limited, JazzCash"
                                        onChange={handleChange}
                                        value={values.bankName}
                                        className={`w-full rounded-xl border px-3.5 h-10 bg-slate-50/50 dark:bg-slate-800/50 text-xs font-semibold outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 transition ${
                                            touched.bankName && errors.bankName ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                                        }`}
                                    />
                                    {touched.bankName && errors.bankName && (
                                        <p className="text-rose-500 text-[11px] mt-1 font-semibold">{String(errors.bankName)}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Account Title <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        name="accountTitle"
                                        placeholder="e.g. Uzair Jibran Cloth - Main Collection"
                                        onChange={handleChange}
                                        value={values.accountTitle}
                                        className={`w-full rounded-xl border px-3.5 h-10 bg-slate-50/50 dark:bg-slate-800/50 text-xs font-semibold outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 transition ${
                                            touched.accountTitle && errors.accountTitle ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                                        }`}
                                    />
                                    {touched.accountTitle && errors.accountTitle && (
                                        <p className="text-rose-500 text-[11px] mt-1 font-semibold">{String(errors.accountTitle)}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Account / IBAN / Till Number <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        name="accountNumber"
                                        placeholder="e.g. 0214-0104829101 or 0300-9876543"
                                        onChange={handleChange}
                                        value={values.accountNumber}
                                        className={`w-full rounded-xl border px-3.5 h-10 bg-slate-50/50 dark:bg-slate-800/50 text-xs font-mono font-bold outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 transition ${
                                            touched.accountNumber && errors.accountNumber ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                                        }`}
                                    />
                                    {touched.accountNumber && errors.accountNumber && (
                                        <p className="text-rose-500 text-[11px] mt-1 font-semibold">{String(errors.accountNumber)}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Branch Name (Optional)
                                    </label>
                                    <input
                                        name="branchName"
                                        placeholder="e.g. Cloth Market Branch, Saddar, Digital"
                                        onChange={handleChange}
                                        value={values.branchName}
                                        className="w-full rounded-xl border px-3.5 h-10 bg-slate-50/50 dark:bg-slate-800/50 text-xs font-semibold outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 border-slate-200 dark:border-slate-700 transition"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Opening Balance (PKR) <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rs.</span>
                                        <input
                                            type="number"
                                            name="openingBalance"
                                            min="0"
                                            onKeyDown={blockInvalidChar}
                                            onChange={handleChange}
                                            value={values.openingBalance}
                                            className={`w-full rounded-xl border pl-10 pr-3.5 h-10 bg-slate-50/50 dark:bg-slate-800/50 text-xs font-mono font-bold outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 transition ${
                                                touched.openingBalance && errors.openingBalance ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                                            }`}
                                        />
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1">Starting available balance for this bank account / wallet ledger.</p>
                                    {touched.openingBalance && errors.openingBalance && (
                                        <p className="text-rose-500 text-[11px] mt-1 font-semibold">{String(errors.openingBalance)}</p>
                                    )}
                                </div>

                            </div>

                            <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => navigate('/Registration/Bank-Account/BankAccountList')}
                                    className="rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 py-2.5 px-5 font-bold text-slate-700 dark:text-slate-300 transition shadow-2xs text-xs cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 px-6 font-bold text-white transition disabled:opacity-50 shadow-sm text-xs cursor-pointer flex items-center gap-2"
                                >
                                    {loading ? <Spinner color="border-white" size="w-4 h-4" /> : <span>{isEditMode ? 'Update Bank Account' : 'Save Bank Account'}</span>}
                                </button>
                            </div>
                        </Form>
                    )}
                </Formik>
            </div>
        </div>
    );
};

export default AddBank;
