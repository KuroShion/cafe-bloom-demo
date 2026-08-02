import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { AppData, InventoryItem, MenuItem, OrderStatus, ReservationStatus, Settings, Staff } from "../lib/store";
import { CATEGORIES, ORDER_LABEL, ORDER_TONE, RES_STATUS_LABEL, dayOf, exportCSV, fmtMoney, fmtTime, todayISO } from "../lib/store";
import { Badge, Bar, Button, Card, Empty, Field, Input, Modal, Select, Stat, Tabs, Textarea } from "../components/ui";

const NEXT: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  placed: { status: "preparing", label: "▶ Start preparing" },
  preparing: { status: "ready", label: "✅ Mark ready" },
  ready: { status: "completed", label: "✔ Complete" },
};

const RES_TONE: Record<ReservationStatus, "neutral" | "accent" | "terracotta" | "success" | "danger" | "muted"> = {
  pending: "terracotta",
  confirmed: "accent",
  seated: "success",
  completed: "muted",
  cancelled: "danger",
};

interface Props {
  data: AppData;
  onUpdateOrderStatus: (id: number, status: OrderStatus) => void;
  onUpsertMenu: (m: Omit<MenuItem, "id"> & { id?: number }) => void;
  onDeleteMenu: (id: number) => void;
  onToggleMenuAvailable: (id: number) => void;
  onUpdateReservationStatus: (id: number, status: ReservationStatus) => void;
  onUpsertInventory: (i: Omit<InventoryItem, "id"> & { id?: number }) => void;
  onDeleteInventory: (id: number) => void;
  onAdjustStock: (id: number, delta: number) => void;
  onUpsertStaff: (s: Omit<Staff, "id"> & { id?: number }) => void;
  onDeleteStaff: (id: number) => void;
  onToggleStaffActive: (id: number) => void;
  onUpdateSettings: (s: Settings) => void;
  onReset: () => void;
  notify: (msg: string) => void;
}

