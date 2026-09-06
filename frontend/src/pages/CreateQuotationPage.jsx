import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { formatCurrency } from '../services/adapters';
import { Card } from '../components/Card';
import { 
  Plus, 
  Trash2, 
  ShieldAlert, 
  Send, 
  Calculator, 
  AlertTriangle, 
  ArrowRight
} from 'lucide-react';

export default function CreateQuotationPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Data sources
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [salesRepId, setSalesRepId] = useState(user ? String(user.id) : '');
  const [quotationNumber, setQuotationNumber] = useState(
    `QT-${Math.floor(1000 + Math.random() * 9000)}`
  );

  // Line items state: array of { product_id, quantity, unit_price, discount_percent, tax_rate, unit_cost }
  const [lines, setLines] = useState([
    {
      product_id: '',
      quantity: 1,
      unit_price: 0,
      discount_percent: 0,
      tax_rate: 0,
      unit_cost: 0,
    },
  ]);

  // Quotation ID once created
  const [createdQuoteId, setCreatedQuoteId] = useState(null);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [submitApprovalLoading, setSubmitApprovalLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [custData, prodData, userData] = await Promise.all([
          api.getCustomers(),
          api.getProducts(),
          api.getUsers(),
        ]);
        setCustomers(custData || []);
        setProducts(prodData || []);
        setUsers(userData || []);

        if (custData && custData.length > 0) setCustomerId(String(custData[0].id));
        if (user) {
          setSalesRepId(String(user.id));
        } else if (userData && userData.length > 0) {
          setSalesRepId(String(userData[0].id));
        }
        if (prodData && prodData.length > 0) {
          setLines([
            {
              product_id: String(prodData[0].id),
              quantity: 2,
              unit_price: Number(prodData[0].base_price || 100),
              discount_percent: 15,
              tax_rate: 0,
              unit_cost: Number(prodData[0].unit_cost || 50),
            },
          ]);
        }
      } catch (err) {
        setError(err.formattedMessage || 'Failed to initialize quotation creation form');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleProductChange = (index, prodId) => {
    const prod = products.find((p) => String(p.id) === String(prodId));
    const newLines = [...lines];
    newLines[index] = {
      ...newLines[index],
      product_id: prodId,
      unit_price: prod ? Number(prod.base_price || 0) : 0,
      unit_cost: prod ? Number(prod.unit_cost || 0) : 0,
    };
    setLines(newLines);
    setEvaluationResult(null);
  };

  const handleLineChange = (index, field, value) => {
    const newLines = [...lines];
    newLines[index] = {
      ...newLines[index],
      [field]: Number(value),
    };
    setLines(newLines);
    setEvaluationResult(null);
  };

  const addLine = () => {
    const firstProd = products[0];
    setLines([
      ...lines,
      {
        product_id: firstProd ? String(firstProd.id) : '',
        quantity: 1,
        unit_price: firstProd ? Number(firstProd.base_price || 0) : 0,
        discount_percent: 0,
        tax_rate: 0,
        unit_cost: firstProd ? Number(firstProd.unit_cost || 0) : 0,
      },
    ]);
    setEvaluationResult(null);
  };

  const removeLine = (index) => {
    if (lines.length === 1) return;
    setLines(lines.filter((_, i) => i !== index));
    setEvaluationResult(null);
  };

  // Local calculation previews
  const subtotal = lines.reduce(
    (acc, l) => acc + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0),
    0
  );
  const discountTotal = lines.reduce(
    (acc, l) =>
      acc +
      (Number(l.quantity) || 0) *
        (Number(l.unit_price) || 0) *
        ((Number(l.discount_percent) || 0) / 100),
    0
  );
  const grandTotal = subtotal - discountTotal;

  // 1. Create quotation and lines on backend
  const handleSaveQuotation = async () => {
    if (!customerId) {
      setError('Please select a customer.');
      return null;
    }
    if (lines.length === 0 || !lines[0].product_id) {
      setError('Please add at least one valid product line.');
      return null;
    }

    setSubmitting(true);
    setError(null);
    try {
      // 1. Create Quote
      const quote = await api.createQuotation({
        customer_id: Number(customerId),
        sales_rep_id: Number(salesRepId) || 1,
        quotation_number: quotationNumber,
      });

      // 2. Add each line
      for (const line of lines) {
        await api.addQuoteLine(quote.id, {
          product_id: Number(line.product_id),
          quantity: Number(line.quantity),
          unit_price: Number(line.unit_price),
          discount_percent: Number(line.discount_percent),
          tax_rate: Number(line.tax_rate || 0),
          unit_cost: Number(line.unit_cost || 0),
        });
      }

      setCreatedQuoteId(quote.id);
      return quote.id;
    } catch (err) {
      setError(err.formattedMessage || 'Error creating quotation on backend');
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Evaluate discount governance
  const handleEvaluateDiscount = async () => {
    let qId = createdQuoteId;
    if (!qId) {
      qId = await handleSaveQuotation();
    }
    if (!qId) return;

    setEvaluating(true);
    setError(null);
    try {
      const res = await api.evaluateDiscount(qId);
      setEvaluationResult(res);
    } catch (err) {
      setError(err.formattedMessage || 'Discount evaluation failed');
    } finally {
      setEvaluating(false);
    }
  };

  // 3. Submit for approval
  const handleSubmitApproval = async () => {
    let qId = createdQuoteId;
    if (!qId) {
      qId = await handleSaveQuotation();
    }
    if (!qId) return;

    setSubmitApprovalLoading(true);
    setError(null);
    try {
      await api.submitApproval(qId, Number(salesRepId) || 1);
      // Navigate to Quotation Detail
      navigate(`/quotations/${qId}`);
    } catch (err) {
      setError(err.formattedMessage || 'Failed to submit quotation for approval');
    } finally {
      setSubmitApprovalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="empty-state">
        <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
        <div>Loading customer and product catalog...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Create Quotation &amp; Evaluate Discounts
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Build deal line items, apply targeted discounts, and evaluate governance rules
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <AlertTriangle size={18} />
          <div>{error}</div>
        </div>
      )}

      {/* Basic Info Card */}
      <Card title="Deal Details">
        <div className="grid-3">
          <div className="form-group">
            <label className="form-label">Customer *</label>
            <select
              className="form-select"
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setCreatedQuoteId(null);
                setEvaluationResult(null);
              }}
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.tier ? `Tier: ${c.tier}` : 'Standard'})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Sales Representative *</label>
            <select
              className="form-select"
              value={salesRepId}
              onChange={(e) => setSalesRepId(e.target.value)}
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Quotation Number *</label>
            <input
              type="text"
              className="form-input"
              value={quotationNumber}
              onChange={(e) => setQuotationNumber(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Line Items Card */}
      <Card
        title="Quotation Line Items"
        action={
          <button onClick={addLine} className="btn btn-secondary btn-sm">
            <Plus size={14} />
            <span>Add Line</span>
          </button>
        }
      >
        <div className="table-container" style={{ marginBottom: 16 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ minWidth: 200 }}>Product</th>
                <th style={{ width: 100 }}>Qty</th>
                <th style={{ width: 130 }}>Unit Price</th>
                <th style={{ width: 120 }}>Discount %</th>
                <th style={{ width: 130 }}>Line Total</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => {
                const lineTotal =
                  (Number(line.quantity) || 0) *
                  (Number(line.unit_price) || 0) *
                  (1 - (Number(line.discount_percent) || 0) / 100);

                return (
                  <tr key={idx}>
                    <td>
                      <select
                        className="form-select"
                        value={line.product_id}
                        onChange={(e) => handleProductChange(idx, e.target.value)}
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({formatCurrency(p.base_price)}) [{p.category || 'general'}]
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        className="form-input"
                        value={line.quantity}
                        onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-input"
                        value={line.unit_price}
                        onChange={(e) => handleLineChange(idx, 'unit_price', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        className="form-input"
                        value={line.discount_percent}
                        onChange={(e) => handleLineChange(idx, 'discount_percent', e.target.value)}
                      />
                    </td>
                    <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                      {formatCurrency(lineTotal)}
                    </td>
                    <td>
                      <button
                        onClick={() => removeLine(idx)}
                        disabled={lines.length === 1}
                        className="btn btn-secondary btn-sm"
                        style={{ color: '#ef4444' }}
                        title="Remove Line"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pricing Summary Breakdown */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: 320, background: 'var(--bg-surface-elevated)', padding: 16, borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Subtotal:</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.9rem', color: '#f87171' }}>
              <span>Total Discount:</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>-{formatCurrency(discountTotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border-subtle)', fontWeight: 700, fontSize: '1.1rem' }}>
              <span>Grand Total:</span>
              <span style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Discount Evaluation Banner / Results */}
      {evaluationResult && (
        <Card title="Backend Discount Governance Evaluation">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px 18px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Blended Risk Score</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: evaluationResult.risk_score > 10 ? '#f87171' : '#34d399' }}>
                  {evaluationResult.risk_score.toFixed(1)}
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px 18px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Required Approval</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, textTransform: 'capitalize', color: '#818cf8' }}>
                  {evaluationResult.approval_level || 'None (Auto-approved)'}
                </div>
              </div>
            </div>

            <div className="alert alert-info" style={{ marginBottom: 0 }}>
              <ShieldAlert size={18} />
              <div>
                <strong>Explanation: </strong>
                {evaluationResult.explanation}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Action Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <button
          onClick={handleEvaluateDiscount}
          disabled={evaluating || submitting}
          className="btn btn-secondary"
        >
          <Calculator size={16} />
          <span>{evaluating ? 'Evaluating...' : 'Evaluate Discount Risk'}</span>
        </button>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleSaveQuotation}
            disabled={submitting}
            className="btn btn-secondary"
          >
            <span>{submitting ? 'Saving...' : createdQuoteId ? 'Saved' : 'Save as Draft'}</span>
          </button>

          <button
            onClick={handleSubmitApproval}
            disabled={submitApprovalLoading || submitting}
            className="btn btn-primary"
          >
            <Send size={16} />
            <span>{submitApprovalLoading ? 'Submitting...' : 'Submit for Approval'}</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
