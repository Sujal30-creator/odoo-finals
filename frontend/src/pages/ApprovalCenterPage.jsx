import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { formatCurrency } from '../services/adapters';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/Badge';
import { 
  CheckCircle, 
  XCircle, 
  RotateCcw, 
  Clock, 
  AlertTriangle, 
  Eye, 
  UserCheck,
  Filter
} from 'lucide-react';

export default function ApprovalCenterPage() {
  const { user } = useAuth();
  const [approvals, setApprovals] = useState([]);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'all' | 'approved' | 'rejected'
  const [actionReasons, setActionReasons] = useState({});
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const fetchApprovals = async () => {
    setLoading(true);
    setError(null);
    try {
      const apprData = await api.getApprovals();
      setApprovals(apprData || []);
    } catch (err) {
      setError(err.formattedMessage || 'Failed to load approvals from backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleAction = async (approvalId, action) => {
    setProcessingId(approvalId);
    setError(null);
    setSuccessMsg(null);

    const reason = actionReasons[approvalId] || (action === 'approve' ? 'Approved discount exception.' : 'Action processed.');

    try {
      await api.processApproval(approvalId, {
        user_id: user.id,
        action: action,
        reason: reason,
      });

      const actionLabels = {
        approve: 'Approved',
        reject: 'Rejected',
        return_for_revision: 'Returned for Revision',
      };

      setSuccessMsg(`Approval #${approvalId} successfully ${actionLabels[action]}!`);
      // Refresh list
      await fetchApprovals();
    } catch (err) {
      setError(err.formattedMessage || `Failed to process approval action: ${action}`);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredApprovals = approvals.filter((appr) => {
    if (activeTab === 'all') return true;
    return appr.status === activeTab;
  });

  const pendingCount = approvals.filter((a) => a.status === 'pending').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Manager Approval Center
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Review discount exceptions, evaluate governance criteria, and route deals
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <AlertTriangle size={18} />
          <div>{error}</div>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success">
          <CheckCircle size={18} />
          <div>{successMsg}</div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
        <button
          onClick={() => setActiveTab('pending')}
          className={`btn btn-sm ${activeTab === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Clock size={14} />
          <span>Pending Action ({pendingCount})</span>
        </button>
        <button
          onClick={() => setActiveTab('approved')}
          className={`btn btn-sm ${activeTab === 'approved' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <CheckCircle size={14} />
          <span>Approved</span>
        </button>
        <button
          onClick={() => setActiveTab('rejected')}
          className={`btn btn-sm ${activeTab === 'rejected' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <XCircle size={14} />
          <span>Rejected</span>
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Filter size={14} />
          <span>All ({approvals.length})</span>
        </button>
      </div>

      {/* Approvals List */}
      <Card title={`Approvals (${filteredApprovals.length})`}>
        {loading ? (
          <div className="empty-state">
            <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
            <div>Loading approvals from backend...</div>
          </div>
        ) : filteredApprovals.length === 0 ? (
          <div className="empty-state">
            <p>No approvals found for filter "{activeTab}".</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filteredApprovals.map((appr) => {
              const quote = appr.quotation;
              const isProcessing = processingId === appr.id;

              return (
                <div
                  key={appr.id}
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: 20,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                          Approval #{appr.id}
                        </span>
                        <StatusBadge status={appr.status} />
                        <span className="badge badge-blue">
                          Level: {appr.approval_level || 'Sales Manager'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        Quotation:{' '}
                        <Link
                          to={`/quotations/${appr.quotation_id}`}
                          style={{ color: '#818cf8', fontWeight: 700, fontFamily: 'var(--font-mono)' }}
                        >
                          {quote?.quotation_number || `QT-${appr.quotation_id}`}
                        </Link>{' '}
                        | Grand Total: <strong>{formatCurrency(quote?.grand_total || 0)}</strong>
                        {quote?.risk_score !== undefined && (
                          <span> | Risk Score: <strong>{Number(quote.risk_score).toFixed(1)}</strong></span>
                        )}
                      </div>
                    </div>

                    <Link to={`/quotations/${appr.quotation_id}`} className="btn btn-secondary btn-sm">
                      <Eye size={13} />
                      <span>View Quote</span>
                    </Link>
                  </div>

                  {appr.reason && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: 'var(--bg-main)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', marginBottom: 14 }}>
                      <strong>Submission Note:</strong> {appr.reason}
                    </div>
                  )}

                  {/* Actions for Pending Approvals */}
                  {appr.status === 'pending' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <input
                          type="text"
                          placeholder="Add approval comment or revision reason..."
                          className="form-input"
                          value={actionReasons[appr.id] || ''}
                          onChange={(e) =>
                            setActionReasons({ ...actionReasons, [appr.id]: e.target.value })
                          }
                        />
                      </div>

                      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleAction(appr.id, 'return_for_revision')}
                          disabled={isProcessing}
                          className="btn btn-secondary btn-sm"
                          title="Request revision from sales rep or customer"
                        >
                          <RotateCcw size={14} />
                          <span>Request Changes</span>
                        </button>

                        <button
                          onClick={() => handleAction(appr.id, 'reject')}
                          disabled={isProcessing}
                          className="btn btn-danger btn-sm"
                          title="Reject the quotation"
                        >
                          <XCircle size={14} />
                          <span>Reject</span>
                        </button>

                        <button
                          onClick={() => handleAction(appr.id, 'approve')}
                          disabled={isProcessing}
                          className="btn btn-success btn-sm"
                          title="Approve this quotation"
                        >
                          <CheckCircle size={14} />
                          <span>{isProcessing ? 'Processing...' : 'Approve Quotation'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
