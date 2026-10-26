import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Check,
  FileCheck,
  Download,
  Cpu,
  Users
} from 'lucide-react';

export const ExcelImport = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [mappings, setMappings] = useState({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState('');

  const CANONICAL_FIELDS = [
    { key: 'candidate_name', label: 'Candidate Name (Required)' },
    { key: 'candidate_email', label: 'Candidate Email (Required)' },
    { key: 'internship_role', label: 'Internship Role' },
    { key: 'assigned_task', label: 'Assigned Task Title (Required)' },
    { key: 'task_description', label: 'Task Description' },
    { key: 'task_requirements', label: 'Task Requirements' },
    { key: 'expected_deliverables', label: 'Expected Deliverables' },
    { key: 'required_skills', label: 'Required Skills' },
    { key: 'deadline', label: 'Task Deadline' },
    { key: 'mentor_email', label: 'Assigned Mentor Email' },
  ];

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPreview(null);
      setImportResult(null);
      setError('');
    }
  };

  const handlePreviewUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select an Excel (.xlsx) file first.');
      return;
    }

    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/imports/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setPreview(res.data);
      setMappings(res.data.suggested_mappings || {});
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to parse Excel file.');
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (header, canonicalKey) => {
    setMappings(prev => ({ ...prev, [header]: canonicalKey }));
  };

  const handleConfirmImport = async () => {
    if (!preview) return;
    setImporting(true);
    setError('');
    try {
      const res = await api.post('/imports/confirm', {
        batch_id: preview.batch_id,
        column_mappings: mappings
      });
      setImportResult(res.data);
      setPreview(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to confirm bulk import.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
          Excel Candidate Ingestion & Task Provisioning
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
          Upload batch spreadsheets to register interns, map task specifications, and validate integrity before importing.
        </p>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#fef2f2', border: '1px solid #fecaca',
          color: '#b91c1c', padding: '12px 16px', borderRadius: '8px',
          marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {importResult && (
        <div style={{
          backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0',
          padding: '28px 24px', borderRadius: '12px', marginBottom: '28px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '48px', height: '48px', backgroundColor: '#10b981',
            borderRadius: '50%', color: 'white', display: 'flex',
            alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px'
          }}>
            <FileCheck size={28} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#065f46' }}>
            Batch Import & Autonomous Lifecycle Initiated!
          </h2>
          <p style={{ color: '#047857', fontSize: '14px', marginTop: '6px', maxWidth: '600px', margin: '6px auto 0' }}>
            {importResult.message || `Successfully imported records. Durable background workflows, welcome emails, and AI task allocations have been initialized.`}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
            <Link
              to="/admin/automation"
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Cpu size={16} />
              <span>Monitor in Automation Center</span>
            </Link>

            <Link
              to="/admin/interns"
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#ffffff' }}
            >
              <Users size={16} />
              <span>View Intern Directory</span>
            </Link>

            <button
              onClick={() => { setFile(null); setImportResult(null); }}
              className="btn btn-secondary"
              style={{ backgroundColor: '#ffffff' }}
            >
              Upload Another Spreadsheet
            </button>
          </div>
        </div>
      )}

      {/* Download Template Banner */}
      <div style={{
        backgroundColor: '#e0e7ff', border: '1px solid #c7d2fe',
        borderRadius: '12px', padding: '18px 24px', marginBottom: '24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '10px',
            backgroundColor: '#4338ca', color: 'white', display: 'flex',
            alignItems: 'center', justifyContent: 'center'
          }}>
            <FileSpreadsheet size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1e1b4b' }}>
              Download Pre-Formatted Task Assignment Spreadsheet
            </h3>
            <p style={{ fontSize: '13px', color: '#4338ca', marginTop: '2px' }}>
              Pre-filled with candidate columns, realistic project specs, and sample assignments ready for immediate testing.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <a
            href="http://localhost:8000/api/imports/download-template"
            download="candidate_task_assignment.xlsx"
            className="btn btn-primary"
            style={{ textDecoration: 'none' }}
          >
            <Download size={16} />
            <span>Download Excel (.xlsx)</span>
          </a>

          <a
            href="http://localhost:8000/api/imports/download-xml-template"
            download="candidate_task_assignment.xml"
            className="btn btn-secondary"
            style={{ textDecoration: 'none', borderColor: '#4338ca', color: '#4338ca' }}
          >
            <Download size={16} />
            <span>Download XML (.xml)</span>
          </a>
        </div>
      </div>

      {/* Step 1: Upload Card */}
      {!preview && !importResult && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">1. Select Candidate Spreadsheet</div>
              <div className="card-subtitle">Supported formats: Microsoft Excel (.xlsx, .xls)</div>
            </div>
            <FileSpreadsheet size={22} color="#4338ca" />
          </div>

          <form onSubmit={handlePreviewUpload}>
            <div style={{
              border: '2px dashed #cbd5e1', borderRadius: '12px',
              padding: '48px 20px', textAlign: 'center', backgroundColor: '#f8fafc',
              marginBottom: '20px', cursor: 'pointer'
            }}>
              <Upload size={40} color="#64748b" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>
                {file ? file.name : 'Choose Excel file or drag & drop here'}
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                Maximum file size: 20MB &bull; Pre-formatted template available
              </p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                style={{ marginTop: '14px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                Sample file available: <code>sample_interns_tasks.xlsx</code>
              </span>
              <button
                type="submit"
                disabled={loading || !file}
                className="btn btn-primary"
              >
                {loading ? 'Inspecting Spreadsheet...' : (
                  <>
                    <span>Preview & Validate Rows</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 2: Preview & Column Mapping Card */}
      {preview && (
        <div>
          {/* Summary Banner */}
          <div style={{
            display: 'flex', gap: '20px', marginBottom: '24px',
            backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px',
            border: '1px solid #e2e8f0'
          }}>
            <div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>File Ingested</span>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>{preview.filename}</div>
            </div>
            <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '20px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Total Rows</span>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>{preview.total_rows}</div>
            </div>
            <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '20px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Valid Records</span>
              <div style={{ fontWeight: 700, color: '#059669' }}>{preview.valid_rows}</div>
            </div>
            <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '20px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Records with Errors</span>
              <div style={{ fontWeight: 700, color: preview.invalid_rows > 0 ? '#dc2626' : '#64748b' }}>
                {preview.invalid_rows}
              </div>
            </div>
          </div>

          {/* Interactive Column Mapping */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <div>
                <div className="card-title">2. Column Mapping</div>
                <div className="card-subtitle">Verify detected columns mapped to system entities</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {preview.column_headers.map((header) => (
                <div key={header} style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Sheet Column: <span style={{ color: '#4338ca' }}>"{header}"</span>
                  </label>
                  <select
                    className="form-select"
                    value={mappings[header] || ''}
                    onChange={(e) => handleMappingChange(header, e.target.value)}
                    style={{ fontSize: '13px' }}
                  >
                    <option value="">-- Ignore Column --</option>
                    {CANONICAL_FIELDS.map(f => (
                      <option key={f.key} value={f.key}>{f.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Row Validation Inspector */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <div>
                <div className="card-title">3. Row-Level Validation Inspector</div>
                <div className="card-subtitle">Detailed check for duplicates, missing fields, and email validity</div>
              </div>
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Row #</th>
                    <th>Candidate</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Assigned Task</th>
                    <th>Validation Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((r) => (
                    <tr key={r.row_number} style={{ backgroundColor: !r.is_valid ? '#fef2f2' : 'inherit' }}>
                      <td style={{ fontWeight: 600 }}>{r.row_number}</td>
                      <td style={{ fontWeight: 600 }}>{r.candidate_name || '—'}</td>
                      <td>{r.candidate_email || '—'}</td>
                      <td>{r.internship_role}</td>
                      <td>{r.assigned_task || '—'}</td>
                      <td>
                        {r.is_valid ? (
                          <span className="badge badge-success">
                            <CheckCircle2 size={12} />
                            <span>Valid</span>
                          </span>
                        ) : (
                          <div>
                            <span className="badge badge-danger">
                              <AlertCircle size={12} />
                              <span>Error</span>
                            </span>
                            <div style={{ fontSize: '11px', color: '#b91c1c', marginTop: '4px' }}>
                              {r.validation_errors.join('; ')}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Autonomous Lifecycle Action Notice */}
          <div style={{
            padding: '16px 20px',
            backgroundColor: '#fff7ed',
            borderRadius: '12px',
            border: '1px solid #fed7aa',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '8px',
              backgroundColor: '#ea580c', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#ffffff', flexShrink: 0
            }}>
              ⚡
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#9a3412' }}>
                Automated Lifecycle Execution Ready
              </div>
              <div style={{ fontSize: '12px', color: '#c2410c', marginTop: '2px' }}>
                Upon confirmation, the background workflow engine will immediately register users, initialize persistent workflows, dispatch personalized welcome emails, and auto-queue Google Meet review scheduling. Zero manual routine steps required.
              </div>
            </div>
          </div>

          {/* Explicit Confirmation Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => setPreview(null)}
              className="btn btn-secondary"
            >
              Cancel & Upload Different File
            </button>

            <button
              onClick={handleConfirmImport}
              disabled={importing || preview.valid_rows === 0}
              className="btn btn-primary"
              style={{ padding: '12px 28px', fontSize: '15px' }}
            >
              {importing ? 'Importing & Launching Lifecycle...' : (
                <>
                  <Check size={18} />
                  <span>Confirm & Launch Automation ({preview.valid_rows} Valid Records)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
