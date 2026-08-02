import { useEffect, useRef, useState } from "react";
import type {
  AppData,
  InventoryItem,
  MenuItem,
  Order,
  OrderStatus,
  Reservation,
  ReservationStatus,
  Session,
  Settings,
  Staff,
} from "./lib/store";
import { THEME_KEY, autoAdvanceOrder, loadData, loadSession, nextId, resetData, saveData, saveSession } from "./lib/store";
import Login from "./pages/Login";
import Guest from "./pages/Guest";
import Admin from "./pages/Admin";
import { Button } from "./components/ui";

export default function App() {
  const [data, setData] = useState<AppData>(() => loadData());
  const [session, setSession] = useState<Session>(() => loadSession());
  const [theme, setTheme] = useState<"dark" | "light">(
    () => (document.documentElement.dataset.theme as "dark" | "light") ?? "dark"
  );
  const [toast, setToast] = useState<string | null>(null);
  const dataRef = useRef<AppData>(data);
  dataRef.current = data;

  useEffect(() => saveData(data), [data]);
  useEffect(() => saveSession(session), [session]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    const t = window.setInterval(() => {
      setData((d) => ({ ...d, orders: d.orders.map((o) => autoAdvanceOrder(o, Date.now())) }));
    }, 4000);
    return () => window.clearInterval(t);
  }, []);

  const notify = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  };

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const handleLogin = (s: Session) => {
    setSession(s);
    notify(s ? `Welcome, ${s.name}!` : "Logged out");
  };
  const handleLogout = () => setSession(null);
  const handleReset = () => {
    setData(resetData());
    setSession(null);
    notify("Demo data reset to fresh sample data.");
  };

  const addOrder = (o: Omit<Order, "id" | "ref" | "subtotal" | "serviceFee" | "total" | "completedAt" | "status" | "createdAt">): Order => {
    const subtotal = o.lines.reduce((s, l) => s + l.price * l.qty, 0);
    const serviceFee =
      o.type === "dine-in" ? Math.round(subtotal * dataRef.current.settings.serviceFeePct) / 100 : 0;
    const id = nextId(dataRef.current.orders);
    const order: Order = { ...o, id, ref: `#B-${1000 + id}`, subtotal, serviceFee, total: Math.round((subtotal + serviceFee) * 100) / 100, status: "placed", createdAt: new Date().toISOString() };
    setData((d) => ({ ...d, orders: [order, ...d.orders] }));
    notify(`Order ${order.ref} placed — kitchen notified`);
    return order;
  };

  const addReservation = (r: Omit<Reservation, "id" | "createdAt" | "status">) => {
    setData((d) => ({
      ...d,
      reservations: [
        { ...r, id: nextId(d.reservations), status: "pending" as const, createdAt: new Date().toISOString() },
        ...d.reservations,
      ],
    }));
    notify("Table reservation requested — pending confirmation");
  };

  const updateOrderStatus = (id: number, status: OrderStatus) =>
    setData((d) => ({
      ...d,
      orders: d.orders.map((o) =>
        o.id === id ? { ...o, status, completedAt: status === "completed" ? new Date().toISOString() : o.completedAt } : o
      ),
    }));

  const upsertMenu = (m: Omit<MenuItem, "id"> & { id?: number }) =>
    setData((d) => {
      if (m.id) return { ...d, menu: d.menu.map((x) => (x.id === m.id ? { ...x, ...m, id: m.id } : x)) };
      return { ...d, menu: [...d.menu, { ...m, id: nextId(d.menu) }] };
    });

  const deleteMenu = (id: number) => setData((d) => ({ ...d, menu: d.menu.filter((m) => m.id !== id) }));

  const toggleMenuAvailable = (id: number) =>
    setData((d) => ({ ...d, menu: d.menu.map((m) => (m.id === id ? { ...m, available: !m.available } : m)) }));

  const updateReservationStatus = (id: number, status: ReservationStatus) =>
    setData((d) => ({ ...d, reservations: d.reservations.map((r) => (r.id === id ? { ...r, status } : r)) }));

  const upsertInventory = (i: Omit<InventoryItem, "id"> & { id?: number }) =>
    setData((d) => {
      if (i.id) return { ...d, inventory: d.inventory.map((x) => (x.id === i.id ? { ...x, ...i, id: i.id } : x)) };
      return { ...d, inventory: [...d.inventory, { ...i, id: nextId(d.inventory) }] };
    });

  const deleteInventory = (id: number) => setData((d) => ({ ...d, inventory: d.inventory.filter((x) => x.id !== id) }));

  const adjustStock = (id: number, delta: number) =>
    setData((d) => ({
      ...d,
      inventory: d.inventory.map((x) => (x.id === id ? { ...x, stock: Math.max(0, Math.round((x.stock + delta) * 100) / 100) } : x)),
    }));

  const upsertStaff = (s: Omit<Staff, "id"> & { id?: number }) =>
    setData((d) => {
      if (s.id) return { ...d, staff: d.staff.map((x) => (x.id === s.id ? { ...x, ...s, id: s.id } : x)) };
      return { ...d, staff: [...d.staff, { ...s, id: nextId(d.staff) }] };
    });

  const deleteStaff = (id: number) => setData((d) => ({ ...d, staff: d.staff.filter((x) => x.id !== id) }));

  const toggleStaffActive = (id: number) =>
    setData((d) => ({ ...d, staff: d.staff.map((x) => (x.id === id ? { ...x, active: !x.active } : x)) }));

  const updateSettings = (s: Settings) => {
    setData((d) => ({ ...d, settings: s }));
    notify("Settings saved");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar theme={theme} onToggleTheme={toggleTheme} session={session} cafeName={data.settings.name} onLogout={handleLogout} />
      <div className="flex-1">
      {!session ? (
        <Login cafeName={data.settings.name} ownerName={data.settings.ownerName} onLogin={handleLogin} onReset={handleReset} />
      ) : session.role === "owner" ? (
        <Admin
          data={data}
          onUpdateOrderStatus={updateOrderStatus}
          onUpsertMenu={upsertMenu}
          onDeleteMenu={deleteMenu}
          onToggleMenuAvailable={toggleMenuAvailable}
          onUpdateReservationStatus={updateReservationStatus}
          onUpsertInventory={upsertInventory}
          onDeleteInventory={deleteInventory}
          onAdjustStock={adjustStock}
          onUpsertStaff={upsertStaff}
          onDeleteStaff={deleteStaff}
          onToggleStaffActive={toggleStaffActive}
          onUpdateSettings={updateSettings}
          onReset={handleReset}
          notify={notify}
        />
      ) : (
        <Guest data={data} dataRef={dataRef} guestName={session.name} addOrder={addOrder} addReservation={addReservation} onLogout={handleLogout} />
      )}
      </div>
      <Footer cafeName={data.settings.name} />
      {toast && (
        <div className="rise fixed bottom-5 left-1/2 z-[70] -translate-x-1/2 rounded-full border border-line bg-panel px-4 py-2 text-sm shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}

function TopBar({
  theme,
  onToggleTheme,
  session,
  cafeName,
  onLogout,
}: {
  theme: "dark" | "light";
  onToggleTheme: () => void;
  session: Session;
  cafeName: string;
  onLogout: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/15 text-lg">🌸</span>
          <div>
            <div className="font-display text-lg font-bold leading-tight">{cafeName}</div>
            {session && (
              <div className="text-[11px] text-muted">
                {session.role === "owner" ? "Owner Console · Concept demo" : `Guest · ${session.name}`}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleTheme}
            className="rounded-lg border border-line bg-panel p-2 text-sm transition hover:bg-panel-2"
            title="Toggle light / dark mode"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          {session && (
            <Button variant="ghost" onClick={onLogout}>
              Log out
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
function Footer({ cafeName }: { cafeName: string }) {
  return (
    <footer className="border-t border-line bg-panel/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-center sm:flex-row sm:text-left">
        <p className="text-xs text-muted">© {new Date().getFullYear()} {cafeName} · Concept demo with sample data</p>
        <a
          href="https://ks-digital-works.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex w-[360px] max-w-full flex-col items-center gap-3 rounded-3xl border border-line bg-panel-2 px-6 py-4 shadow-[0_12px_40px_rgba(0,0,0,0.4)] transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-[0_16px_50px_rgba(0,0,0,0.5)]"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted">Powered by</span>
          <span className="block w-full overflow-hidden rounded-xl border-2 border-accent/30">
            <img src="/ks-logo.png" alt="KS Digital" className="block h-16 w-auto mx-auto transition-transform duration-300 group-hover:scale-105" />
          </span>
        </a>
      </div>
    </footer>
  );
}
