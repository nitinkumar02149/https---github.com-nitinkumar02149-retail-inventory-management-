import Link from "next/link";

export function PageHeading({ eyebrow, title, description, action }) {
  return <div className="page-heading"><div className="heading-copy">{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{action && <div className="heading-actions">{action}</div>}</div>;
}

export function StatCard({ label, value, change, tone = "green", icon }) {
  return <article className={`stat-card tone-${tone}`}><div className="stat-top"><span className="stat-label">{label}</span><span className="stat-icon" aria-hidden="true">{icon}</span></div><strong className="stat-value">{value}</strong><div className="stat-foot"><span className="trend-chip">↗ {change}</span><span>vs last month</span></div></article>;
}

export function StatusBadge({ children, tone = "success" }) {
  return <span className={`status-badge status-${tone}`}><i />{children}</span>;
}

export function SectionHeader({ title, caption, href, linkLabel = "View all" }) {
  return <div className="section-header"><div><h2>{title}</h2>{caption && <p>{caption}</p>}</div>{href && <Link className="text-link" href={href}>{linkLabel}<span aria-hidden="true">→</span></Link>}</div>;
}

export function PreviewNotice({ children = "Sample preview data. Changes are not saved because this UI is not connected to the backend." }) {
  return <div className="preview-notice"><span aria-hidden="true">i</span><p>{children}</p></div>;
}

export function DataTable({ columns, rows, emptyMessage = "No records to display." }) {
  return <div className="table-scroll"><table className="data-table"><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row) => <tr key={row.id || row[columns[0].key]}>{columns.map((column) => <td key={column.key}>{row[column.key]}</td>)}</tr>) : <tr><td className="table-empty" colSpan={columns.length}>{emptyMessage}</td></tr>}</tbody></table></div>;
}

export function Field({ label, name, type = "text", placeholder, defaultValue, required = false, options, hint, min, step }) {
  return <label className="field" htmlFor={name}><span className="field-label">{label}{required && <b> *</b>}</span>{options ? <select id={name} name={name} defaultValue={defaultValue || ""} required={required}><option value="" disabled>Select {label.toLowerCase()}</option>{options.map((option) => <option value={option} key={option}>{option}</option>)}</select> : <input id={name} name={name} type={type} placeholder={placeholder} defaultValue={defaultValue} required={required} min={min} step={step} />}{hint && <small>{hint}</small>}</label>;
}