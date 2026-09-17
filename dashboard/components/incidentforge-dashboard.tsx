"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Bot,
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  Clock3,
  Command,
  Crosshair,
  Database,
  FileSearch,
  GitBranch,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Play,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  Siren,
  Terminal,
  UserRound,
  X,
  CheckCircle2,
  ShieldCheck,
  LockKeyhole,
  TriangleAlert,
  BarChart3,
  Briefcase,
  FolderSearch
} from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import {
  healthApi,
  alertsApi,
  correlationsApi,
  incidentsApi,
  riskApi,
  threatIntelApi,
  investigationsApi,
  casesApi,
  responseApi,
  datasetsApi,
  type Alert,
  type Incident,
  type Case,
  type Correlation,
  type RiskAssessment,
  type ThreatIntelResult,
  type InvestigationResult,
  type ResponseAction,
  type DatasetAsset,
  type DatasetActivity,
} from "@/lib/api"
import {
  IncidentStatusPanel,
  InvestigationQueuePanel,
  MitrePanel,
  RiskCurvePanel,
  SystemStatusPanel,
} from "@/components/incidentforge-widgets"

// ---------------------------------------------------------------------------
// Helpers & Types
// ---------------------------------------------------------------------------

export type SeverityBadgeLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"

function mapSeverity(val: number): SeverityBadgeLevel {
  if (val >= 12) return "CRITICAL"
  if (val >= 8) return "HIGH"
  if (val >= 4) return "MEDIUM"
  return "LOW"
}

const severityClass: Record<SeverityBadgeLevel, string> = {
  CRITICAL: "text-red-400 bg-red-400/10 border-red-400/20",
  HIGH: "text-orange-300 bg-orange-300/10 border-orange-300/20",
  MEDIUM: "text-amber-300 bg-amber-300/10 border-amber-300/20",
  LOW: "text-emerald-300 bg-emerald-300/10 border-emerald-300/20",
}

function SeverityBadge({ severity }: { severity: SeverityBadgeLevel }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] font-bold tracking-wider ${
        severityClass[severity] || severityClass.LOW
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {severity}
    </span>
  )
}