export default function Admin(props: Props) {
  const { data } = props;
  const cur = data.settings.currency;
  const [tab, setTab] = useState("dashboard");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [resFilter, setResFilter] = useState<ReservationStatus | "all">("all");
  const [menuQ, setMenuQ] = useState("");
  const [menuCat, setMenuCat] = useState("All");
  const [menuModal, setMenuModal] = useState<MenuItem | "new" | null>(null);
  const [invModal, setInvModal] = useState<InventoryItem | "new" | null>(null);
  const [staffModal, setStaffModal] = useState<Staff | "new" | null>(null);

  const today = todayISO();
  const todayOrders = data.orders.filter((o) => dayOf(o.createdAt) === today);
  const completedToday = todayOrders.filter((o) => o.status === "completed");
  const todayRevenue = completedToday.reduce((s, o) => s + o.total, 0);
  const activeResos = data.reservations.filter((r) => r.status === "pending" || r.status === "confirmed" || r.status === "seated");
  const lowStock = data.inventory.filter((i) => i.stock <= i.lowAt);
  const stockValue = data.inventory.reduce((s, i) => s + i.stock * i.cost, 0);
  const counts = { placed: 0, preparing: 0, ready: 0, completed: 0, cancelled: 0 } as Record<OrderStatus, number>;
  for (const o of data.orders) counts[o.status] += 1;

  const week = useMemo(() => {
    const out: { key: string; label: string; rev: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const rev = data.orders.filter((o) => dayOf(o.createdAt) === key && o.status === "completed").reduce((s, o) => s + o.total, 0);
      out.push({ key, label: d.toLocaleDateString(undefined, { weekday: "short" }), rev });
    }
    return out;
  }, [data.orders]);
  const maxRev = Math.max(1, ...week.map((w) => w.rev));

  const topItems = useMemo(() => {
    const map = new Map<number, { name: string; qty: number; rev: number }>();
    for (const o of data.orders) {
      if (o.status === "cancelled") continue;
      for (const l of o.lines) {
        const e = map.get(l.itemId) ?? { name: l.name, qty: 0, rev: 0 };
        e.qty += l.qty;
        e.rev += l.price * l.qty;
        map.set(l.itemId, e);
      }
    }
    return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [data.orders]);

  const catRev = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of data.orders) {
      if (o.status === "cancelled") continue;
      for (const l of o.lines) {
        const cat = data.menu.find((m) => m.id === l.itemId)?.category ?? "Other";
        map.set(cat, (map.get(cat) ?? 0) + l.price * l.qty);
      }
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [data.orders, data.menu]);

  const customers = useMemo(() => {
    const map = new Map<string, { orders: number; total: number; last: string }>();
    for (const o of data.orders) {
      if (o.status === "cancelled") continue;
      const e = map.get(o.customer) ?? { orders: 0, total: 0, last: "" };
      e.orders += 1;
      e.total += o.total;
      if (o.createdAt > e.last) e.last = o.createdAt;
      map.set(o.customer, e);
    }
    return [...map.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.total - a.total);
  }, [data.orders]);

  const filtered = statusFilter === "all" ? data.orders : data.orders.filter((o) => o.status === statusFilter);
  const filteredRes = resFilter === "all" ? data.reservations : data.reservations.filter((r) => r.status === resFilter);
  const filteredMenu = data.menu.filter(
    (m) => (menuCat === "All" || m.category === menuCat) && (menuQ === "" || m.name.toLowerCase().includes(menuQ.toLowerCase()))
  );
  const recent = [...data.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);

  const exportOrders = () =>
    exportCSV("cafe-bloom-orders.csv", [
      ["Ref", "Date", "Type", "Status", "Customer", "Phone", "Table", "Items", "Subtotal", "Service", "Total"],
      ...data.orders.map((o) => [
        o.ref,
        new Date(o.createdAt).toLocaleString(),
        o.type,
        o.status,
        o.customer,
        o.phone,
        o.table ?? "",
        o.lines.map((l) => `${l.qty}x ${l.name}`).join(" | "),
        o.subtotal,
        o.serviceFee,
        o.total,
      ]),
    ]);
  const exportMenu = () =>
    exportCSV("cafe-bloom-menu.csv", [
      ["Name", "Category", "Price", "Desc", "Dietary", "Available"],
      ...data.menu.map((m) => [m.name, m.category, m.price, m.desc, m.dietary.join(", "), m.available ? "yes" : "no"]),
    ]);
  const exportInventory = () =>
    exportCSV("cafe-bloom-inventory.csv", [
      ["Name", "Category", "Stock", "Unit", "Low at", "Cost", "Value"],
      ...data.inventory.map((i) => [i.name, i.category, i.stock, i.unit, i.lowAt, i.cost, i.stock * i.cost]),
    ]);
  const exportReservations = () =>
    exportCSV("cafe-bloom-reservations.csv", [
      ["Customer", "Phone", "Date", "Time", "Guests", "Note", "Status"],
      ...data.reservations.map((r) => [r.customer, r.phone, r.date, r.time, r.guests, r.note, r.status]),
    ]);
  const exportCustomers = () =>
    exportCSV("cafe-bloom-customers.csv", [
      ["Customer", "Orders", "Total Spent", "Last Order"],
      ...customers.map((c) => [c.name, c.orders, c.total, new Date(c.last).toLocaleString()]),
    ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <Tabs
        tabs={[
          { id: "dashboard", label: "Dashboard" },
          { id: "orders", label: "Orders", count: counts.placed + counts.preparing + counts.ready },
          { id: "menu", label: "Menu" },
          { id: "resos", label: "Reservations", count: activeResos.length },
          { id: "inventory", label: "Inventory" },
          { id: "staff", label: "Staff" },
          { id: "reports", label: "Reports" },
          { id: "settings", label: "Settings" },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="mt-5">
        {tab === "dashboard" && (
          <div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Today's revenue" value={fmtMoney(todayRevenue, cur)} sub={`${completedToday.length} completed orders`} tone="accent" />
              <Stat label="Orders today" value={String(todayOrders.length)} sub={`${counts.placed + counts.preparing + counts.ready} active now`} />
              <Stat label="Reservations" value={String(activeResos.length)} sub="pending / confirmed / seated" tone="terracotta" />
              <Stat label="Low stock" value={String(lowStock.length)} sub={`stock value ${fmtMoney(stockValue, cur)}`} tone={lowStock.length > 0 ? "danger" : "success"} />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Card>
                <div className="mb-3 font-display font-bold">Revenue — last 7 days</div>
                <div className="flex h-40 items-end gap-2">
                  {week.map((w) => (
                    <div key={w.key} className="flex flex-1 flex-col items-center gap-1">
                      <div className="h-32 w-full">
                        <Bar value={w.rev} max={maxRev} color="bg-accent" />
                      </div>
                      <div className="text-[10px] text-muted">{w.label}</div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card>
                <div className="mb-3 font-display font-bold">Top items</div>
                <div className="space-y-2">
                  {topItems.map((t, i) => (
                    <div key={t.name} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-panel-2 text-[10px] text-muted">{i + 1}</span>
                        {t.name}
                      </span>
                      <span className="text-muted">
                        {t.qty} sold · <span className="text-foreground">{fmtMoney(t.rev, cur)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            <Card className="mt-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="font-display font-bold">Recent orders</div>
                <Button variant="ghost" onClick={() => setTab("orders")}>
                  View all →
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs text-muted">
                      <th className="pb-2 pr-3 font-medium">Ref</th>
                      <th className="pb-2 pr-3 font-medium">Time</th>
                      <th className="pb-2 pr-3 font-medium">Customer</th>
                      <th className="pb-2 pr-3 font-medium">Type</th>
                      <th className="pb-2 pr-3 font-medium">Total</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((o) => (
                      <tr key={o.id} className="border-b border-line/50 last:border-0">
                        <td className="py-2 pr-3 font-semibold">{o.ref}</td>
                        <td className="py-2 pr-3 text-muted">{fmtTime(o.createdAt)}</td>
                        <td className="py-2 pr-3">{o.customer}</td>
                        <td className="py-2 pr-3 text-muted">
                          {o.type === "dine-in" ? `Dine-in${o.table ? ` ${o.table}` : ""}` : "Takeaway"}
                        </td>
                        <td className="py-2 pr-3 font-semibold">{fmtMoney(o.total, cur)}</td>
                        <td className="py-2">
                          <Badge tone={ORDER_TONE[o.status]}>{ORDER_LABEL[o.status]}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}        {tab === "orders" && (
          <div>
            <div className="flex flex-wrap gap-1">
              {(["all", "placed", "preparing", "ready", "completed", "cancelled"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    statusFilter === s ? "border-accent bg-accent text-ink" : "border-line bg-panel text-muted hover:text-foreground"
                  }`}
                >
                  {s === "all" ? "All" : ORDER_LABEL[s]} ({s === "all" ? data.orders.length : counts[s]})
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {filtered.length === 0 ? (
                <div className="md:col-span-2">
                  <Empty text="No orders in this state." />
                </div>
              ) : (
                filtered.map((o) => (
                  <Card key={o.id} className={o.status === "cancelled" ? "opacity-70" : ""}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-display text-lg font-bold">{o.ref}</span>
                        <span className="ml-2 text-xs text-muted">{fmtTime(o.createdAt)}</span>
                      </div>
                      <Badge tone={ORDER_TONE[o.status]}>{ORDER_LABEL[o.status]}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      {o.customer} · {o.type === "dine-in" ? `Dine-in${o.table ? ` · ${o.table}` : ""}` : "Takeaway"} · {o.phone}
                    </div>
                    <div className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
                      {o.lines.map((l) => (
                        <div key={`${o.id}-${l.itemId}`} className="flex justify-between">
                          <span>
                            {l.qty}× {l.name}
                          </span>
                          <span>{fmtMoney(l.price * l.qty, cur)}</span>
                        </div>
                      ))}
                    </div>
                    {o.note && <div className="mt-2 rounded-lg bg-panel-2 p-2 text-xs text-muted">Note: {o.note}</div>}
                    <div className="mt-2 flex justify-between border-t border-line pt-2 text-sm">
                      <span className="text-muted">
                        {fmtMoney(o.subtotal, cur)}
                        {o.serviceFee > 0 ? ` + ${fmtMoney(o.serviceFee, cur)} service` : ""}
                      </span>
                      <span className="font-bold">{fmtMoney(o.total, cur)}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {NEXT[o.status] && (
                        <Button onClick={() => props.onUpdateOrderStatus(o.id, NEXT[o.status]!.status)}>
                          {NEXT[o.status]!.label}
                        </Button>
                      )}
                      {o.status !== "completed" && o.status !== "cancelled" && (
                        <Button variant="danger" onClick={() => props.onUpdateOrderStatus(o.id, "cancelled")}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {tab === "menu" && (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Input value={menuQ} onChange={(e) => setMenuQ(e.target.value)} placeholder="Search menu…" className="max-w-xs" />
              <Select value={menuCat} onChange={(e) => setMenuCat(e.target.value)} className="max-w-[170px]">
                <option value="All">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
              <div className="flex-1" />
              <Button onClick={() => setMenuModal("new")}>＋ Add item</Button>
            </div>
            <Card className="mt-4 overflow-x-auto p-0">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs text-muted">
                    <th className="p-3 font-medium">Item</th>
                    <th className="p-3 font-medium">Category</th>
                    <th className="p-3 font-medium">Price</th>
                    <th className="p-3 font-medium">Tags</th>
                    <th className="p-3 font-medium">Available</th>
                    <th className="p-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMenu.map((m) => (
                    <tr key={m.id} className="border-b border-line/50 last:border-0">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{m.emoji}</span>
                          <div>
                            <div className="font-medium">
                              {m.name}
                              {m.popular && <span className="ml-1.5 text-xs text-terracotta">★ popular</span>}
                            </div>
                            <div className="max-w-[260px] truncate text-xs text-muted">{m.desc}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-muted">{m.category}</td>
                      <td className="p-3 font-semibold">{fmtMoney(m.price, cur)}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {m.dietary.map((d) => (
                            <Badge key={d} tone="muted">
                              {d}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => props.onToggleMenuAvailable(m.id)}
                          className={`relative h-5 w-9 rounded-full transition ${m.available ? "bg-accent" : "bg-panel-2"}`}
                          title={m.available ? "In stock — click to hide" : "Sold out — click to show"}
                        >
                          <span
                            className={`absolute top-0.5 h-4 w-4 rounded-full bg-foreground transition-all ${
                              m.available ? "left-[18px]" : "left-0.5"
                            }`}
                          />
                        </button>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" className="px-2" onClick={() => setMenuModal(m)}>
                            Edit
                          </Button>
                          <Button variant="danger" className="px-2" onClick={() => props.onDeleteMenu(m.id)}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <MenuForm
              open={menuModal !== null}
              initial={menuModal === "new" ? null : menuModal}
              onClose={() => setMenuModal(null)}
              onSave={(m) => {
                props.onUpsertMenu(m);
                props.notify(m.id ? "Menu item updated" : "Menu item added");
              }}
            />
          </div>
        )}

        {tab === "resos" && (
          <div>
            <div className="flex flex-wrap gap-1">
              {(["all", "pending", "confirmed", "seated", "completed", "cancelled"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setResFilter(s)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    resFilter === s ? "border-accent bg-accent text-ink" : "border-line bg-panel text-muted hover:text-foreground"
                  }`}
                >
                  {s === "all" ? "All" : RES_STATUS_LABEL[s]} (
                  {s === "all" ? data.reservations.length : data.reservations.filter((r) => r.status === s).length})
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-3">
              {filteredRes.length === 0 ? (
                <Empty text="No reservations in this state." />
              ) : (
                filteredRes.map((r) => (
                  <Card key={r.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold">{r.customer}</span>
                        <span className="ml-2 text-xs text-muted">
                          {r.phone} · {r.guests} {r.guests === 1 ? "guest" : "guests"}
                        </span>
                      </div>
                      <Badge tone={RES_TONE[r.status]}>{RES_STATUS_LABEL[r.status]}</Badge>
                    </div>
                    <div className="mt-1 text-sm text-muted">
                      {r.date} · {r.time}
                      {r.note ? <span className="text-foreground"> · “{r.note}”</span> : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {r.status === "pending" && (
                        <Button onClick={() => props.onUpdateReservationStatus(r.id, "confirmed")}>Confirm</Button>
                      )}
                      {r.status === "confirmed" && (
                        <Button onClick={() => props.onUpdateReservationStatus(r.id, "seated")}>Seat guests</Button>
                      )}
                      {r.status === "seated" && (
                        <Button variant="outline" onClick={() => props.onUpdateReservationStatus(r.id, "completed")}>
                          Complete
                        </Button>
                      )}
                      {r.status !== "completed" && r.status !== "cancelled" && (
                        <Button variant="danger" onClick={() => props.onUpdateReservationStatus(r.id, "cancelled")}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}        {tab === "inventory" && (
          <div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat label="Stock value" value={fmtMoney(stockValue, cur)} />
              <Stat label="Low stock items" value={String(lowStock.length)} tone={lowStock.length > 0 ? "danger" : "success"} />
              <Stat label="Items tracked" value={String(data.inventory.length)} />
            </div>
            <Card className="mt-4 overflow-x-auto p-0">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs text-muted">
                    <th className="p-3 font-medium">Item</th>
                    <th className="p-3 font-medium">Category</th>
                    <th className="p-3 font-medium">Stock</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Unit cost</th>
                    <th className="p-3 font-medium">Value</th>
                    <th className="p-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.inventory.map((i) => (
                    <tr key={i.id} className="border-b border-line/50 last:border-0">
                      <td className="p-3 font-medium">{i.name}</td>
                      <td className="p-3 text-muted">{i.category}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Button variant="outline" className="px-2" onClick={() => props.onAdjustStock(i.id, -1)}>
                            −
                          </Button>
                          <span className="w-12 text-center font-semibold">{i.stock}</span>
                          <Button variant="outline" className="px-2" onClick={() => props.onAdjustStock(i.id, 1)}>
                            +
                          </Button>
                          <span className="ml-1 text-xs text-muted">{i.unit}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        {i.stock <= i.lowAt ? <Badge tone="danger">Low</Badge> : <Badge tone="success">OK</Badge>}
                      </td>
                      <td className="p-3 text-muted">{fmtMoney(i.cost, cur)}</td>
                      <td className="p-3 text-muted">{fmtMoney(i.stock * i.cost, cur)}</td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" className="px-2" onClick={() => setInvModal(i)}>
                            Edit
                          </Button>
                          <Button variant="danger" className="px-2" onClick={() => props.onDeleteInventory(i.id)}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <div className="mt-3">
              <Button onClick={() => setInvModal("new")}>＋ Add inventory item</Button>
            </div>
            <InventoryForm
              open={invModal !== null}
              initial={invModal === "new" ? null : invModal}
              onClose={() => setInvModal(null)}
              onSave={(i) => {
                props.onUpsertInventory(i);
                props.notify(i.id ? "Inventory item updated" : "Inventory item added");
              }}
            />
          </div>
        )}

        {tab === "staff" && (
          <div>
            <Card className="overflow-x-auto p-0">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs text-muted">
                    <th className="p-3 font-medium">Name</th>
                    <th className="p-3 font-medium">Role</th>
                    <th className="p-3 font-medium">Active</th>
                    <th className="p-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.staff.map((s) => (
                    <tr key={s.id} className="border-b border-line/50 last:border-0">
                      <td className="p-3 font-medium">{s.name}</td>
                      <td className="p-3 text-muted">{s.role}</td>
                      <td className="p-3">
                        <button
                          onClick={() => props.onToggleStaffActive(s.id)}
                          className={`relative h-5 w-9 rounded-full transition ${s.active ? "bg-accent" : "bg-panel-2"}`}
                        >
                          <span
                            className={`absolute top-0.5 h-4 w-4 rounded-full bg-foreground transition-all ${
                              s.active ? "left-[18px]" : "left-0.5"
                            }`}
                          />
                        </button>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="danger" className="px-2" onClick={() => props.onDeleteStaff(s.id)}>
                            Remove
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <div className="mt-3">
              <Button onClick={() => setStaffModal("new")}>＋ Add staff</Button>
            </div>
            <StaffForm
              open={staffModal !== null}
              initial={staffModal === "new" ? null : staffModal}
              onClose={() => setStaffModal(null)}
              onSave={(s) => {
                props.onUpsertStaff(s);
                props.notify(s.id ? "Staff updated" : "Staff added");
              }}
            />
          </div>
        )}        {tab === "reports" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <div className="mb-3 font-display font-bold">Top items (all time)</div>
              <div className="space-y-2">
                {topItems.map((t, i) => (
                  <div key={t.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-panel-2 text-[10px] text-muted">{i + 1}</span>
                      {t.name}
                    </span>
                    <span className="text-muted">
                      {t.qty} sold · <span className="text-foreground">{fmtMoney(t.rev, cur)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <div className="mb-3 font-display font-bold">Revenue by category</div>
              <div className="space-y-2">
                {catRev.map(([cat, rev]) => (
                  <div key={cat} className="flex items-center gap-2 text-sm">
                    <span className="w-24 text-muted">{cat}</span>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-panel-2">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${Math.max(4, (rev / (catRev[0]?.[1] ?? 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="w-20 text-right font-semibold">{fmtMoney(rev, cur)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 border-t border-line pt-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Dine-in revenue</span>
                  <span className="font-semibold">
                    {fmtMoney(
                      data.orders.filter((o) => o.type === "dine-in" && o.status !== "cancelled").reduce((s, o) => s + o.total, 0),
                      cur
                    )}
                  </span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-muted">Takeaway revenue</span>
                  <span className="font-semibold">
                    {fmtMoney(
                      data.orders.filter((o) => o.type === "takeaway" && o.status !== "cancelled").reduce((s, o) => s + o.total, 0),
                      cur
                    )}
                  </span>
                </div>
              </div>
            </Card>
            <Card>
              <div className="mb-3 font-display font-bold">Export data</div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={exportOrders}>📄 Orders CSV</Button>
                <Button variant="outline" onClick={exportMenu}>Menu CSV</Button>
                <Button variant="outline" onClick={exportInventory}>Inventory CSV</Button>
                <Button variant="outline" onClick={exportReservations}>Reservations CSV</Button>
                <Button variant="outline" onClick={exportCustomers}>Customers CSV</Button>
              </div>
              <p className="mt-3 text-xs text-muted">CSV exports open directly in Excel / Google Sheets (UTF-8).</p>
            </Card>
            <Card>
              <div className="mb-3 font-display font-bold">Top customers</div>
              <div className="space-y-2">
                {customers.slice(0, 5).map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-panel-2 text-[10px] text-muted">{i + 1}</span>
                      {c.name}
                    </span>
                    <span className="text-muted">
                      {c.orders} orders · <span className="text-foreground">{fmtMoney(c.total, cur)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {tab === "settings" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <SettingsForm
              settings={data.settings}
              onSave={(s) => {
                props.onUpdateSettings(s);
              }}
            />
            <Card className="h-fit">
              <div className="font-display font-bold text-danger">Danger zone</div>
              <p className="mt-1 text-xs text-muted">
                Restore all demo data (menu, orders, reservations, inventory, staff) to the original sample set.
              </p>
              <Button variant="danger" className="mt-3" onClick={props.onReset}>
                Reset demo data
              </Button>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
function MenuForm({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: MenuItem | null;
  onClose: () => void;
  onSave: (m: Omit<MenuItem, "id"> & { id?: number }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [emoji, setEmoji] = useState(initial?.emoji ?? "🍽️");
  const [category, setCategory] = useState<string>(initial?.category ?? CATEGORIES[0]);
  const [price, setPrice] = useState(String(initial?.price ?? ""));
  const [desc, setDesc] = useState(initial?.desc ?? "");
  const [tag, setTag] = useState(initial?.tag ?? "");
  const [popular, setPopular] = useState(initial?.popular ?? false);
  const [available, setAvailable] = useState(initial?.available ?? true);
  const [dietary, setDietary] = useState<string[]>(initial?.dietary ?? []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || price === "") return;
    onSave({
      id: initial?.id,
      name: name.trim(),
      emoji: emoji.trim() || "🍽️",
      category: category as MenuItem["category"],
      price: Math.max(0, Number(price) || 0),
      desc: desc.trim(),
      tag: tag.trim() || undefined,
      popular,
      available,
      dietary,
    });
    onClose();
  };

  const toggleDiet = (d: string) =>
    setDietary((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit menu item" : "Add menu item"}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-[80px_1fr] gap-3">
          <Field label="Emoji">
            <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} />
          </Field>
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rose Latte" required />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Price">
            <Input type="number" min={0} step="0.5" value={price} onChange={(e) => setPrice(e.target.value)} required />
          </Field>
        </div>
        <Field label="Description">
          <Textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Short description" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tag (optional)">
            <Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. Signature" />
          </Field>
          <Field label="Dietary">
            <div className="flex flex-wrap gap-1 pt-1">
              {["vegan", "vegetarian", "halal"].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDiet(d)}
                  className={`rounded-full border px-2 py-0.5 text-xs transition ${
                    dietary.includes(d) ? "border-accent bg-accent/15 text-accent" : "border-line bg-panel-2 text-muted"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </Field>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={popular} onChange={(e) => setPopular(e.target.checked)} className="accent-[var(--accent)]" />
            Popular
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} className="accent-[var(--accent)]" />
            Available
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{initial ? "Save changes" : "Add item"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function InventoryForm({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: InventoryItem | null;
  onClose: () => void;
  onSave: (i: Omit<InventoryItem, "id"> & { id?: number }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "Coffee");
  const [stock, setStock] = useState(String(initial?.stock ?? ""));
  const [unit, setUnit] = useState(initial?.unit ?? "kg");
  const [lowAt, setLowAt] = useState(String(initial?.lowAt ?? ""));
  const [cost, setCost] = useState(String(initial?.cost ?? ""));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      id: initial?.id,
      name: name.trim(),
      category: category.trim() || "Other",
      stock: Math.max(0, Number(stock) || 0),
      unit: unit.trim() || "pcs",
      lowAt: Math.max(0, Number(lowAt) || 0),
      cost: Math.max(0, Number(cost) || 0),
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit inventory item" : "Add inventory item"}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Vanilla syrup" required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <Input value={category} onChange={(e) => setCategory(e.target.value)} />
          </Field>
          <Field label="Unit">
            <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="kg / L / pcs" />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Stock">
            <Input type="number" min={0} step="0.5" value={stock} onChange={(e) => setStock(e.target.value)} required />
          </Field>
          <Field label="Low at">
            <Input type="number" min={0} step="0.5" value={lowAt} onChange={(e) => setLowAt(e.target.value)} required />
          </Field>
          <Field label="Cost">
            <Input type="number" min={0} step="0.5" value={cost} onChange={(e) => setCost(e.target.value)} required />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{initial ? "Save changes" : "Add item"}</Button>
        </div>
      </form>
    </Modal>
  );
}
function StaffForm({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: Staff | null;
  onClose: () => void;
  onSave: (s: Omit<Staff, "id"> & { id?: number }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState(initial?.role ?? "Barista");
  const [active, setActive] = useState(initial?.active ?? true);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ id: initial?.id, name: name.trim(), role, active });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit staff" : "Add staff"}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required />
        </Field>
        <Field label="Role">
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            {["Owner", "Barista", "Kitchen", "Server"].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="accent-[var(--accent)]" />
          Active on shift
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{initial ? "Save changes" : "Add staff"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function SettingsForm({ settings, onSave }: { settings: Settings; onSave: (s: Settings) => void }) {
  const [name, setName] = useState(settings.name);
  const [currency, setCurrency] = useState(settings.currency);
  const [serviceFeePct, setServiceFeePct] = useState(String(settings.serviceFeePct));
  const [dineInTables, setDineInTables] = useState(String(settings.dineInTables));
  const [ownerName, setOwnerName] = useState(settings.ownerName);
  const [openingHours, setOpeningHours] = useState(settings.openingHours);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave({
      name: name.trim() || "Café Bloom",
      currency,
      serviceFeePct: Math.max(0, Number(serviceFeePct) || 0),
      dineInTables: Math.max(1, Number(dineInTables) || 1),
      ownerName: ownerName.trim() || "Owner",
      openingHours: openingHours.trim() || "8:00 AM – 10:00 PM",
    });
  };

  return (
    <Card>
      <div className="mb-3 font-display font-bold">Café settings</div>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Café name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Currency">
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {["RM", "USD", "SGD"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Service charge (%)">
            <Input type="number" min={0} step="0.5" value={serviceFeePct} onChange={(e) => setServiceFeePct(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Dine-in tables">
            <Input type="number" min={1} value={dineInTables} onChange={(e) => setDineInTables(e.target.value)} />
          </Field>
          <Field label="Owner name">
            <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
          </Field>
        </div>
        <Field label="Opening hours">
          <Input value={openingHours} onChange={(e) => setOpeningHours(e.target.value)} />
        </Field>
        <Button type="submit">Save settings</Button>
      </form>
    </Card>
  );
}