'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const LEAD_STATUSES = ['pending', 'processing', 'email sent', 'follow-up 1', 'follow-up 2', 'follow-up 3', 'converted', 'lost'];

const getStatusStyles = (status: string) => {
  switch (status.toLowerCase()) {
    case 'converted': return 'bg-success/20 text-success border-success/30';
    case 'lost': return 'bg-danger/20 text-danger border-danger/30';
    case 'pending': return 'bg-warning/20 text-warning border-warning/30';
    default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  }
};

export default function AdminLeadsPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    setUpdatingId(leadId);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/admin/leads/${leadId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setLeads(leads.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
      } else {
        alert('Failed to update status: ' + data.error);
      }
    } catch (err: any) {
      alert('Error updating status: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const downloadCSV = () => {
    if (leads.length === 0) {
      alert('No leads to export');
      return;
    }
    const headers = ['Date', 'Name', 'Phone', 'Brand', 'Model', 'Storage', 'Quote', 'Pickup Date', 'Pickup Time', 'Status'];
    const rows = leads.map(l => [
      new Date(l.createdAt).toLocaleDateString(),
      `"${l.name || ''}"`,
      l.phone,
      l.brand,
      l.model,
      l.storage,
      l.quotedPrice,
      l.pickupDate || '',
      l.pickupTime || '',
      l.status
    ]);
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    async function fetchData() {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      try {
        const headers = { 'Authorization': `Bearer ${token}` };
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        
        const [usersRes, leadsRes] = await Promise.all([
          fetch(`${apiUrl}/api/admin/users`, { headers }),
          fetch(`${apiUrl}/api/admin/leads`, { headers })
        ]);

        if (usersRes.status === 401 || leadsRes.status === 401) {
          router.push('/admin/login');
          return;
        }

        const usersData = await usersRes.json();
        const leadsData = await leadsRes.json();

        if (usersData.success) setUsers(usersData.data);
        if (leadsData.success) setLeads(leadsData.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    const intervalId = setInterval(fetchData, 10000);
    return () => clearInterval(intervalId);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin shadow-gold"></div>
          <p className="text-gold font-medium tracking-widest uppercase text-sm animate-pulse">Initializing CRM...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4 sm:px-6 lg:px-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-surface-elevated via-background to-background">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 p-8 rounded-3xl bg-surface/40 backdrop-blur-md border border-white/5 shadow-2xl">
          <div>
            <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-gold to-yellow-200 tracking-tight">
              Command Center
            </h1>
            <p className="text-muted mt-2 font-medium">Manage your leads and users in real-time.</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={downloadCSV}
              className="px-6 py-2.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 hover:border-blue-500/50 transition-all duration-300 font-semibold shadow-[0_0_15px_rgba(59,130,246,0.1)]"
            >
              Export CSV
            </button>
            <button 
              onClick={() => {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                router.push('/admin/login');
              }}
              className="group relative px-6 py-2.5 rounded-full overflow-hidden bg-surface-elevated border border-white/10 hover:border-danger/50 transition-all duration-300 shadow-lg"
            >
              <span className="relative z-10 text-sm font-semibold text-muted group-hover:text-danger transition-colors duration-300">
                Sign Out
              </span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* CRM Pipeline Leads Section */}
        <div className="rounded-3xl bg-surface/30 backdrop-blur-sm border border-white/5 shadow-xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-surface-elevated/50 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
              </div>
              <h2 className="text-xl font-bold text-foreground tracking-wide">Active Leads <span className="ml-2 text-sm font-medium px-2.5 py-0.5 rounded-full bg-success/20 text-success">{leads.length}</span></h2>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-surface/50 text-xs uppercase tracking-wider text-muted font-semibold">
                  <th className="px-6 py-4 rounded-tl-lg">Date Received</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Device</th>
                  <th className="px-6 py-4">Quote</th>
                  <th className="px-6 py-4">Pickup</th>
                  <th className="px-6 py-4">Pipeline Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {leads.map(l => (
                  <tr key={l.id} className="hover:bg-surface-elevated/40 transition-colors duration-200 group">
                    <td className="px-6 py-5 text-sm text-muted">
                      {new Date(l.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{l.name || 'Unknown'}</span>
                        <span className="text-xs text-muted mt-1 font-mono">{l.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-surface flex items-center justify-center border border-white/10">
                          <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">{l.brand} {l.model}</span>
                          <span className="text-xs text-muted mt-0.5">{l.storage}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-gold/10 text-gold border border-gold/20 font-bold text-sm shadow-[0_0_10px_rgba(212,175,55,0.1)]">
                        ₹{l.quotedPrice}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-sm">
                      {l.pickupDate ? (
                        <div className="flex flex-col">
                          <span className="text-foreground">{l.pickupDate}</span>
                          <span className="text-xs text-muted mt-1">{l.pickupTime} • {l.city || 'N/A'}</span>
                        </div>
                      ) : (
                        <span className="text-muted italic">Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <select 
                            disabled={updatingId === l.id}
                            value={l.status || 'pending'} 
                            onChange={(e) => handleStatusChange(l.id, e.target.value)}
                            className={`appearance-none w-full min-w-[140px] px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background transition-all duration-300 ${getStatusStyles(l.status || 'pending')} ${updatingId === l.id ? 'opacity-50 cursor-not-allowed animate-pulse' : 'hover:scale-[1.02] active:scale-95'}`}
                          >
                            {LEAD_STATUSES.map(s => (
                              <option key={s} value={s} className="bg-surface text-foreground capitalize font-medium">
                                {s}
                              </option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3">
                            {updatingId === l.id ? (
                              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <svg className="w-3 h-3 fill-current opacity-70" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                            )}
                          </div>
                        </div>
                        
                        {/* Download PDF Button */}
                        <button
                          onClick={() => {
                            const token = localStorage.getItem('accessToken');
                            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
                            fetch(`${apiUrl}/api/admin/leads/${l.id}/pdf`, {
                              headers: { 'Authorization': `Bearer ${token}` }
                            })
                            .then(res => res.blob())
                            .then(blob => {
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              const safeName = (l.name || 'Unknown').replace(/[^a-zA-Z0-9]/g, '_');
                              a.href = url;
                              a.download = `${safeName}_${l.phone}_Report.pdf`;
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                              window.URL.revokeObjectURL(url);
                            })
                            .catch(err => alert('Failed to download PDF'));
                          }}
                          className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                          title="Download Questionnaire PDF"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {leads.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-surface-elevated flex items-center justify-center mb-4">
                          <svg className="w-8 h-8 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                        </div>
                        <p className="text-muted text-lg font-medium">Your CRM is empty</p>
                        <p className="text-muted/60 text-sm mt-1">No leads have come in yet. Waiting for new opportunities.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Users Section */}
        <div className="rounded-3xl bg-surface/30 backdrop-blur-sm border border-white/5 shadow-xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-surface-elevated/50 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
              </div>
              <h2 className="text-xl font-bold text-foreground tracking-wide">System Accounts <span className="ml-2 text-sm font-medium px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400">{users.length}</span></h2>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-surface/50 text-xs uppercase tracking-wider text-muted font-semibold">
                  <th className="px-6 py-4 rounded-tl-lg">Account ID</th>
                  <th className="px-6 py-4">Phone Number</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Name</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-surface-elevated/40 transition-colors duration-200">
                    <td className="px-6 py-4 text-sm font-mono text-muted">{u.id}</td>
                    <td className="px-6 py-4 font-medium text-foreground">{u.phone}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                        u.role === 'admin' ? 'bg-gold/20 text-gold border border-gold/30 shadow-[0_0_10px_rgba(212,175,55,0.1)]' : 
                        'bg-surface-elevated text-muted border border-white/10'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted">{u.name || '-'}</td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted">No system users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
