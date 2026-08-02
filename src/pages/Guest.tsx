import { useEffect, useMemo, useState } from "react";
import type { FormEvent, MutableRefObject } from "react";
import type { AppData, MenuItem, Order, OrderStatus, OrderType, Reservation } from "../lib/store";
import { CATEGORIES, CART_KEY, ORDER_LABEL, fmtMoney, fmtTime, todayISO } from "../lib/store";
import { Badge, Button, Card, Empty, Field, Input, Modal, OrderProgress, Select, Tabs, Textarea } from "../components/ui";

interface CartLine {
  itemId: number;
  name: string;
  price: number;
  qty: number;
}

interface Props {
  data: AppData;
  dataRef: MutableRefObject<AppData>;
  guestName: string;
  addOrder: (o: Omit<Order, "id" | "ref" | "subtotal" | "serviceFee" | "total" | "completedAt" | "status" | "createdAt">) => Order;
  addReservation: (r: Omit<Reservation, "id" | "createdAt" | "status">) => void;
  onLogout: () => void;
}

const TIME_SLOTS = ["9:00 AM", "10:30 AM", "12:00 PM", "1:30 PM", "3:00 PM", "4:30 PM", "6:00 PM", "7:30 PM", "9:00 PM"];
const ORDER_TONE: Record<OrderStatus, "neutral" | "accent" | "terracotta" | "success" | "danger" | "muted"> = {
  placed: "terracotta",
  preparing: "accent",
  ready: "success",
  completed: "muted",
  cancelled: "danger",
};