function Panel({
  children,
  className = "",
  title,
  action,
}: {
  children: React.ReactNode
  className?: string
  title?: string
  action?: React.ReactNode
}) {
  return (
    <section
      className={`rounded-xl border border-white/[0.09] bg-[linear-gradient(145deg,#121516,#0a0c0d)] shadow-[0_10px_40px_rgba(0,0,0,0.28)] transition-colors duration-200 ${className}`}
    >
      {title && (
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
            {title}
          </h2>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

function formatTime(isoString?: string | null): string {
  if (!isoString) return "—"
  try {
    const d = new Date(isoString)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  } catch {
    return isoString
  }
}

// ---------------------------------------------------------------------------
// Navigation & Topbar
// ---------------------------------------------------------------------------

const navGroups = [
  { label: "OPERATIONS", items: [["Overview", LayoutDashboard], ["Alerts", Bell], ["Correlations", GitBranch], ["Dataset Assets", Database], ["Dataset Security", Shield]] },
  { label: "INVESTIGATION", items: [["Incidents", ShieldAlert], ["Cases", BriefcaseBusiness], ["AI Investigator", Bot], ["Threat Intelligence", Crosshair]] },
  { label: "RESPONSE", items: [["Response", Siren]] },
  { label: "SYSTEM", items: [["System", Settings]] },
] as const

function Sidebar({
  collapsed,
  setCollapsed,
  page,
  setPage,
  isOnline,
  alertCount,
}: {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  page: string
  setPage: (v: string) => void
  isOnline: boolean
  alertCount: number
}) {
  return (
    <aside
      className={`${
        collapsed ? "w-[68px]" : "w-[236px]"
      } fixed inset-y-0 left-0 z-30 flex flex-col border-r border-white/[0.08] bg-[#070808] shadow-[12px_0_40px_rgba(0,0,0,0.22)] transition-all duration-300`}
    >
      <div className="flex h-16 items-center gap-3 border-b border-white/[0.08] px-4">
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-orange-300/60 bg-[radial-gradient(circle_at_35%_25%,rgba(255,177,92,0.3),rgba(255,101,0,0.12)_46%,rgba(5,5,5,0.8))] text-orange-200 shadow-[0_0_22px_rgba(255,101,0,0.2),inset_0_0_12px_rgba(255,177,92,0.12)]">
          <span className="absolute inset-1 rounded-lg border border-orange-300/20" />
          <Shield size={20} strokeWidth={2.2} />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="font-mono text-[13px] font-bold tracking-[0.16em] text-white">
              INCIDENTFORGE
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto text-slate-500 hover:text-white"
          aria-label="Collapse sidebar"
        >
          <Menu size={17} />
        </button>
      </div>

      <nav className="flex-1 space-y-7 overflow-y-auto px-3 py-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div
              className={`mb-2.5 px-2 text-[9px] font-semibold tracking-[0.18em] text-slate-500 ${
                collapsed ? "text-center" : ""
              }`}
            >
              {collapsed ? "—" : group.label}
            </div>
            {group.items.map(([label, I]) => (
              <button
                key={label}
                onClick={() => setPage(label)}
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs transition-all duration-200 ease-out ${
                  page === label
                    ? "bg-gradient-to-r from-[#ff6500] via-[#ff7a18] to-[#f4510b] text-white shadow-[inset_3px_0_0_#ffb15c,0_4px_18px_rgba(255,101,0,0.22)]"
                    : "text-slate-400 hover:bg-white/[0.045] hover:text-slate-100"
                }`}
                title={collapsed ? label : undefined}
              >
                <I
                  size={16}
                  className={page === label ? "text-orange-300" : "text-slate-500 group-hover:text-slate-300"}
                />
                {!collapsed && <span>{label}</span>}
                {!collapsed && label === "Alerts" && alertCount > 0 && (
                  <span className="ml-auto rounded bg-red-400/10 px-1.5 py-0.5 text-[9px] text-red-300">
                    {alertCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-white/[0.07] p-3">
        <div
          className={`flex items-center gap-2 rounded-md ${
            isOnline ? "bg-emerald-400/[0.06]" : "bg-amber-400/[0.06]"
          } px-2.5 py-2 ${collapsed ? "justify-center" : ""}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isOnline ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-amber-400"
            }`}
          />
          {!collapsed && (
            <span
              className={`text-[10px] font-semibold tracking-wider ${
                isOnline ? "text-emerald-300" : "text-amber-300"
              }`}
            >
              {isOnline ? "API ONLINE" : "API OFFLINE"}
            </span>
          )}
        </div>
        {!collapsed && (
          <div className="mt-3 flex items-center gap-2 px-1 text-[10px] text-slate-500">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-slate-300">
              <UserRound size={12} />
            </div>
            <span>SOC Analyst</span>
            <ChevronDown size={12} className="ml-auto" />
          </div>
        )}
      </div>
    </aside>
  )
}

function Topbar({
  page,
  onCommand,
  onRefresh,
}: {
  page: string
  onCommand: () => void
  onRefresh: () => void
}) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-white/[0.07] bg-[#0a0a0a]/80 px-5 backdrop-blur-xl">
      <div className="text-xs font-medium text-slate-400">
        INCIDENTFORGE <span className="text-slate-600">/</span> {page.toUpperCase()}
      </div>
      <div className="flex items-center gap-2">
        <Search size={13} className="text-slate-500" />
        {page === "Dataset Security" && (
          <label className="cursor-pointer ml-4 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-400">
            + Upload Dataset
            <input
              type="file"
              className="hidden"
              accept=".csv,.json,.jsonl,.parquet"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                if (file) {
                  window.dispatchEvent(new CustomEvent('dataset-upload', { detail: file }));
                }
              }}
            />
          </label>
        )}
        <button
          onClick={onCommand}
          className="hidden h-8 items-center justify-center gap-12 rounded-none border border-white/[0.08] bg-white/[0.025] px-3 text-xs text-slate-500 transition hover:border-orange-400/30 hover:text-slate-300 md:inline-flex"
        >
          Search or jump to...
          <kbd className="ml-4 rounded border border-white/10 px-1.5 py-0.5 font-mono text-[9px]">
            ⌘ K
          </kbd>
        </button>
        <button
          onClick={onCommand}
          className="rounded p-2 text-slate-500 hover:bg-white/5 hover:text-white md:hidden"
        >
          <Search size={16} />
        </button>
        <button
          onClick={onRefresh}
          className="rounded p-2 text-slate-500 hover:bg-white/5 hover:text-white"
          title="Refresh live telemetry"
        >
          <RefreshCw size={15} />
        </button>
        <button className="relative rounded p-2 text-slate-500 hover:bg-white/5 hover:text-white">
          <Bell size={16} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-orange-400" />
        </button>
      </div>
    </header>
  )
}

// ---------------------------------------------------------------------------
// Overview KPI Cards (Live Data)
// ---------------------------------------------------------------------------

function MetricCards({
  alertsCount,
  incidentsCount,
  criticalIncidentsCount,
  casesCount,
}: {
  alertsCount: number
  incidentsCount: number
  criticalIncidentsCount: number
  casesCount: number
}) {
  const metrics = [
    {
      label: "Active Alerts",
      value: String(alertsCount),
      delta: "live",
      detail: "monitored telemetry stream",
      icon: Activity,
    },
    {
      label: "Active Incidents",
      value: String(incidentsCount),
      delta: `${incidentsCount} total`,
      detail: "correlated attack chains",
      icon: ShieldAlert,
    },
    {
      label: "Critical Incidents",
      value: String(criticalIncidentsCount),
      delta: criticalIncidentsCount > 0 ? "urgent" : "nominal",
      detail: "severity score ≥ 12",
      icon: AlertTriangle,
    },
    {
      label: "Open Cases",
      value: String(casesCount),
      delta: "active",
      detail: "under analyst investigation",
      icon: BriefcaseBusiness,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon
        return (
          <div
            key={metric.label}
            className="group relative min-h-[128px] overflow-hidden rounded-xl border border-orange-300/30 bg-gradient-to-br from-[#ff7608] via-[#f45600] to-[#b53100] p-4 text-white shadow-[0_12px_32px_rgba(255,101,0,.22)] before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_85%_15%,rgba(255,255,255,.18),transparent_32%)] transition hover:bg-[#ff7200]"
          >
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/80">
                {metric.label}
              </span>
              <span className="rounded bg-white/15 p-1.5 text-white">
                <Icon size={16} />
              </span>
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div className="font-mono text-3xl font-semibold tracking-tight text-white">
                {metric.value}
              </div>
              <span className="mb-1 flex items-center gap-1 text-[10px] font-medium text-white/90">
                <ArrowUpRight size={12} />
                {metric.delta}
              </span>
            </div>
            <div className="mt-1 flex items-end justify-between gap-3">
              <div className="text-[10px] text-white/75">{metric.detail}</div>
              <div className="flex h-6 items-end gap-0.5 opacity-80">
                {[4, 7, 5, 9, 8, 12, 10, 15, 13, 18].map((height, index) => (
                  <i
                    key={index}
                    className="w-1 rounded-t-sm bg-white/65"
                    style={{ height: `${height}px` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Threat Activity Trend
// ---------------------------------------------------------------------------

function ActivityChart({
  alerts = [],
  incidents = [],
  correlations = [],
}: {
  alerts?: Alert[]
  incidents?: Incident[]
  correlations?: Correlation[]
}) {
  const [period, setPeriod] = useState("24H")

  // Generate 12 time buckets across 24h
  const trendData = Array.from({ length: 12 }, (_, i) => {
    const hour = (i * 2).toString().padStart(2, "0") + ":00"
    return {
      time: hour,
      alerts: Math.max(0, Math.round(alerts.length / 12) + (i % 3 === 0 ? 3 : 1)),
      incidents: Math.max(0, Math.round(incidents.length / 12) + (i % 4 === 0 ? 1 : 0)),
      correlations: Math.max(0, Math.round(correlations.length / 12) + (i % 2 === 0 ? 2 : 0)),
    }
  })

  return (
    <Panel
      title="Threat activity"
      action={
        <div className="flex items-center gap-3 text-[10px] text-slate-500">
          <span>
            <i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-orange-400" />
            Alerts ({alerts.length})
          </span>
          <span>
            <i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[#ff9d3d]" />
            Incidents ({incidents.length})
          </span>
          <span>
            <i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[#f97316]" />
            Correlations ({correlations.length})
          </span>
          <div className="flex gap-1 border-l border-white/10 pl-3" role="group" aria-label="Activity period">
            {["24H", "7D", "30D"].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setPeriod(option)}
                aria-pressed={period === option}
                className={`rounded px-2 py-1 font-mono text-[9px] transition-colors ${
                  period === option
                    ? "bg-orange-500 text-white"
                    : "text-slate-500 hover:bg-white/[0.06] hover:text-slate-200"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      }
    >
      <div className="h-[238px] p-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="alertFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff7a18" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#ff6500" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#ff650018" vertical={false} />
            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: "#ffffff", fontSize: 10 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#ffffff", fontSize: 10 }} width={28} />
            <Tooltip
              contentStyle={{
                background: "#1a1009",
                border: "1px solid #ff650044",
                borderRadius: 6,
                fontSize: 11,
              }}
            />
            <Area type="monotone" dataKey="alerts" stroke="#ff6500" strokeWidth={2.5} fill="url(#alertFill)" />
            <Area type="monotone" dataKey="incidents" stroke="#ff9d3d" strokeWidth={2} fill="none" />
            <Area type="monotone" dataKey="correlations" stroke="#f97316" strokeWidth={1.5} fill="none" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  )
}

// ---------------------------------------------------------------------------
// Detection Pipeline Visualizer
// ---------------------------------------------------------------------------

const pipeline = [
  "EVENT",
  "DETECTION",
  "ALERT",
  "CORRELATION",
  "INCIDENT",
  "ML RISK",
  "THREAT INTEL",
  "AI INVESTIGATION",
  "CASE",
  "RESPONSE",
]

function Pipeline() {
  return (
    <Panel
      title="Detection pipeline"
      action={
        <span className="flex items-center gap-1.5 text-[10px] text-emerald-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Processing live
        </span>
      }
    >
      <div className="flex flex-wrap items-center gap-1.5 px-4 py-4">
        {pipeline.map((item, i) => (
          <div key={item} className="flex items-center gap-1.5">
            <div
              className={`rounded border px-2 py-1.5 font-mono text-[9px] font-semibold tracking-wider ${
                i >= 4
                  ? "border-orange-400/15 bg-orange-400/[0.05] text-orange-300"
                  : "border-white/[0.08] bg-white/[0.025] text-slate-400"
              }`}
            >
              {item}
            </div>
            {i < pipeline.length - 1 && <ChevronRight size={12} className="text-slate-700" />}
          </div>
        ))}
      </div>
    </Panel>
  )
}

// ---------------------------------------------------------------------------
// Live Incidents Table
// ---------------------------------------------------------------------------

function IncidentsTable({
  incidents,
  openIncident,
  loading,
}: {
  incidents: Incident[]
  openIncident: (id: string) => void
  loading: boolean
  onDatasetSelect: (dataset: DatasetAsset) => void
}) {
  return (
    <Panel
      title="Active incidents"
      action={
        <span className="text-[10px] font-medium text-orange-400">
          {incidents.length} recorded
        </span>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b border-white/[0.05] text-[9px] uppercase tracking-wider text-slate-600">
            <tr>
              <th className="px-4 py-2.5 font-medium">Severity</th>
              <th className="px-2 py-2.5 font-medium">Incident</th>
              <th className="px-2 py-2.5 font-medium">Correlations</th>
              <th className="px-2 py-2.5 font-medium">Status</th>
              <th className="px-2 py-2.5 font-medium">First seen</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                  <RefreshCw size={14} className="mx-auto mb-1 animate-spin text-orange-400" />
                  Loading incidents from backend...
                </td>
              </tr>
            ) : incidents.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                  No active incidents found in database.
                </td>
              </tr>
            ) : (
              incidents.map((incident) => {
                const sevLevel = mapSeverity(incident.severity)
                return (
                  <tr
                    key={incident.incident_id}
                    onClick={() => openIncident(incident.incident_id)}
                    className="cursor-pointer border-b border-white/[0.04] text-xs transition hover:bg-white/[0.025]"
                  >
                    <td className="px-4 py-3">
                      <SeverityBadge severity={sevLevel} />
                    </td>
                    <td className="px-2 py-3">
                      <div className="font-medium text-slate-200">{incident.title}</div>
                      <div className="mt-0.5 font-mono text-[10px] text-slate-600">
                        {incident.incident_id}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-slate-400">
                      {incident.correlation_ids?.length || 0} links · {incident.alert_ids?.length || 0} alerts
                    </td>
                    <td className="px-2 py-3">
                      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase text-slate-400">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            incident.status === "investigating"
                              ? "bg-orange-400"
                              : incident.status === "resolved"
                              ? "bg-emerald-400"
                              : "bg-amber-400"
                          }`}
                        />
                        {incident.status}
                      </span>
                    </td>
                    <td className="px-2 py-3 font-mono text-[10px] text-slate-500">
                      {formatTime(incident.first_seen || incident.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <MoreHorizontal size={15} className="text-slate-600" />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

// ---------------------------------------------------------------------------
// Live Alert Stream
// ---------------------------------------------------------------------------

function AlertStream({ alerts, loading, emptyMessage }: { alerts: Alert[]; loading: boolean; emptyMessage?: string }) {
  return (
    <Panel
      title="Live alert stream"
      action={<span className="font-mono text-[9px] text-slate-600">STREAM / {alerts.length}</span>}
    >
      <div className="max-h-[340px] overflow-y-auto bg-[#0a0d0f] p-4 font-mono">
        {loading ? (
          <div className="py-6 text-center text-xs text-slate-500">
            <RefreshCw size={12} className="mx-auto mb-1 animate-spin text-orange-400" />
            Connecting to alert stream...
          </div>
        ) : alerts.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">
            No live alerts in current buffer.
          </div>
        ) : (
          alerts.slice(0, 15).map((alert) => {
            const sevLevel = mapSeverity(alert.severity)
            return (
              <div key={alert.alert_id} className="flex gap-3 py-1.5 text-[10px]">
                <span className="text-slate-600">{formatTime(alert.timestamp)}</span>
                <span className={`w-14 font-bold ${severityClass[sevLevel].split(" ")[0]}`}>
                  {sevLevel}
                </span>
                <span className="flex-1 truncate text-slate-300" title={alert.rule_name}>
                  {alert.rule_name}
                </span>
                <span className="hidden text-slate-600 sm:block">{alert.source}</span>
              </div>
            )
          })
        )}
      </div>
    </Panel>
  )
}

// ---------------------------------------------------------------------------
// Incident Workspace (Deep Inspection)
// ---------------------------------------------------------------------------

function IncidentWorkspace({
  incidentId,
  close,
}: {
  incidentId: string
  close: () => void
}) {
  const [tab, setTab] = useState<
    | "Overview"
    | "Timeline"
    | "Evidence"
    | "ML Risk"
    | "AI Investigation"
    | "Threat Intelligence"
    | "Case"
    | "Response"
  >("Overview")

  const [incident, setIncident] = useState<Incident | null>(null)
  const [risk, setRisk] = useState<RiskAssessment | null>(null)
  const [threatIntel, setThreatIntel] = useState<ThreatIntelResult[]>([])
  const [investigation, setInvestigation] = useState<InvestigationResult | null>(null)
  const [cases, setCases] = useState<Case[]>([])
  const [responseActions, setResponseActions] = useState<ResponseAction[]>([])
  const [loading, setLoading] = useState(true)
  const [investigating, setInvestigating] = useState(false)
  const [actionProcessing, setActionProcessing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load live data for this incident
  const loadIncidentData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [incRes, riskRes, tiRes, invRes, casesRes, respRes] = await Promise.allSettled([
        incidentsApi.getIncident(incidentId),
        riskApi.getIncidentRisk(incidentId),
        threatIntelApi.getIncidentThreatIntel(incidentId),
        investigationsApi.getIncidentInvestigation(incidentId),
        casesApi.listCases({ limit: 10 }),
        responseApi.listResponseActions(incidentId),
      ])

      if (incRes.status === "fulfilled") {
        setIncident(incRes.value)
      } else {
        setError(`Failed to load incident: ${incRes.reason?.message || "Not found"}`)
      }

      if (riskRes.status === "fulfilled") {
        setRisk(riskRes.value)
      } else {
        setRisk(null)
      }

      if (tiRes.status === "fulfilled") {
        setThreatIntel(tiRes.value)
      } else {
        setThreatIntel([])
      }

      if (invRes.status === "fulfilled") {
        setInvestigation(invRes.value)
      } else {
        setInvestigation(null)
      }

      if (casesRes.status === "fulfilled") {
        // filter cases associated with this incident
        const linked = casesRes.value.filter((c) => c.incident_ids?.includes(incidentId))
        setCases(linked)
      }

      if (respRes.status === "fulfilled") {
        setResponseActions(respRes.value)
      } else {
        setResponseActions([])
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading incident")
    } finally {
      setLoading(false)
    }
  }, [incidentId])

  useEffect(() => {
    loadIncidentData()
  }, [loadIncidentData])

  // Trigger on-demand AI investigation
  const handleTriggerInvestigation = async (force: boolean = false) => {
    setInvestigating(true)
    try {
      const res = await investigationsApi.triggerInvestigation(incidentId, { force })
      setInvestigation(res)
    } catch (err: unknown) {
      alert(`AI Investigation failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setInvestigating(false)
    }
  }

  // Response action handlers (Phase 10: simulation only, strict transitions)
  const handleCreateAction = async (actionType: any) => {
    setActionProcessing(actionType)
    try {
      await responseApi.createResponseAction(incidentId, { action_type: actionType, actor: "analyst" })
      const updated = await responseApi.listResponseActions(incidentId)
      setResponseActions(updated)
    } catch (err: unknown) {
      alert(`Action failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setActionProcessing(null)
    }
  }

  const handleApproveAction = async (actionId: string) => {
    setActionProcessing(actionId)
    try {
      await responseApi.approveResponseAction(actionId, { actor: "analyst" })
      const updated = await responseApi.listResponseActions(incidentId)
      setResponseActions(updated)
    } catch (err: unknown) {
      alert(`Approval failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setActionProcessing(null)
    }
  }

  const handleExecuteAction = async (actionId: string) => {
    setActionProcessing(actionId)
    try {
      await responseApi.executeResponseAction(actionId, { actor: "analyst" })
      const updated = await responseApi.listResponseActions(incidentId)
      setResponseActions(updated)
    } catch (err: unknown) {
      alert(`Execution failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setActionProcessing(null)
    }
  }

  const handleRejectAction = async (actionId: string) => {
    setActionProcessing(actionId)
    try {
      await responseApi.rejectResponseAction(actionId, { actor: "analyst", reason: "Analyst rejected in workspace" })
      const updated = await responseApi.listResponseActions(incidentId)
      setResponseActions(updated)
    } catch (err: unknown) {
      alert(`Rejection failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setActionProcessing(null)
    }
  }

  const sevLevel = incident ? mapSeverity(incident.severity) : "MEDIUM"
  const riskScore = risk ? risk.risk_score : incident ? Math.min(100, Math.round((incident.severity / 15) * 100)) : 0

  return (
    <div className="space-y-5">
      {/* Workspace Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <button
              onClick={close}
              className="text-slate-500 hover:text-white"
              title="Return to Overview"
            >
              <ChevronRight size={14} className="rotate-180" />
            </button>
            <span className="font-mono text-xs text-slate-500">INCIDENT / {incidentId}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold text-white">
              {incident?.title || (loading ? "Loading..." : "Unknown Incident")}
            </h2>
            <SeverityBadge severity={sevLevel} />
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase text-orange-300">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
              {incident?.status || "OPEN"}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {incident?.description || "No description recorded for this incident."}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={loadIncidentData}
            className="rounded border border-white/10 p-2 text-slate-400 hover:text-white"
            title="Reload telemetry"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setTab("Response")}
            className="rounded bg-orange-400 px-3 py-2 text-[10px] font-bold text-[#071013] hover:bg-orange-300"
          >
            Open response queue
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Header Metric Chips */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded border border-white/[0.07] bg-[#111519] p-3">
          <span className="text-[9px] uppercase tracking-wider text-slate-600">ML Risk score</span>
          <div className="mt-1 font-mono text-2xl font-semibold text-orange-400">
            {riskScore}
            <span className="text-xs text-slate-600"> / 100</span>
          </div>
        </div>
        <div className="rounded border border-white/[0.07] bg-[#111519] p-3">
          <span className="text-[9px] uppercase tracking-wider text-slate-600">First seen</span>
          <div className="mt-2 font-mono text-sm text-slate-200">
            {formatTime(incident?.first_seen || incident?.created_at)}
          </div>
        </div>
        <div className="rounded border border-white/[0.07] bg-[#111519] p-3">
          <span className="text-[9px] uppercase tracking-wider text-slate-600">Correlated Alerts</span>
          <div className="mt-2 font-mono text-sm text-slate-200">
            {incident?.alert_ids?.length || 0} alerts
          </div>
        </div>
        <div className="rounded border border-white/[0.07] bg-[#111519] p-3">
          <span className="text-[9px] uppercase tracking-wider text-slate-600">MITRE Techniques</span>
          <div className="mt-2 text-sm text-slate-200">
            {incident?.mitre_techniques?.length ? incident.mitre_techniques.join(", ") : "None tagged"}
          </div>
        </div>
      </div>

      {/* Workspace Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-white/[0.08]">
        {[
          "Overview",
          "Timeline",
          "Evidence",
          "ML Risk",
          "AI Investigation",
          "Threat Intelligence",
          "Case",
          "Response",
        ].map((item) => (
          <button
            key={item}
            onClick={() => setTab(item as typeof tab)}
            className={`whitespace-nowrap border-b-2 px-3 py-3 text-[10px] font-medium transition ${
              tab === item
                ? "border-orange-400 text-orange-300"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {tab === "Overview" && (
        <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
          <Panel title="Incident overview & correlations">
            <div className="space-y-4 p-5 text-xs text-slate-300">
              <div className="rounded border border-white/5 bg-black/30 p-3">
                <span className="text-[9px] uppercase tracking-wider text-slate-500">Summary</span>
                <p className="mt-1 leading-relaxed text-slate-300">{incident?.description}</p>
              </div>

              {incident?.evidence && (incident.evidence.dataset_id || (incident.tags && incident.tags.some(t => t.toLowerCase().includes('dataset')))) && (
                <div className="rounded border border-orange-400/20 bg-orange-400/5 p-3">
                  <span className="text-[9px] uppercase tracking-wider text-orange-300 font-bold">Dataset Security Context</span>
                  <div className="mt-2 grid grid-cols-2 gap-y-2 text-[11px]">
                    <div><span className="text-slate-500">Dataset:</span> <span className="text-slate-300">{String(incident.evidence.dataset_name || incident.evidence.dataset_id || "Unknown")}</span></div>
                    <div><span className="text-slate-500">Actor:</span> <span className="text-slate-300">{String(incident.evidence.actor || incident.evidence.entity_key || "Unknown")}</span></div>
                    <div><span className="text-slate-500">Sensitivity:</span> <span className="text-slate-300">{String(incident.evidence.dataset_sensitivity || incident.evidence.sensitivity || "UNKNOWN")}</span></div>
                    <div><span className="text-slate-500">Records Accessed:</span> <span className="text-slate-300 font-mono">{Number(incident.evidence.records_accessed || 0).toLocaleString()}</span></div>
                    {incident.evidence.export_destination && (
                      <div className="col-span-2"><span className="text-slate-500">Export Dest:</span> <span className="text-red-300">{String(incident.evidence.export_destination)}</span></div>
                    )}
                    {Array.isArray(incident.evidence.sensitive_columns) && incident.evidence.sensitive_columns.length > 0 && (
                      <div className="col-span-2"><span className="text-slate-500">Sensitive Columns:</span> <span className="text-orange-300">{incident.evidence.sensitive_columns.join(", ")}</span></div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Associated Correlation IDs
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {incident?.correlation_ids?.length ? (
                    incident.correlation_ids.map((cid) => (
                      <span
                        key={cid}
                        className="rounded border border-orange-400/20 bg-orange-400/5 px-2 py-1 font-mono text-[10px] text-orange-300"
                      >
                        {cid}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-600">No correlations linked</span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Associated Alert IDs
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {incident?.alert_ids?.length ? (
                    incident.alert_ids.map((aid) => (
                      <span
                        key={aid}
                        className="rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-slate-300"
                      >
                        {aid}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-600">No alerts linked</span>
                  )}
                </div>
              </div>
            </div>
          </Panel>

          <div className="space-y-5">
            <Panel title="ML risk preview">
              <div className="p-5">
                <div className="flex items-center gap-5">
                  <div className="relative flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full border-2 border-orange-400/40 bg-[#111519]">
                    <span className="font-mono text-2xl font-semibold text-orange-400">{riskScore}</span>
                    <span className="text-[8px] tracking-wider text-slate-500 uppercase">
                      {risk?.risk_level || "CALCULATED"}
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-400">
                    <div>Model: <span className="font-mono text-slate-200">{risk?.model_name || "heuristic"}</span></div>
                    <div>Version: <span className="font-mono text-slate-200">{risk?.model_version || "v1"}</span></div>
                    <div>Scored: <span className="text-slate-400">{formatTime(risk?.scored_at)}</span></div>
                  </div>
                </div>
                <button
                  onClick={() => setTab("ML Risk")}
                  className="mt-4 flex items-center gap-1 text-[10px] text-orange-400 hover:text-orange-300"
                >
                  View full ML breakdown <ArrowUpRight size={12} />
                </button>
              </div>
            </Panel>

            <Panel title="AI investigation highlight">
              <div className="space-y-3 p-4">
                {investigation ? (
                  <>
                    <div className="rounded border border-orange-400/15 bg-orange-400/[0.04] p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold tracking-widest text-orange-300">OBSERVED SUMMARY</span>
                        <span className="text-[9px] text-slate-600">
                          {Math.round((investigation.confidence || 0) * 100)}% confidence
                        </span>
                      </div>
                      <p className="mt-2 text-[11px] leading-relaxed text-slate-300 line-clamp-3">
                        {investigation.summary}
                      </p>
                    </div>
                    <button
                      onClick={() => setTab("AI Investigation")}
                      className="flex items-center gap-1 text-[10px] text-orange-400 hover:text-orange-300"
                    >
                      Open full investigation report <ArrowUpRight size={12} />
                    </button>
                  </>
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-[11px] text-slate-500">No investigation on record.</p>
                    <button
                      onClick={() => handleTriggerInvestigation(false)}
                      disabled={investigating}
                      className="mt-2 rounded bg-orange-500/20 px-3 py-1.5 text-[10px] font-semibold text-orange-300 hover:bg-orange-500/30"
                    >
                      {investigating ? "Analyzing..." : "Trigger AI Investigator"}
                    </button>
                  </div>
                )}
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* TAB 2: TIMELINE */}
      {tab === "Timeline" && (
        <Panel title="Investigation timeline">
          <div className="p-5">
            {investigation?.timeline?.length ? (
              investigation.timeline.map((item, i) => (
                <div key={i} className="mb-5 flex gap-4">
                  <span className="w-20 shrink-0 font-mono text-[10px] text-slate-600">
                    {formatTime(item.timestamp)}
                  </span>
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-orange-400" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-200">{item.event_type}</span>
                      {item.source_entity && (
                        <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-slate-400">
                          {item.source_entity}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">{item.description}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <span className="w-20 shrink-0 font-mono text-[10px] text-slate-600">
                    {formatTime(incident?.first_seen || incident?.created_at)}
                  </span>
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-orange-400" />
                  <div>
                    <div className="text-xs font-medium text-slate-200">Incident Initial Detection</div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      Correlated from {incident?.alert_ids?.length || 0} alert indicators.
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <span className="w-20 shrink-0 font-mono text-[10px] text-slate-600">
                    {formatTime(incident?.updated_at)}
                  </span>
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                  <div>
                    <div className="text-xs font-medium text-slate-200">Current Incident State</div>
                    <div className="mt-1 text-[11px] text-slate-400">Status is {incident?.status}.</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Panel>
      )}

      {/* TAB 3: EVIDENCE */}
      {tab === "Evidence" && (
        <Panel title="Incident evidence repository">
          <div className="p-5 text-xs text-slate-300">
            {incident?.evidence && Object.keys(incident.evidence).length > 0 ? (
              <pre className="overflow-x-auto rounded bg-black/40 p-4 font-mono text-[11px] text-orange-200/90">
                {JSON.stringify(incident.evidence, null, 2)}
              </pre>
            ) : (
              <div className="flex h-36 flex-col items-center justify-center text-center text-slate-500">
                <FileSearch size={22} className="mb-2 text-slate-600" />
                No raw evidence dictionary payload attached to incident.
              </div>
            )}
          </div>
        </Panel>
      )}

      {/* TAB 4: ML RISK */}
      {tab === "ML Risk" && (
        <Panel title="Machine learning risk assessment">
          <div className="p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded border border-white/10 bg-black/30 p-5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Risk Level & Score
                </span>
                <div className="mt-3 flex items-baseline gap-3">
                  <span className="font-mono text-4xl font-bold text-orange-400">{riskScore}</span>
                  <span className="font-mono text-sm text-slate-500">/ 100</span>
                  <span className="ml-auto rounded bg-orange-400/10 px-2 py-1 font-mono text-xs font-bold uppercase text-orange-300">
                    {risk?.risk_level || "EVALUATED"}
                  </span>
                </div>
                <div className="mt-4 space-y-2 border-t border-white/5 pt-3 text-[11px] text-slate-400">
                  <div>Model: <span className="font-mono text-slate-200">{risk?.model_name || "N/A"}</span></div>
                  <div>Version: <span className="font-mono text-slate-200">{risk?.model_version || "N/A"}</span></div>
                  <div>Feature Version: <span className="font-mono text-slate-200">{risk?.feature_version || "N/A"}</span></div>
                  <div>Scored At: <span className="text-slate-300">{formatTime(risk?.scored_at)}</span></div>
                </div>
              </div>

              <div className="rounded border border-white/10 bg-black/30 p-5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Risk Factors & Reasons
                </span>
                <div className="mt-3 space-y-2 text-xs">
                  {risk?.reasons && risk.reasons.length > 0 ? (
                    risk.reasons.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 text-slate-300">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-orange-400" />
                        <span>{r}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500">Standard heuristic threshold model applied.</div>
                  )}
                </div>
              </div>
            </div>

            {risk?.feature_contributions && Object.keys(risk.feature_contributions).length > 0 && (
              <div className="mt-6">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Feature Contributions
                </span>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {Object.entries(risk.feature_contributions).map(([feat, val]) => (
                    <div key={feat} className="rounded border border-white/5 bg-[#14181b] p-3 text-xs">
                      <div className="truncate font-mono text-[10px] text-slate-500">{feat}</div>
                      <div className="mt-1 font-mono text-base font-semibold text-orange-300">
                        {typeof val === "number" ? val.toFixed(2) : String(val)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Panel>
      )}

      {/* TAB 5: AI INVESTIGATION */}
      {tab === "AI Investigation" && (
        <Panel
          title="AI Investigator (Advisory Engine)"
          action={
            <button
              onClick={() => handleTriggerInvestigation(true)}
              disabled={investigating}
              className="rounded bg-orange-400 px-2.5 py-1 text-[10px] font-bold text-black hover:bg-orange-300 disabled:opacity-50"
            >
              {investigating ? "Analyzing..." : "Re-run Investigation"}
            </button>
          }
        >
          <div className="p-5">
            <div className="mb-4 rounded border border-amber-400/20 bg-amber-400/[0.04] p-3 text-[11px] text-amber-200">
              <strong className="font-semibold">ADVISORY ONLY:</strong> AI Investigator findings are analytical recommendations. Analyst discretion and approval are required for all actions.
            </div>

            {investigation ? (
              <div className="space-y-5">
                <div className="rounded border border-white/5 bg-black/40 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Investigation Executive Summary
                    </span>
                    <span className="font-mono text-[10px] text-orange-300">
                      Confidence: {Math.round(investigation.confidence * 100)}%
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-200">
                    {investigation.summary}
                  </p>
                </div>

                {/* OBSERVED / INFERRED / RECOMMENDED */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Structured Findings
                  </span>
                  {investigation.findings?.map((f, i) => (
                    <div
                      key={i}
                      className={`rounded border p-3 ${
                        f.finding_type === "OBSERVED"
                          ? "border-orange-400/20 bg-orange-400/[0.04]"
                          : f.finding_type === "INFERRED"
                          ? "border-violet-400/20 bg-violet-400/[0.04]"
                          : "border-emerald-400/20 bg-emerald-400/[0.04]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[9px] font-bold tracking-widest ${
                            f.finding_type === "OBSERVED"
                              ? "text-orange-300"
                              : f.finding_type === "INFERRED"
                              ? "text-violet-300"
                              : "text-emerald-300"
                          }`}
                        >
                          {f.finding_type}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-200">{String(f.description)}</p>
                    </div>
                  ))}
                </div>

                {/* GAPS & NEXT STEPS */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded border border-white/10 bg-black/20 p-3">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Investigation Gaps
                    </span>
                    <ul className="mt-2 space-y-1 text-xs text-slate-400">
                      {investigation.investigation_gaps?.map((gap, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-amber-400">•</span> {gap}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded border border-white/10 bg-black/20 p-3">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Recommended Next Steps
                    </span>
                    <ul className="mt-2 space-y-1 text-xs text-slate-300">
                      {investigation.recommended_next_steps?.map((step, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-emerald-400">→</span> {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-500">
                <Bot size={28} className="mx-auto mb-2 text-slate-600" />
                No investigation generated yet. Click &quot;Trigger AI Investigator&quot; to run an automated analysis.
              </div>
            )}
          </div>
        </Panel>
      )}

      {/* TAB 6: THREAT INTELLIGENCE */}
      {tab === "Threat Intelligence" && (
        <Panel title="Threat intelligence indicators (IOCs)">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-white/[0.05] text-[9px] uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">IOC Value</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Classification</th>
                  <th className="px-4 py-3 font-medium">Confidence</th>
                  <th className="px-4 py-3 font-medium">Provider</th>
                  <th className="px-4 py-3 font-medium">Explanation</th>
                </tr>
              </thead>
              <tbody>
                {threatIntel.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                      No IOC threat intelligence enrichments recorded for this incident.
                    </td>
                  </tr>
                ) : (
                  threatIntel.map((ti) => (
                    <tr key={ti.enrichment_id} className="border-b border-white/[0.04] text-xs">
                      <td className="px-4 py-3 font-mono text-slate-200">{ti.ioc_value}</td>
                      <td className="px-4 py-3 uppercase text-slate-500">{ti.ioc_type}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                            ti.classification === "malicious"
                              ? "bg-red-400/10 text-red-400"
                              : ti.classification === "suspicious"
                              ? "bg-amber-400/10 text-amber-300"
                              : "bg-slate-400/10 text-slate-300"
                          }`}
                        >
                          {ti.classification}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-300">{ti.confidence}%</td>
                      <td className="px-4 py-3 text-slate-400">{ti.provider}</td>
                      <td className="px-4 py-3 text-slate-400">{ti.explanation}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* TAB 7: CASE */}
      {tab === "Case" && (
        <Panel title="SOC Case Management">
          <div className="p-5">
            {cases.length > 0 ? (
              <div className="space-y-4">
                {cases.map((c) => (
                  <div key={c.case_id} className="rounded border border-white/10 bg-black/20 p-4 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-orange-300">{c.case_id}</span>
                      <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-300">
                        {c.status}
                      </span>
                    </div>
                    <h4 className="mt-2 text-sm font-semibold text-white">{c.title}</h4>
                    <p className="mt-1 text-slate-400">{c.description}</p>
                    <div className="mt-3 flex gap-4 text-[10px] text-slate-500">
                      <span>Priority: <b className="uppercase text-slate-300">{c.priority}</b></span>
                      <span>Assignee: <b className="text-slate-300">{c.assignee || "Unassigned"}</b></span>
                      <span>Notes: <b className="text-slate-300">{c.notes?.length || 0}</b></span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-slate-500">
                <BriefcaseBusiness size={24} className="mx-auto mb-2 text-slate-600" />
                No dedicated SOC case currently linked to this incident.
              </div>
            )}
          </div>
        </Panel>
      )}

      {/* TAB 8: RESPONSE (Controlled Response Phase 10) */}
      {tab === "Response" && (
        <Panel title="Controlled response queue">
          <div className="border-b border-orange-400/20 bg-orange-400/[0.06] px-5 py-3">
            <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-orange-300">
              <AlertTriangle size={13} />
              SIMULATION ONLY
              <span className="font-normal tracking-normal text-orange-300/60">
                · Analyst approval required · Strict containment sandbox
              </span>
            </div>
          </div>

          <div className="space-y-4 p-5">
            {/* Action Proposal Buttons */}
            <div className="rounded border border-white/5 bg-[#121517] p-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Propose Controlled Simulation Action
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => handleCreateAction("isolate_endpoint")}
                  disabled={actionProcessing !== null}
                  className="rounded border border-orange-400/30 bg-orange-400/10 px-3 py-1.5 text-xs text-orange-200 hover:bg-orange-400/20 disabled:opacity-50"
                >
                  + Propose Isolate Endpoint
                </button>
                <button
                  onClick={() => handleCreateAction("quarantine_file")}
                  disabled={actionProcessing !== null}
                  className="rounded border border-orange-400/30 bg-orange-400/10 px-3 py-1.5 text-xs text-orange-200 hover:bg-orange-400/20 disabled:opacity-50"
                >
                  + Propose Quarantine File
                </button>
                <button
                  onClick={() => handleCreateAction("revoke_credentials")}
                  disabled={actionProcessing !== null}
                  className="rounded border border-orange-400/30 bg-orange-400/10 px-3 py-1.5 text-xs text-orange-200 hover:bg-orange-400/20 disabled:opacity-50"
                >
                  + Propose Revoke Credentials
                </button>
                <button
                  onClick={() => handleCreateAction("restrict_dataset_access")}
                  disabled={actionProcessing !== null}
                  className="rounded border border-orange-400/30 bg-orange-400/10 px-3 py-1.5 text-xs text-orange-200 hover:bg-orange-400/20 disabled:opacity-50"
                >
                  + Propose Restrict Dataset Access
                </button>
              </div>
            </div>

            {/* Response Actions List */}
            <div className="space-y-3">
              {responseActions.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No response actions proposed for this incident yet.
                </div>
              ) : (
                responseActions.map((action) => (
                  <div
                    key={action.action_id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded border border-white/[0.07] bg-white/[0.015] p-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-200">
                          {action.action_type}
                        </span>
                        <span
                          className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                            action.status === "executed"
                              ? "bg-emerald-400/10 text-emerald-300"
                              : action.status === "approved"
                              ? "bg-blue-400/10 text-blue-300"
                              : action.status === "rejected"
                              ? "bg-red-400/10 text-red-300"
                              : "bg-amber-400/10 text-amber-300"
                          }`}
                        >
                          {action.status}
                        </span>
                      </div>
                      <div className="mt-1 font-mono text-[10px] text-slate-500">
                        {action.action_id} · Requested: {formatTime(action.requested_at)}
                        {action.approved_by && ` · Approved by: ${action.approved_by}`}
                        {action.result && ` · Result: ${action.result}`}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {action.status === "proposed" && (
                        <>
                          <button
                            onClick={() => handleApproveAction(action.action_id)}
                            disabled={actionProcessing === action.action_id}
                            className="rounded border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-400/20"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectAction(action.action_id)}
                            disabled={actionProcessing === action.action_id}
                            className="rounded border border-red-400/30 bg-red-400/10 px-2.5 py-1 text-[10px] font-semibold text-red-300 hover:bg-red-400/20"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {action.status === "approved" && (
                        <button
                          onClick={() => handleExecuteAction(action.action_id)}
                          disabled={actionProcessing === action.action_id}
                          className="flex items-center gap-1 rounded bg-orange-400 px-3 py-1 text-[10px] font-bold text-black hover:bg-orange-300"
                        >
                          <Play size={11} /> Simulate Execution
                        </button>
                      )}

                      {action.status === "executed" && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                          <CheckCircle2 size={12} /> Simulation Complete
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Panel>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Overview Main Screen (Connected to Live API)
// ---------------------------------------------------------------------------

function Overview({ onDatasetSelect,
  openIncident,
  alerts,
  incidents,
  correlations,
  cases,
  isOnline,
  loading,
}: {
  openIncident: (id: string) => void
  alerts: Alert[]
  incidents: Incident[]
  correlations: Correlation[]
  cases: Case[]
  isOnline: boolean
  loading: boolean
  onDatasetSelect: (dataset: DatasetAsset) => void
}) {
  const criticalCount = incidents.filter((i) => i.severity >= 12).length

  // Calculate live risk curve from active incidents
  const riskCurveData = incidents.slice(0, 8).map((inc, index) => ({
    time: formatTime(inc.first_seen || inc.created_at),
    risk: Math.min(100, Math.round((inc.severity / 15) * 100)),
    threshold: 65,
  }))

  const peakRisk = incidents.reduce(
    (max, inc) => Math.max(max, Math.min(100, Math.round((inc.severity / 15) * 100))),
    0
  )
  const currentRisk = riskCurveData.length > 0 ? riskCurveData[riskCurveData.length - 1].risk : 0

  return (
    <div className="space-y-4">
      <MetricCards
        alertsCount={alerts.length}
        incidentsCount={incidents.length}
        criticalIncidentsCount={criticalCount}
        casesCount={cases.length}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr]">
        <ActivityChart alerts={alerts} incidents={incidents} correlations={correlations} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr_0.8fr]">
        <MitrePanel incidents={incidents} alerts={alerts} />
        <IncidentStatusPanel incidents={incidents} />
        <SystemStatusPanel isOnline={isOnline} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <RiskCurvePanel
          data={riskCurveData.length > 0 ? riskCurveData : [{ time: "00:00", risk: 0, threshold: 65 }]}
          currentRisk={currentRisk}
          peakRisk={peakRisk}
        />
        <InvestigationQueuePanel cases={cases} openIncident={openIncident} />
      </div>

      <Pipeline />

      <div className="grid gap-4 xl:grid-cols-[1.7fr_0.8fr]">
        <IncidentsTable incidents={incidents} openIncident={openIncident} loading={loading} onDatasetSelect={onDatasetSelect} />
        <AlertStream alerts={alerts} loading={loading} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dataset Security Views (v2.0)
// ---------------------------------------------------------------------------

function DatasetAssetsView({
  onDatasetSelect, datasets, loading }: { onDatasetSelect: any; datasets: DatasetAsset[]; loading: boolean }) {
  if (loading) return <div className="p-8 text-center text-sm text-slate-500 animate-pulse">Loading dataset catalog...</div>

  return (
    <div className="space-y-4">
      <Panel title="Dataset Catalog">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-white/[0.06] bg-black/20 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Dataset Name</th>
                <th className="px-4 py-3">Format</th>
                <th className="px-4 py-3">Sensitivity</th>
                <th className="px-4 py-3 text-right">Records</th>
                <th className="px-4 py-3 text-right">Size (KB)</th>
                <th className="px-4 py-3">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {datasets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No datasets registered.</td>
                </tr>
              ) : (
                datasets.map((ds) => (
                  <tr key={ds.dataset_id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-slate-200">
                      <div className="flex items-center gap-2">
                        <Database size={13} className="text-orange-400" />
                        {ds.name}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] uppercase text-slate-400">
                        {ds.format}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <SeverityBadge severity={ds.sensitivity as SeverityBadgeLevel} />
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[11px] text-slate-400">
                      {ds.record_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[11px] text-slate-400">
                      {Math.round(ds.size_bytes / 1024).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">
                      {formatTime(ds.updated_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}

function DatasetSecurityView({
  overview,
  loading,
  openIncident,
  onSimulate,
  simulating = false,
  simulationFeedback = null,
}: {
  overview: any | null
  loading: boolean
  openIncident: (id: string) => void
  onSimulate: () => void
  simulating?: boolean
  simulationFeedback?: { type: 'success' | 'error'; message: string } | null
}) {
  if (loading) return <div className="p-8 text-center text-sm text-slate-500 animate-pulse">Loading dataset security view...</div>
  if (!overview) {
    return (
      <div className="flex min-h-[65vh] flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-[#111519]/60 text-center">
        <div className="mb-4 rounded-full border border-orange-400/20 bg-orange-400/5 p-4 text-orange-300">
          <Database size={22} />
        </div>
        <h2 className="text-base font-semibold text-white">No dataset selected</h2>
        <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-500">
          Upload a dataset or select one from Dataset Assets to begin security analysis.
        </p>
      </div>
    )
  }

  const selectedDatasetId = overview.dataset_id;
  const datasetAssessment = overview.assessment;
  
  // Use backend-enforced scoped data directly
  const filteredActivities = overview.activities || [];
  const filteredAlerts = overview.alerts || [];
  const filteredIncidents = overview.incidents || [];
  const filteredCorrelations = overview.correlations || [];
  const filteredCases = overview.cases || [];
  const riskAssessments = overview.risk_assessments || [];
  const responseRecords = overview.response_records || [];
  
  const asset = overview.asset;
  const securityScore = datasetAssessment.security_score;
  const findings = datasetAssessment.findings || [];
  
  // Calculate finding severities
  const highFindings = findings.filter((f: any) => f.severity === "CRITICAL" || f.severity === "HIGH").length;
  const medFindings = findings.filter((f: any) => f.severity === "MEDIUM").length;
  const lowFindings = findings.filter((f: any) => f.severity === "LOW" || f.severity === "INFO").length;
  
  // Group activities by type
  const eventTypes = filteredActivities.reduce((acc: Record<string, number>, a: any) => {
    acc[a.operation] = (acc[a.operation] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const eventData = Object.entries(eventTypes).map(([name, value]) => ({ name, value }));

  // Sensitivity Bar Chart Data
  const sensitiveCount = asset.sensitive_columns?.length || 0;
  const totalCount = asset.column_count;
  const nonSensitiveCount = totalCount - sensitiveCount;
  
  const sensitivePct = totalCount > 0 ? Math.round((sensitiveCount / totalCount) * 100) : 0;
  const nonSensitivePct = totalCount > 0 ? Math.round((nonSensitiveCount / totalCount) * 100) : 0;

  // Finding Bar Chart Data
  const findingData = [
    { name: 'HIGH', count: highFindings, fill: '#f87171' },
    { name: 'MEDIUM', count: medFindings, fill: '#fbbf24' },
    { name: 'LOW', count: lowFindings, fill: '#34d399' }
  ].filter(d => d.count > 0);
  
  // Activity Trend Data
  const activityTrendData = filteredActivities.length > 0 ? (
    // Simple chronological mapping (assuming sorted)
    filteredActivities.slice(-15).map((a: any) => ({
       time: new Date(a.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
       events: a.records_accessed || 1
    }))
  ) : [];

  // Consistent Latest ML Risk Assessment (index 0 is newest due to backend sort)
  const latestAssessment = riskAssessments.length > 0 ? riskAssessments[0] : null;

  // Dataset-specific Incident ML Risk Distribution
  const riskLevelCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  riskAssessments.forEach((r: any) => {
    const lvl = (r.risk_level || "").toLowerCase();
    if (lvl in riskLevelCounts) {
      riskLevelCounts[lvl as keyof typeof riskLevelCounts] += 1;
    }
  });

  const mlRiskDistributionData = [
    { level: "CRITICAL", count: riskLevelCounts.critical, fill: "#ef4444" },
    { level: "HIGH", count: riskLevelCounts.high, fill: "#f97316" },
    { level: "MEDIUM", count: riskLevelCounts.medium, fill: "#eab308" },
    { level: "LOW", count: riskLevelCounts.low, fill: "#10b981" },
  ];

  return (
    <div className="space-y-6">
      {/* Simulation Feedback Alert */}
      {simulationFeedback && (
        <div className={`flex items-center justify-between rounded-lg border px-4 py-3 text-xs ${
          simulationFeedback.type === 'success' 
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' 
            : 'border-red-500/30 bg-red-500/10 text-red-300'
        }`}>
          <div className="flex items-center gap-2">
            {simulationFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{simulationFeedback.message}</span>
          </div>
        </div>
      )}

      {/* Repeated Simulation Informational Notice */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-300/90">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-400" />
        <div className="leading-relaxed">
          <span className="font-semibold text-amber-200">Simulation Accumulation Notice: </span>
          Each simulation run injects 4 synthetic SOC events within the 30-minute correlation window. Running repeated simulations will accumulate alerts and events on existing dataset incidents, which legitimately raises incident-level ML risk scores.
        </div>
      </div>

      {/* Header Panel */}
      <Panel className="bg-[#111519] border-none shadow-sm relative overflow-hidden">
        {selectedDatasetId === 'demo-financial-records' && (
           <div className="absolute top-0 right-0 bg-blue-500/20 text-blue-300 text-[9px] font-bold px-3 py-1 uppercase tracking-widest rounded-bl-lg">
              SYNTHETIC / DEMO
           </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400">
              <Database size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                 {asset.name}
              </h2>
              <div className="mt-1 flex items-center gap-3 text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-slate-500"/> {asset.format.toUpperCase()}</span>
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-slate-500"/> {asset.record_count.toLocaleString()} records</span>
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-slate-500"/> {asset.column_count} columns</span>
                <span className={`flex items-center gap-1.5 ${asset.sensitivity === 'HIGH' || asset.sensitivity === 'CRITICAL' ? 'text-red-400' : 'text-amber-400'}`}><span className={`h-1.5 w-1.5 rounded-full ${asset.sensitivity === 'HIGH' || asset.sensitivity === 'CRITICAL' ? 'bg-red-400' : 'bg-amber-400'}`}/> {asset.sensitivity} sensitivity</span>
              </div>
              <div className="mt-3 text-xs text-slate-300">
                 <strong className="text-orange-300">{asset.sensitivity} SENSITIVITY DATASET.</strong> {asset.sensitive_columns?.length || 0} sensitive columns detected across {asset.column_count} columns.
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
             <button 
                onClick={onSimulate}
                disabled={simulating}
                className={`flex items-center gap-2 rounded px-3 py-1.5 text-xs font-semibold text-white shadow transition-all ${
                  simulating 
                    ? "cursor-not-allowed bg-slate-700 text-slate-400 opacity-60" 
                    : "bg-orange-500 hover:bg-orange-600 active:scale-95"
                }`}
             >
                {simulating ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    Simulating Attack...
                  </>
                ) : (
                  <>
                    <Play size={12} fill="currentColor" />
                    Simulate Dataset Security Activity
                  </>
                )}
             </button>
             <div className="text-[9px] text-slate-500 uppercase tracking-widest text-right max-w-[200px]">
                {simulating ? "Processing through SOC pipeline..." : "Injects deterministic demo telemetry through SOC pipeline"}
             </div>
          </div>
        </div>
      </Panel>
      
      {/* Security Score Explanation */}
      {findings.length > 0 && (
         <div className="rounded border border-red-400/20 bg-red-400/5 p-4 text-xs">
            <h3 className="font-semibold text-red-400 mb-2 uppercase tracking-wider text-[10px]">Primary Risk Factors</h3>
            <ul className="space-y-1">
               {findings.map((f: any, i: number) => (
                  <li key={i} className="flex gap-2 items-start text-slate-300">
                     <span className="text-red-400 mt-0.5">•</span>
                     <span>
                        <strong className="text-slate-200">{f.title}</strong>: {String(f.description)}
                     </span>
                  </li>
               ))}
            </ul>
         </div>
      )}


      {/* Hero Metric Widgets (6 Cards) */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-[#121516] p-4 shadow-sm transition hover:border-emerald-400/30">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-emerald-400">
            <span>Posture Score</span>
            <ShieldCheck size={14} />
          </div>
          <div className="mt-2 text-3xl font-mono text-white">{securityScore.score}<span className="text-sm text-slate-500">/100</span></div>
          <div className="mt-1 text-[10px] text-slate-400">Posture: <span className="text-orange-400">{securityScore.risk_level}</span></div>
          <div className="absolute -bottom-2 -right-2 text-emerald-400/5"><ShieldCheck size={64} /></div>
        </div>
        
        <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-[#121516] p-4 shadow-sm transition hover:border-red-400/30">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-red-400">
            <span>Sensitive Fields</span>
            <LockKeyhole size={14} />
          </div>
          <div className="mt-2 text-3xl font-mono text-white">{asset.sensitive_columns?.length || 0}</div>
          <div className="mt-1 text-[10px] text-slate-400">Of {asset.column_count} total</div>
          <div className="absolute -bottom-2 -right-2 text-red-400/5"><LockKeyhole size={64} /></div>
        </div>
        
        <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-[#121516] p-4 shadow-sm transition hover:border-amber-400/30">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-amber-400">
            <span>Security Findings</span>
            <TriangleAlert size={14} />
          </div>
          <div className="mt-2 text-3xl font-mono text-white">{findings.length}</div>
          <div className="mt-1 text-[10px] font-mono text-slate-400">
            <span className="text-red-400">{highFindings} H</span> · <span className="text-amber-400">{medFindings} M</span> · <span className="text-emerald-400">{lowFindings} L</span>
          </div>
          <div className="absolute -bottom-2 -right-2 text-amber-400/5"><TriangleAlert size={64} /></div>
        </div>
        
        <div className="group relative overflow-hidden rounded-xl border border-orange-400/20 bg-orange-400/5 p-4 shadow-sm transition hover:bg-orange-400/10">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-orange-400">
            <span>Dataset Alerts</span>
            <Bell size={14} />
          </div>
          <div className="mt-2 text-3xl font-mono text-orange-300">{filteredAlerts.length}</div>
          <div className="mt-1 text-[10px] text-orange-400/70">Active monitoring</div>
          <div className="absolute -bottom-2 -right-2 text-orange-400/5"><Bell size={64} /></div>
        </div>
        
        <div className="group relative overflow-hidden rounded-xl border border-red-400/20 bg-red-400/5 p-4 shadow-sm transition hover:bg-red-400/10">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-red-400">
            <span>Dataset Incidents</span>
            <ShieldAlert size={14} />
          </div>
          <div className="mt-2 text-3xl font-mono text-red-300">{filteredIncidents.length}</div>
          <div className="mt-1 text-[10px] text-red-400/70">Requires attention</div>
          <div className="absolute -bottom-2 -right-2 text-red-400/5"><ShieldAlert size={64} /></div>
        </div>
        
        <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-[#121516] p-4 shadow-sm transition hover:border-blue-400/30">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-blue-400">
            <span>Open Cases</span>
            <Briefcase size={14} />
          </div>
          <div className="mt-2 text-3xl font-mono text-white">{filteredCases.length}</div>
          <div className="mt-1 text-[10px] text-slate-400">Analyst review</div>
          <div className="absolute -bottom-2 -right-2 text-blue-400/5"><Briefcase size={64} /></div>
        </div>
      </div>

      {/* Analytics Grid */}
      
      {/* ROW 1 */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Dataset Posture Health" className="min-h-[250px]">
          <div className="flex flex-col justify-between p-6 h-full">
            <div>
              <div className="flex items-baseline gap-4">
                <span className={`text-6xl font-bold font-mono ${
                  securityScore.score >= 80 ? 'text-emerald-400' :
                  securityScore.score >= 60 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {securityScore.score}
                </span>
                <span className="text-slate-500 text-sm font-semibold uppercase tracking-wider">/ 100</span>
                <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                  securityScore.risk_level === 'LOW' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  securityScore.risk_level === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {securityScore.risk_level} RISK
                </span>
              </div>
                <p className="mt-4 text-xs leading-relaxed text-slate-400">
                Deterministic backend score derived from column profiling, PII detection, and data sensitivity. Higher is healthier; incident threat risk is shown separately below.
              </p>
            </div>
            
            <div className="mt-6 border-t border-white/5 pt-4">
              <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider mb-2">Deductions Applied</div>
              {securityScore.contributing_factors?.length > 0 ? (
                <div className="space-y-1.5">
                  {securityScore.contributing_factors.map((factor: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-xs">
                      <span className="text-slate-300">{factor.description}</span>
                      <span className="font-mono text-red-400 font-medium">-{factor.deduction}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic">No deductions applied. Clean baseline.</div>
              )}
            </div>
          </div>
        </Panel>
        
        <Panel title="Identified Findings" className="min-h-[250px]">
          <div className="p-4 flex flex-col h-full">
            <p className="mb-4 text-[10px] uppercase text-slate-500 tracking-wider">Security and privacy risks flagged by severity</p>
            {findingData.length > 0 ? (
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={findingData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={true} vertical={false} />
                    <XAxis type="number" stroke="#64748b" fontSize={10} />
                    <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} width={60} />
                    <Tooltip 
                      cursor={{fill: '#ffffff05'}}
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                      {findingData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center text-xs text-slate-500">
                No security findings recorded
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* ROW 2 */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Sensitivity Distribution" className="min-h-[250px]">
          <div className="p-4 flex flex-col h-full">
             <p className="mb-4 text-[10px] uppercase text-slate-500 tracking-wider">Classification of dataset columns</p>
             {totalCount > 0 ? (
               <div className="flex h-48 w-full flex-col justify-center gap-6">
                 <div>
                   <div className="mb-1 flex items-center justify-between text-xs font-semibold text-red-400">
                     <span>HIGH / SENSITIVE</span>
                     <span>{sensitiveCount} fields · {sensitivePct}%</span>
                   </div>
                   <div className="h-3 w-full overflow-hidden rounded bg-white/5">
                     <div className="h-full bg-red-400 transition-all" style={{ width: `${sensitivePct}%` }} />
                   </div>
                 </div>
                 
                 <div>
                   <div className="mb-1 flex items-center justify-between text-xs font-semibold text-emerald-400">
                     <span>LOW / NON-SENSITIVE</span>
                     <span>{nonSensitiveCount} fields · {nonSensitivePct}%</span>
                   </div>
                   <div className="h-3 w-full overflow-hidden rounded bg-white/5">
                     <div className="h-full bg-emerald-400 transition-all" style={{ width: `${nonSensitivePct}%` }} />
                   </div>
                 </div>
               </div>
             ) : (
               <div className="flex flex-1 items-center justify-center text-xs text-slate-500">
                 No sensitivity data available
               </div>
             )}
          </div>
        </Panel>
        
        {eventData.length > 0 && (
        <Panel title="Dataset Event Types" className="min-h-[250px]">
          <div className="p-4 flex flex-col h-full">
             <p className="mb-4 text-[10px] uppercase text-slate-500 tracking-wider">Counts for dataset activity types</p>
               <div className="space-y-3">
                 {eventData.map(ev => (
                    <div key={ev.name} className="flex items-center justify-between border-b border-white/5 pb-2 text-sm">
                      <span className="text-slate-300">{ev.name.replace(/_/g, ' ')}</span>
                      <span className="font-mono text-orange-400 font-semibold">{ev.value}</span>
                    </div>
                 ))}
               </div>
          </div>
        </Panel>
        )}
      </div>

      {/* ROW 3 */}
      <Panel title="Dataset Security Pipeline" className="bg-[#121516] border-none shadow-sm">
        <div className="p-6">
          <div className="relative flex w-full items-center justify-between">
             <div className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-white/5" />
             
             {[
               { id: 'UPLOAD', label: 'Upload', status: 'completed' },
               { id: 'PROFILE', label: 'Profiling', status: 'completed' },
               { id: 'ACTIVITY', label: 'Activity', status: filteredActivities.length > 0 ? 'completed' : 'nodata' },
               { id: 'DETECT', label: 'Detection', status: filteredAlerts.length > 0 ? 'completed' : 'notrigger' },
               { id: 'CORRELATE', label: 'Correlation', status: filteredCorrelations.length > 0 ? 'completed' : 'notrigger' },
               { id: 'INCIDENT', label: 'Incident', status: filteredIncidents.length > 0 ? 'completed' : 'noincident' },
               { id: 'ML', label: 'ML Risk', status: riskAssessments.length > 0 ? 'completed' : 'nodata' },
               { id: 'AI', label: 'AI Investigate', status: filteredIncidents.some((i: any) => i.tags && i.tags.some((t: string) => t.includes('inv-'))) ? 'completed' : 'nodata' },
               { id: 'CASE', label: 'Case', status: filteredCases.length > 0 ? 'completed' : 'notrigger' },
               { id: 'RESPONSE', label: 'Response', status: responseRecords.length > 0 ? 'completed' : 'notrigger' },
             ].map((stage, i) => (
                <div key={stage.id} className="relative z-10 flex flex-col items-center gap-2 bg-[#121516] px-2">
                   <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-[10px] font-bold ${
                      stage.status === 'completed' ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' :
                      stage.status === 'active' ? 'border-orange-500 bg-orange-500/20 text-orange-400' :
                      'border-slate-700 bg-slate-800 text-slate-500'
                   }`}>
                     {stage.status === 'completed' ? '✓' : (i + 1)}
                   </div>
                   <div className="text-center">
                     <div className={`text-[9px] font-bold uppercase tracking-wider ${stage.status === 'active' || stage.status === 'completed' ? 'text-slate-200' : 'text-slate-500'}`}>
                       {stage.label}
                     </div>
                     <div className="mt-0.5 text-[8px] uppercase tracking-widest text-slate-500">
                       {stage.status === 'notrigger' ? 'Not Triggered' : stage.status === 'noincident' ? 'No Incident' : stage.status === 'nodata' ? 'No Data' : stage.status}
                     </div>
                   </div>
                </div>
             ))}
          </div>
        </div>
      </Panel>

      {/* ROW 4: ML Risk & Risk Distribution */}
      <div className="grid gap-4 xl:grid-cols-2">
         {latestAssessment ? (
         <Panel title="Dataset-aware Incident Threat Risk" className="min-h-[220px]">
           <div className="p-4 flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] uppercase text-slate-500 tracking-wider">Latest ML Risk Assessment</p>
                  <span className="font-mono text-[9px] text-slate-400">
                    Incident: {latestAssessment.incident_id?.slice(0, 16)}...
                  </span>
                </div>
                <div className="flex items-center justify-center gap-8 py-4">
                    <div className="text-center">
                       <div className="text-4xl font-mono font-bold text-red-400">{latestAssessment.risk_score}</div>
                       <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">Risk Score</div>
                    </div>
                    <div className="h-12 w-px bg-white/10" />
                    <div className="text-center">
                       <div className="text-xl font-mono font-bold text-slate-200 uppercase">{latestAssessment.risk_level}</div>
                       <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">Risk Level</div>
                    </div>
                </div>
              </div>
              <div className="border-t border-white/5 pt-2 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>Model: {latestAssessment.model_name || "LogisticRegression"}</span>
                <span>Scored: {new Date(latestAssessment.scored_at).toLocaleTimeString()}</span>
              </div>
           </div>
         </Panel>
         ) : (
         <Panel title="Dataset-aware Incident Threat Risk" className="min-h-[220px]">
           <div className="p-6 flex flex-col items-center justify-center h-full text-center">
             <ShieldAlert size={28} className="text-slate-600 mb-2" />
             <div className="text-xs font-semibold text-slate-400">No ML Risk Assessment Yet</div>
             <p className="mt-1 text-[11px] text-slate-500 max-w-xs">
               Simulate activity to trigger detections, correlation, incident creation, and ML risk evaluation.
             </p>
           </div>
         </Panel>
         )}

         {/* Dataset Incident ML Risk Distribution */}
         <Panel title="Dataset Incident Risk Distribution" className="min-h-[220px]">
           <div className="p-4 flex flex-col h-full">
             <div className="flex items-center justify-between mb-3">
               <p className="text-[10px] uppercase text-slate-500 tracking-wider">
                 Incident Risk Levels ({riskAssessments.length} {riskAssessments.length === 1 ? 'assessment' : 'assessments'})
               </p>
               <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono">Filtered to dataset</span>
             </div>
             {riskAssessments.length > 0 ? (
               <div className="flex-1 w-full h-36">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={mlRiskDistributionData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={true} vertical={false} />
                     <XAxis type="number" stroke="#64748b" fontSize={10} allowDecimals={false} />
                     <YAxis dataKey="level" type="category" stroke="#64748b" fontSize={9} width={65} />
                     <Tooltip 
                       cursor={{ fill: '#ffffff05' }}
                       contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }}
                     />
                     <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
                       {mlRiskDistributionData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={entry.fill} />
                       ))}
                     </Bar>
                   </BarChart>
                 </ResponsiveContainer>
               </div>
             ) : (
               <div className="flex flex-1 flex-col items-center justify-center text-center">
                 <div className="text-xs text-slate-500">No incident risk assessments recorded for this dataset</div>
                 <div className="text-[10px] text-slate-600 mt-1">Requires simulated or ingested threat telemetry</div>
               </div>
             )}
           </div>
         </Panel>
      </div>

      {/* ROW 5: Threat Activity summary */}
      {(filteredAlerts.length > 0 || filteredCorrelations.length > 0 || filteredIncidents.length > 0) && (
      <Panel title="Threat Activity" className="min-h-[140px]">
        <div className="p-4 flex flex-col h-full">
           <p className="mb-4 text-[10px] uppercase text-slate-500 tracking-wider">Dataset-scoped threat activity</p>
           <div className="flex flex-1 items-center gap-8 justify-center">
              <div className="text-center">
                 <div className="text-3xl font-mono font-bold text-orange-400">{filteredAlerts.length}</div>
                 <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">Alerts</div>
              </div>
              <div className="h-12 w-px bg-white/10" />
              <div className="text-center">
                 <div className="text-3xl font-mono font-bold text-amber-400">{filteredCorrelations.length}</div>
                 <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">Correlations</div>
              </div>
              <div className="h-12 w-px bg-white/10" />
              <div className="text-center">
                 <div className="text-3xl font-mono font-bold text-red-400">{filteredIncidents.length}</div>
                 <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">Incidents</div>
              </div>
           </div>
        </div>
      </Panel>
      )}

      {/* Detailed Panels */}
      
      {/* Activity Table */}
      {filteredActivities.length > 0 && (
      <Panel title="Recent Dataset Activity">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-white/[0.06] bg-black/20 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Operation</th>
                <th className="px-4 py-3 text-right">Records</th>
                <th className="px-4 py-3">Context</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredActivities.slice(0, 10).map((act: any) => (
                <tr key={act.activity_id} className="transition-colors hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-mono text-[10px] text-slate-400">{new Date(act.timestamp).toLocaleTimeString()}</td>
                  <td className="px-4 py-3 text-slate-200">{act.actor}</td>
                  <td className="px-4 py-3"><span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-orange-200">{act.operation}</span></td>
                  <td className="px-4 py-3 text-right font-mono text-[10px] text-slate-400">{act.records_accessed.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[10px] text-slate-500">
                    {act.export_destination && <span className="block text-red-300">Dest: {act.export_destination}</span>}
                    {act.sensitive_columns?.length > 0 && <span className="block text-orange-300">Cols: {act.sensitive_columns.join(', ')}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      )}

      {(filteredIncidents.length > 0 || filteredAlerts.length > 0) && (
      <div className="grid gap-4 xl:grid-cols-[1.7fr_0.8fr]">
        {filteredIncidents.length > 0 && (
        <IncidentsTable 
           incidents={filteredIncidents} 
           openIncident={openIncident} 
           loading={loading} 
           onDatasetSelect={() => {}}
        />
        )}
        {filteredAlerts.length > 0 && (
        <AlertStream 
           alerts={filteredAlerts} 
           loading={loading} 
        />
        )}
      </div>
      )}

    </div>
  )
}


// ---------------------------------------------------------------------------
// Sidebar Page Views (Live Data)
// ---------------------------------------------------------------------------

function AlertsPageView({ alerts, loading }: { alerts: Alert[]; loading: boolean }) {
  return (
    <div className="space-y-4">
      <Panel title="All Alerts" action={<span className="font-mono text-[9px] text-slate-500">{alerts.length} TOTAL</span>}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-white/[0.06] bg-black/20 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Rule</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Alert ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading && alerts.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500 animate-pulse">Loading alerts...</td></tr>
              ) : alerts.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No alerts detected. Use the Dataset Security view to run a simulation and generate security telemetry.</td></tr>
              ) : (
                alerts.map((a) => (
                  <tr key={a.alert_id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-mono text-[10px] text-slate-400">{formatTime(a.timestamp)}</td>
                    <td className="px-4 py-3"><SeverityBadge severity={mapSeverity(a.severity)} /></td>
                    <td className="px-4 py-3 text-slate-200">{a.rule_name}</td>
                    <td className="px-4 py-3 font-mono text-[10px] text-slate-400">{a.source}</td>
                    <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{a.alert_id}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}

function CorrelationsPageView({ correlations, loading }: { correlations: Correlation[]; loading: boolean }) {
  return (
    <div className="space-y-4">
      <Panel title="All Correlations" action={<span className="font-mono text-[9px] text-slate-500">{correlations.length} TOTAL</span>}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-white/[0.06] bg-black/20 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Rule</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Alerts</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Correlation ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading && correlations.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500 animate-pulse">Loading correlations...</td></tr>
              ) : correlations.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No correlations detected. Correlations are generated automatically when multiple alerts match a correlation rule pattern.</td></tr>
              ) : (
                correlations.map((c) => (
                  <tr key={c.correlation_id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-slate-200">{c.rule_name}</td>
                    <td className="px-4 py-3 font-mono text-[10px] text-orange-300">{c.entity_key}</td>
                    <td className="px-4 py-3 font-mono text-[10px] text-slate-400">{c.alert_ids?.length || 0}</td>
                    <td className="px-4 py-3 font-mono text-[10px] text-slate-400">{formatTime(c.created_at)}</td>
                    <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{c.correlation_id}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}

function IncidentsPageView({ incidents, loading, openIncident }: { incidents: Incident[]; loading: boolean; openIncident: (id: string) => void }) {
  return (
    <div className="space-y-4">
      <Panel title="All Incidents" action={<span className="font-mono text-[9px] text-slate-500">{incidents.length} TOTAL</span>}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-white/[0.06] bg-black/20 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Alerts</th>
                <th className="px-4 py-3">MITRE</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading && incidents.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500 animate-pulse">Loading incidents...</td></tr>
              ) : incidents.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No incidents detected. Incidents are automatically created when correlated alerts cross severity thresholds.</td></tr>
              ) : (
                incidents.map((inc) => (
                  <tr key={inc.incident_id} className="transition-colors hover:bg-white/[0.02] cursor-pointer" onClick={() => openIncident(inc.incident_id)}>
                    <td className="px-4 py-3"><SeverityBadge severity={mapSeverity(inc.severity)} /></td>
                    <td className="px-4 py-3 text-slate-200 max-w-xs truncate">{inc.title}</td>
                    <td className="px-4 py-3"><span className="rounded bg-orange-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-orange-300">{inc.status}</span></td>
                    <td className="px-4 py-3 font-mono text-[10px] text-slate-400">{inc.alert_ids?.length || 0}</td>
                    <td className="px-4 py-3 text-[10px] text-slate-400">{inc.mitre_techniques?.join(", ") || "—"}</td>
                    <td className="px-4 py-3 font-mono text-[10px] text-slate-400">{formatTime(inc.created_at)}</td>
                    <td className="px-4 py-3"><ArrowUpRight size={12} className="text-orange-400" /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}

function CasesPageView({ cases, loading }: { cases: Case[]; loading: boolean }) {
  return (
    <div className="space-y-4">
      <Panel title="SOC Case Management" action={<span className="font-mono text-[9px] text-slate-500">{cases.length} CASES</span>}>
        {loading && cases.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 animate-pulse">Loading cases...</div>
        ) : cases.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <BriefcaseBusiness size={24} className="mx-auto mb-2 text-slate-600" />
            No SOC cases created yet. Cases are created from the Incident Workspace when an analyst escalates an incident.
          </div>
        ) : (
          <div className="space-y-4 p-5">
            {cases.map((c) => (
              <div key={c.case_id} className="rounded border border-white/10 bg-black/20 p-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-orange-300">{c.case_id}</span>
                  <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-300">{c.status}</span>
                </div>
                <h4 className="mt-2 text-sm font-semibold text-white">{c.title}</h4>
                <p className="mt-1 text-slate-400">{c.description}</p>
                <div className="mt-3 flex gap-4 text-[10px] text-slate-500">
                  <span>Priority: <b className="uppercase text-slate-300">{c.priority}</b></span>
                  <span>Assignee: <b className="text-slate-300">{c.assignee || "Unassigned"}</b></span>
                  <span>Incidents: <b className="text-slate-300">{c.incident_ids?.length || 0}</b></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}

function AIInvestigatorPageView({ incidents, loading, openIncident }: { incidents: Incident[]; loading: boolean; openIncident: (id: string) => void }) {
  return (
    <div className="space-y-4">
      <Panel title="AI Investigator" action={<span className="font-mono text-[9px] text-emerald-400">ADVISORY ENGINE</span>}>
        <div className="border-b border-amber-400/20 bg-amber-400/[0.04] px-5 py-3">
          <div className="text-[11px] text-amber-200">
            <strong className="font-semibold">ADVISORY ONLY:</strong> AI Investigator provides analytical recommendations. Select an incident below to view or trigger its AI investigation report.
          </div>
        </div>
        {loading && incidents.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 animate-pulse">Loading incidents for investigation...</div>
        ) : incidents.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <Bot size={28} className="mx-auto mb-2 text-slate-600" />
            No incidents available for AI investigation. Generate security telemetry using the Dataset Security simulation first.
          </div>
        ) : (
          <div className="space-y-3 p-5">
            {incidents.map((inc) => (
              <div key={inc.incident_id} className="flex items-center justify-between rounded border border-white/[0.07] bg-white/[0.015] p-4 transition-colors hover:bg-white/[0.03] cursor-pointer" onClick={() => openIncident(inc.incident_id)}>
                <div>
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={mapSeverity(inc.severity)} />
                    <span className="text-xs text-slate-200">{inc.title}</span>
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-slate-500">{inc.incident_id} · {formatTime(inc.created_at)}</div>
                </div>
                <button className="flex items-center gap-1 rounded bg-orange-500/20 px-2.5 py-1.5 text-[10px] font-semibold text-orange-300 hover:bg-orange-500/30">
                  <Bot size={12} /> Investigate <ArrowUpRight size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}

function ThreatIntelPageView({ incidents, loading, openIncident }: { incidents: Incident[]; loading: boolean; openIncident: (id: string) => void }) {
  return (
    <div className="space-y-4">
      <Panel title="Threat Intelligence" action={<span className="font-mono text-[9px] text-slate-500">IOC ENRICHMENT</span>}>
        <div className="border-b border-white/[0.06] bg-black/20 px-5 py-3">
          <div className="text-[11px] text-slate-400">
            Threat Intelligence enriches incidents with IOC (Indicator of Compromise) lookups. Dataset-only incidents may not have external network IOCs. Select an incident to view its threat intelligence report.
          </div>
        </div>
        {loading && incidents.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 animate-pulse">Loading...</div>
        ) : incidents.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <Crosshair size={24} className="mx-auto mb-2 text-slate-600" />
            No incidents available for threat intelligence lookup. Generate security telemetry using the Dataset Security simulation first.
          </div>
        ) : (
          <div className="space-y-3 p-5">
            {incidents.map((inc) => {
              const isDataset = inc.tags?.some(t => t.includes("dataset:"));
              return (
                <div key={inc.incident_id} className="flex items-center justify-between rounded border border-white/[0.07] bg-white/[0.015] p-4 transition-colors hover:bg-white/[0.03] cursor-pointer" onClick={() => openIncident(inc.incident_id)}>
                  <div>
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={mapSeverity(inc.severity)} />
                      <span className="text-xs text-slate-200">{inc.title}</span>
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-slate-500">{inc.incident_id}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isDataset && <span className="rounded bg-blue-400/10 px-1.5 py-0.5 text-[8px] font-bold text-blue-300">DATASET</span>}
                    <ArrowUpRight size={12} className="text-orange-400" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  )
}

function ResponsePageView({ incidents, loading, openIncident }: { incidents: Incident[]; loading: boolean; openIncident: (id: string) => void }) {
  return (
    <div className="space-y-4">
      <Panel title="Controlled Response Queue" action={<span className="font-mono text-[9px] text-orange-300">SIMULATION ONLY</span>}>
        <div className="border-b border-orange-400/20 bg-orange-400/[0.06] px-5 py-3">
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-orange-300">
            <AlertTriangle size={13} />
            SIMULATION ONLY
            <span className="font-normal tracking-normal text-orange-300/60">· Analyst approval required · Strict containment sandbox</span>
          </div>
        </div>
        {loading && incidents.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 animate-pulse">Loading...</div>
        ) : incidents.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <Siren size={24} className="mx-auto mb-2 text-slate-600" />
            No incidents available for response actions. Select an incident from the Incidents page to propose controlled response actions.
          </div>
        ) : (
          <div className="space-y-3 p-5">
            <p className="text-[11px] text-slate-400 mb-4">Select an incident to propose, approve, and execute simulated response actions.</p>
            {incidents.map((inc) => (
              <div key={inc.incident_id} className="flex items-center justify-between rounded border border-white/[0.07] bg-white/[0.015] p-4 transition-colors hover:bg-white/[0.03] cursor-pointer" onClick={() => openIncident(inc.incident_id)}>
                <div>
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={mapSeverity(inc.severity)} />
                    <span className="text-xs text-slate-200">{inc.title}</span>
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-slate-500">{inc.incident_id} · Status: {inc.status}</div>
                </div>
                <button className="flex items-center gap-1 rounded bg-orange-400 px-3 py-1.5 text-[10px] font-bold text-black hover:bg-orange-300">
                  Open Response Queue <ArrowUpRight size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}

function Placeholder({ page }: { page: string }) {
  return (
    <div className="flex min-h-[65vh] flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-[#111519]/60 text-center">
      <div className="mb-4 rounded-full border border-orange-400/20 bg-orange-400/5 p-4 text-orange-300">
        <Database size={22} />
      </div>
      <h2 className="text-base font-semibold text-white">{page} workspace</h2>
      <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-500">
        This module is connected to live IncidentForge API telemetry.
      </p>
      <span className="mt-4 font-mono text-[10px] text-emerald-400">API CONNECTED</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Root Dashboard Component
// ---------------------------------------------------------------------------

export function IncidentForgeDashboard() {
  const [collapsed, setCollapsed] = useState(false)
  const [page, setPage] = useState("Overview")
  const [incidentId, setIncidentId] = useState<string | null>(null)
  const [commandOpen, setCommandOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Live telemetry state
  const [isOnline, setIsOnline] = useState(false)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [correlations, setCorrelations] = useState<Correlation[]>([])
  const [cases, setCases] = useState<Case[]>([])
  const [datasets, setDatasets] = useState<DatasetAsset[]>([])
  const [datasetActivities, setDatasetActivities] = useState<DatasetActivity[]>([])
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null)
  const [datasetOverview, setDatasetOverview] = useState<any | null>(null)
  const [simulating, setSimulating] = useState(false)
  const [simulationFeedback, setSimulationFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  
  const handleDatasetSelect = async (dataset: DatasetAsset) => {
    setSelectedDatasetId(dataset.dataset_id);
    setDatasetOverview(null);
    setSimulationFeedback(null);
    setPage("Dataset Security");
    setRefreshing(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"
      const response = await fetch(`${baseUrl}/api/v1/data-assets/${dataset.dataset_id}/overview`, {
        method: "GET"
      });
      if (response.ok) {
         const data = await response.json();
         setDatasetOverview(data);
      } else {
         setDatasetOverview(null);
      }
    } catch (err) {
      console.error(err);
      setDatasetOverview(null);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchLiveTelemetry = useCallback(async () => {
    setRefreshing(true)
    try {
      const [healthRes, alertsRes, incidentsRes, correlationsRes, casesRes, datasetsRes, activitiesRes] =
        await Promise.allSettled([
          healthApi.checkHealth(),
          alertsApi.listAlerts({ limit: 100 }),
          incidentsApi.listIncidents({ limit: 50 }),
          correlationsApi.listCorrelations({ limit: 50 }),
          casesApi.listCases({ limit: 50 }),
          datasetsApi.listDatasets(100),
          datasetsApi.getDatasetActivity("all", 100).catch(() => []), // Optional if endpoint supports "all" or generic list
        ])

      setIsOnline(healthRes.status === "fulfilled" && healthRes.value.status === "ok")

      if (alertsRes.status === "fulfilled") setAlerts(alertsRes.value)
      if (incidentsRes.status === "fulfilled") setIncidents(incidentsRes.value)
      if (correlationsRes.status === "fulfilled") setCorrelations(correlationsRes.value)
      if (casesRes.status === "fulfilled") setCases(casesRes.value)
      if (datasetsRes.status === "fulfilled") setDatasets(datasetsRes.value)
      if (activitiesRes.status === "fulfilled") setDatasetActivities(activitiesRes.value)
    } catch {
      setIsOnline(false)
    } finally {
      setRefreshing(false)
    }
  }, [])

  
  useEffect(() => {
    const handleUpload = async (e: Event) => {
      const file = (e as CustomEvent).detail as File;
      setRefreshing(true);
      try {
        const formData = new FormData()
        formData.append("file", file)
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"
        const response = await fetch(`${baseUrl}/api/v1/data-assets/upload`, {
          method: "POST",
          body: formData,
        })
        const data = await response.json()
        if (response.ok) {
          const dsId = data.dataset_id || data.assessment?.dataset_id;
          setSelectedDatasetId(dsId);
          setDatasetOverview(null);
          setSimulationFeedback(null);
          
          const overviewRes = await fetch(`${baseUrl}/api/v1/data-assets/${dsId}/overview`);
          if (overviewRes.ok) {
              setDatasetOverview(await overviewRes.json());
          }
          
          setPage("Dataset Security");
          fetchLiveTelemetry();
        } else {
          alert("Upload failed: " + (data.detail || "Unknown error"));
        }
      } catch (err) {
        alert("Upload failed");
      } finally {
        setRefreshing(false);
      }
    };
    window.addEventListener('dataset-upload', handleUpload);
    return () => window.removeEventListener('dataset-upload', handleUpload);
  }, [fetchLiveTelemetry]);

  useEffect(() => {
    fetchLiveTelemetry()
    // Poll every 30 seconds for live SOC telemetry
    const timer = setInterval(fetchLiveTelemetry, 30000)
    return () => clearInterval(timer)
  }, [fetchLiveTelemetry])

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        page={page}
        setPage={(p) => {
          if (p === "System") {
            window.location.href = "/settings"
            return
          }
          setPage(p)
          setIncidentId(null)
        }}
        isOnline={isOnline}
        alertCount={alerts.length}
      />

      <div className={`${collapsed ? "pl-[68px]" : "pl-[236px]"} transition-all duration-300`}>
        <Topbar page={page} onCommand={() => setCommandOpen(true)} onRefresh={fetchLiveTelemetry} />
        <main className="mx-auto max-w-[1680px] p-3 lg:p-4">
          {refreshing && (
            <div className="fixed right-6 top-20 z-20 flex items-center gap-2 rounded border border-orange-400/20 bg-[#11191d] px-3 py-2 text-[10px] text-orange-300 shadow-xl">
              <RefreshCw size={12} className="animate-spin" />
              Syncing IncidentForge telemetry...
            </div>
          )}

          {incidentId ? (
            <IncidentWorkspace incidentId={incidentId} close={() => setIncidentId(null)} />
          ) : page === "Overview" ? (
            <Overview onDatasetSelect={handleDatasetSelect}
              openIncident={setIncidentId}
              alerts={alerts}
              incidents={incidents}
              correlations={correlations}
              cases={cases}
              isOnline={isOnline}
              loading={refreshing && alerts.length === 0}
            />
          ) : page === "Alerts" ? (
            <AlertsPageView alerts={alerts} loading={refreshing && alerts.length === 0} />
          ) : page === "Correlations" ? (
            <CorrelationsPageView correlations={correlations} loading={refreshing && correlations.length === 0} />
          ) : page === "Incidents" ? (
            <IncidentsPageView incidents={incidents} loading={refreshing && incidents.length === 0} openIncident={setIncidentId} />
          ) : page === "Cases" ? (
            <CasesPageView cases={cases} loading={refreshing && cases.length === 0} />
          ) : page === "AI Investigator" ? (
            <AIInvestigatorPageView incidents={incidents} loading={refreshing && incidents.length === 0} openIncident={setIncidentId} />
          ) : page === "Threat Intelligence" ? (
            <ThreatIntelPageView incidents={incidents} loading={refreshing && incidents.length === 0} openIncident={setIncidentId} />
          ) : page === "Response" ? (
            <ResponsePageView incidents={incidents} loading={refreshing && incidents.length === 0} openIncident={setIncidentId} />
          ) : page === "Dataset Assets" ? (
            <DatasetAssetsView datasets={datasets} loading={refreshing && datasets.length === 0} onDatasetSelect={handleDatasetSelect} />
          ) : page === "Dataset Security" ? (
            <DatasetSecurityView 
              overview={datasetOverview} 
              loading={refreshing && !datasetOverview} 
              openIncident={setIncidentId} 
              simulating={simulating}
              simulationFeedback={simulationFeedback}
              onSimulate={async () => {
                if (simulating || !datasetOverview) return;
                setSimulating(true);
                setSimulationFeedback(null);
                try {
                   await datasetsApi.simulateDatasetAttack(datasetOverview.dataset_id);
                   
                   // Re-fetch dataset overview immediately
                   const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
                   const response = await fetch(`${baseUrl}/api/v1/data-assets/${datasetOverview.dataset_id}/overview`);
                   if (response.ok) {
                      setDatasetOverview(await response.json());
                   }
                   setSimulationFeedback({
                     type: 'success',
                     message: 'Simulation completed: 4 synthetic SOC events processed through Detection, Correlation, Incident, and ML Risk scoring.'
                   });
                   fetchLiveTelemetry();
                } catch (e: any) {
                   console.error(e);
                   setSimulationFeedback({
                     type: 'error',
                     message: `Simulation failed: ${e?.message || 'Unable to execute attack scenario'}`
                   });
                } finally {
                   setSimulating(false);
                }
              }} 
            />
          ) : (
            <Placeholder page={page} />
          )}
        </main>
      </div>

      {/* Quick Jump / Command Palette */}
      {commandOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[15vh]"
          onClick={() => setCommandOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-lg border border-white/10 bg-[#151a1e] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3">
              <Command size={16} className="text-orange-300" />
              <input
                autoFocus
                placeholder="Search IncidentForge..."
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
              />
              <kbd className="text-[10px] text-slate-600">ESC</kbd>
              <button onClick={() => setCommandOpen(false)}>
                <X size={15} className="text-slate-500" />
              </button>
            </div>
            <div className="p-2">
              {[
                "Go to Overview",
                "View Active Incidents",
                "Open AI Investigator",
                "View Threat Intelligence",
                "Open Controlled Response",
              ].map((item, i) => (
                <button
                  key={item}
                  onClick={() => {
                    if (i === 0) setPage("Overview")
                    if (i === 1) setPage("Incidents")
                    if (i === 2) setPage("AI Investigator")
                    if (i === 3) setPage("Threat Intelligence")
                    if (i === 4) setPage("Response")
                    setCommandOpen(false)
                  }}
                  className="flex w-full items-center gap-3 rounded px-3 py-2.5 text-left text-xs text-slate-400 hover:bg-orange-400/10 hover:text-orange-300"
                >
                  <span className="font-mono text-[10px] text-slate-700">{i + 1}</span>
                  {item}
                  <ArrowUpRight size={12} className="ml-auto" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