export default function Guest({ data, guestName, addOrder, addReservation }: Props) {
  const [tab, setTab] = useState("menu");
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [diet, setDiet] = useState<string[]>([]);
  const [item, setItem] = useState<MenuItem | null>(null);
  const [qty, setQty] = useState(1);
  const [cart, setCart] = useState<CartLine[]>(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? (JSON.parse(raw) as CartLine[]) : [];
    } catch {
      return [];
    }
  });
  const [orderType, setOrderType] = useState<OrderType>("dine-in");
  const [table, setTable] = useState("T1");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [lastRef, setLastRef] = useState(() => localStorage.getItem("cafe-bloom-last-ref") ?? "");
  const [rDate, setRDate] = useState(todayISO());
  const [rTime, setRTime] = useState(TIME_SLOTS[3]);
  const [rGuests, setRGuests] = useState(2);
  const [rPhone, setRPhone] = useState("");
  const [rNote, setRNote] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      /* ignore */
    }
  }, [cart]);

  const menu = useMemo(
    () =>
      data.menu.filter(
        (m) =>
          (cat === "All" || m.category === cat) &&
          (q === "" || m.name.toLowerCase().includes(q.toLowerCase()) || m.desc.toLowerCase().includes(q.toLowerCase())) &&
          (diet.length === 0 || diet.every((d) => m.dietary.includes(d)))
      ),
    [data.menu, cat, q, diet]
  );

  const dietaryOptions = useMemo(() => [...new Set(data.menu.flatMap((m) => m.dietary))], [data.menu]);
  const cartCount = cart.reduce((s, l) => s + l.qty, 0);
  const subtotal = cart.reduce((s, l) => s + l.price * l.qty, 0);
  const serviceFee = orderType === "dine-in" ? Math.round(subtotal * data.settings.serviceFeePct) / 100 : 0;
  const total = subtotal + serviceFee;

  const addToCart = () => {
    if (!item) return;
    setCart((prev) => {
      const found = prev.find((l) => l.itemId === item.id);
      if (found) return prev.map((l) => (l.itemId === item.id ? { ...l, qty: l.qty + qty } : l));
      return [...prev, { itemId: item.id, name: item.name, price: item.price, qty }];
    });
    setItem(null);
    setQty(1);
  };

  const placeOrder = () => {
    if (cart.length === 0) return;
    const order = addOrder({
      lines: cart,
      type: orderType,
      customer: guestName,
      phone: phone || "+60 12-000 0000",
      note,
      table: orderType === "dine-in" ? table : undefined,
    });
    setCart([]);
    setPhone("");
    setNote("");
    setLastRef(order.ref);
    try {
      localStorage.setItem("cafe-bloom-last-ref", order.ref);
    } catch {
      /* ignore */
    }
    setTab("order");
  };

  const bookTable = (e: FormEvent) => {
    e.preventDefault();
    addReservation({
      customer: guestName,
      phone: rPhone || "+60 12-000 0000",
      guests: rGuests,
      date: rDate,
      time: rTime,
      note: rNote,
    });
    setRPhone("");
    setRNote("");
    setTab("resos");
  };

  const myOrder = data.orders.find((o) => o.ref === lastRef) ?? null;
  const myResos = data.reservations.filter((r) => r.customer === guestName);
  const myOrders = data.orders.filter((o) => o.customer === guestName);
  const totalSpent = myOrders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);
  const sortedOrders = [...myOrders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <Tabs
        tabs={[
          { id: "menu", label: "Menu" },
          { id: "cart", label: "Cart", count: cartCount },
          { id: "order", label: "My Order" },
          { id: "resos", label: "Reservations" },
          { id: "profile", label: "Profile" },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="mt-5">
        {tab === "menu" && (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search menu…" className="max-w-xs" />
              <div className="flex flex-wrap gap-1">
                {["All", ...CATEGORIES].map((c) => (
                  <button
                    key={c}
                    onClick={() => setCat(c)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      cat === c ? "border-accent bg-accent text-ink" : "border-line bg-panel text-muted hover:text-foreground"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            {dietaryOptions.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1 text-xs">
                <span className="text-muted">Dietary:</span>
                {dietaryOptions.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDiet((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))}
                    className={`rounded-full border px-2.5 py-0.5 transition ${
                      diet.includes(d) ? "border-accent bg-accent/15 text-accent" : "border-line bg-panel text-muted"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {menu.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setItem(m);
                    setQty(1);
                  }}
                  className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-accent/60 ${
                    m.available ? "border-line bg-panel" : "border-line bg-panel opacity-50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-3xl">{m.emoji}</span>
                    {m.popular && <Badge tone="terracotta">Popular</Badge>}
                  </div>
                  <div className="mt-2 font-semibold">{m.name}</div>
                  <div className="mt-0.5 line-clamp-2 text-xs text-muted">{m.desc}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-accent">{fmtMoney(m.price, data.settings.currency)}</span>
                    {!m.available && <span className="text-xs text-muted">Sold out</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === "cart" && (
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <Card>
              <div className="mb-3 font-display font-bold">Your cart</div>
              {cart.length === 0 ? (
                <Empty text="Your cart is empty — browse the menu and add something tasty." />
              ) : (
                <div className="space-y-3">
                  {cart.map((l) => (
                    <div key={l.itemId} className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium">{l.name}</div>
                        <div className="text-xs text-muted">{fmtMoney(l.price, data.settings.currency)} each</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          className="px-2"
                          onClick={() =>
                            setCart((prev) =>
                              prev
                                .map((x) => (x.itemId === l.itemId ? { ...x, qty: x.qty - 1 } : x))
                                .filter((x) => x.qty > 0)
                            )
                          }
                        >
                          −
                        </Button>
                        <span className="w-6 text-center text-sm font-semibold">{l.qty}</span>
                        <Button
                          variant="outline"
                          className="px-2"
                          onClick={() => setCart((prev) => prev.map((x) => (x.itemId === l.itemId ? { ...x, qty: x.qty + 1 } : x)))}
                        >
                          +
                        </Button>
                        <button
                          className="ml-1 text-xs text-muted hover:text-danger"
                          onClick={() => setCart((prev) => prev.filter((x) => x.itemId !== l.itemId))}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <div className="space-y-4">
              <Card className="space-y-3">
                <div className="font-display font-bold">Order details</div>
                <div className="grid grid-cols-2 gap-1 rounded-lg border border-line bg-panel-2 p-1">
                  {(["dine-in", "takeaway"] as OrderType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setOrderType(t)}
                      className={`rounded-md py-1.5 text-sm font-medium transition ${
                        orderType === t ? "bg-accent text-ink" : "text-muted hover:text-foreground"
                      }`}
                    >
                      {t === "dine-in" ? "Dine-in" : "Takeaway"}
                    </button>
                  ))}
                </div>
                {orderType === "dine-in" && (
                  <Field label="Table">
                    <Select value={table} onChange={(e) => setTable(e.target.value)}>
                      {Array.from({ length: data.settings.dineInTables }, (_, i) => `T${i + 1}`).map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
                <Field label="Phone">
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+60 12-345 6789" />
                </Field>
                <Field label="Note (optional)">
                  <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any allergies or requests…" />
                </Field>
              </Card>
              <Card>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-muted">
                    <span>Subtotal</span>
                    <span>{fmtMoney(subtotal, data.settings.currency)}</span>
                  </div>
                  {serviceFee > 0 && (
                    <div className="flex justify-between text-muted">
                      <span>Service ({data.settings.serviceFeePct}%)</span>
                      <span>{fmtMoney(serviceFee, data.settings.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-line pt-2 font-bold">
                    <span>Total</span>
                    <span>{fmtMoney(total, data.settings.currency)}</span>
                  </div>
                </div>
                <Button className="mt-3 w-full" disabled={cart.length === 0} onClick={placeOrder}>
                  Place order
                </Button>
              </Card>
            </div>
          </div>
        )}

        {tab === "order" && (
          <Card>
            <div className="mb-3 font-display font-bold">Track your order</div>
            {!myOrder ? (
              <Empty text="No tracked order yet — place an order and it will appear here with live status." />
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-display text-xl font-bold">{myOrder.ref}</div>
                    <div className="text-xs text-muted">
                      {fmtTime(myOrder.createdAt)} · {myOrder.type === "dine-in" ? `Dine-in${myOrder.table ? ` · ${myOrder.table}` : ""}` : "Takeaway"}
                    </div>
                  </div>
                  <OrderProgress status={myOrder.status} />
                </div>
                <div className="space-y-1 border-t border-line pt-3 text-sm">
                  {myOrder.lines.map((l) => (
                    <div key={`${myOrder.id}-${l.itemId}`} className="flex justify-between">
                      <span>
                        {l.qty}× {l.name}
                      </span>
                      <span>{fmtMoney(l.price * l.qty, data.settings.currency)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-line pt-2 font-bold">
                    <span>Total</span>
                    <span>{fmtMoney(myOrder.total, data.settings.currency)}</span>
                  </div>
                </div>
                {myOrder.status === "completed" && (
                  <div className="rounded-lg bg-success/10 p-3 text-center text-sm text-success">
                    Thanks for visiting Café Bloom — see you again! 🌸
                  </div>
                )}
                {myOrder.status === "cancelled" && (
                  <div className="rounded-lg bg-danger/10 p-3 text-center text-sm text-danger">
                    This order was cancelled. We hope to serve you next time!
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {tab === "resos" && (
          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <Card>
              <div className="mb-3 font-display font-bold">Book a table</div>
              <form onSubmit={bookTable} className="space-y-3">
                <Field label="Date">
                  <Input type="date" min={todayISO()} value={rDate} onChange={(e) => setRDate(e.target.value)} />
                </Field>
                <Field label="Time">
                  <Select value={rTime} onChange={(e) => setRTime(e.target.value)}>
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Guests">
                  <Select value={rGuests} onChange={(e) => setRGuests(Number(e.target.value))}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? "guest" : "guests"}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Phone">
                  <Input value={rPhone} onChange={(e) => setRPhone(e.target.value)} placeholder="+60 12-345 6789" />
                </Field>
                <Field label="Note (optional)">
                  <Textarea rows={2} value={rNote} onChange={(e) => setRNote(e.target.value)} placeholder="Birthday, window seat…" />
                </Field>
                <Button type="submit" className="w-full">
                  Request table
                </Button>
              </form>
            </Card>
            <div className="space-y-3">
              {myResos.length === 0 ? (
                <Empty text="No reservations yet — book a table for your next visit." />
              ) : (
                myResos.map((r) => (
                  <Card key={r.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold">
                        {r.date} · {r.time} · {r.guests} {r.guests === 1 ? "guest" : "guests"}
                      </div>
                      <Badge
                        tone={
                          r.status === "confirmed"
                            ? "accent"
                            : r.status === "seated" || r.status === "completed"
                              ? "success"
                              : r.status === "cancelled"
                                ? "danger"
                                : "terracotta"
                        }
                      >
                        {r.status}
                      </Badge>
                    </div>
                    {r.note && <div className="mt-1 text-xs text-muted">“{r.note}”</div>}
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {tab === "profile" && (
          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <Card>
              <div className="text-3xl">🙋</div>
              <div className="mt-2 font-display text-xl font-bold">{guestName}</div>
              <div className="text-xs text-muted">Guest account · Concept demo</div>
              <div className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Orders placed</span>
                  <span className="font-semibold">{myOrders.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Total spent</span>
                  <span className="font-semibold">{fmtMoney(totalSpent, data.settings.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Active reservations</span>
                  <span className="font-semibold">{myResos.filter((r) => r.status === "pending" || r.status === "confirmed").length}</span>
                </div>
              </div>
            </Card>
            <div className="space-y-3">
              <div className="font-display font-bold">Order history</div>
              {sortedOrders.length === 0 ? (
                <Empty text="No orders yet — your order history will show up here." />
              ) : (
                sortedOrders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-panel px-3 py-2 text-sm">
                    <span>
                      <span className="font-semibold">{o.ref}</span>
                      <span className="ml-2 text-xs text-muted">
                        {fmtTime(o.createdAt)} · {o.type === "dine-in" ? `Dine-in${o.table ? ` ${o.table}` : ""}` : "Takeaway"}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <Badge tone={ORDER_TONE[o.status]}>{ORDER_LABEL[o.status]}</Badge>
                      <span className="font-bold">{fmtMoney(o.total, data.settings.currency)}</span>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <Modal open={item !== null} onClose={() => setItem(null)} title={item?.name ?? ""}>
        {item && (
          <div className="space-y-4">
            <div className="text-4xl">{item.emoji}</div>
            <p className="text-sm text-muted">{item.desc}</p>
            {item.dietary.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {item.dietary.map((d) => (
                  <Badge key={d} tone="accent">
                    {d}
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" className="px-2" onClick={() => setQty((v) => Math.max(1, v - 1))}>
                  −
                </Button>
                <span className="w-8 text-center font-semibold">{qty}</span>
                <Button variant="outline" className="px-2" onClick={() => setQty((v) => v + 1)}>
                  +
                </Button>
              </div>
              <Button disabled={!item.available} onClick={addToCart}>
                Add · {fmtMoney(item.price * qty, data.settings.currency)}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}