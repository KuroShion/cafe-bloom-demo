export type Category = "Coffee" | "Cold Drinks" | "Brunch" | "Pastries" | "Desserts";
export type OrderStatus = "placed" | "preparing" | "ready" | "completed" | "cancelled";
export type OrderType = "dine-in" | "takeaway";
export type ReservationStatus = "pending" | "confirmed" | "seated" | "completed" | "cancelled";

export interface MenuItem {
  id: number;
  name: string;
  category: Category;
  desc: string;
  price: number;
  emoji: string;
  tag?: string;
  dietary: string[];
  available: boolean;
  popular: boolean;
}

export interface OrderLine {
  itemId: number;
  name: string;
  price: number;
  qty: number;
}

export interface Order {
  id: number;
  ref: string;
  lines: OrderLine[];
  subtotal: number;
  serviceFee: number;
  total: number;
  type: OrderType;
  customer: string;
  phone: string;
  note: string;
  table?: string;
  status: OrderStatus;
  createdAt: string;
  completedAt?: string;
}

export interface Reservation {
  id: number;
  customer: string;
  phone: string;
  guests: number;
  date: string;
  time: string;
  note: string;
  status: ReservationStatus;
  createdAt: string;
}

export interface InventoryItem {
  id: number;
  name: string;
  category: string;
  stock: number;
  unit: string;
  lowAt: number;
  cost: number;
}

export interface Staff {
  id: number;
  name: string;
  role: string;
  active: boolean;
}

export interface Settings {
  name: string;
  currency: string;
  serviceFeePct: number;
  dineInTables: number;
  ownerName: string;
  openingHours: string;
}

export interface AppData {
  menu: MenuItem[];
  orders: Order[];
  reservations: Reservation[];
  inventory: InventoryItem[];
  staff: Staff[];
  settings: Settings;
}

export type Session = { role: "owner" | "guest"; name: string } | null;

export const STORAGE_KEY = "cafe-bloom-data-v2";
export const SESSION_KEY = "cafe-bloom-session";
export const THEME_KEY = "cafe-bloom-theme";
export const CART_KEY = "cafe-bloom-cart";

export const CATEGORIES: Category[] = ["Coffee", "Cold Drinks", "Brunch", "Pastries", "Desserts"];

export const ORDER_STATUS_FLOW: { status: OrderStatus; label: string }[] = [
  { status: "placed", label: "Placed" },
  { status: "preparing", label: "Preparing" },
  { status: "ready", label: "Ready" },
  { status: "completed", label: "Completed" },
];

export const ORDER_LABEL: Record<OrderStatus, string> = {
  placed: "Placed",
  preparing: "Preparing",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const ORDER_TONE: Record<OrderStatus, "neutral" | "accent" | "terracotta" | "success" | "danger" | "muted"> = {
  placed: "terracotta",
  preparing: "accent",
  ready: "success",
  completed: "muted",
  cancelled: "danger",
};

export const RES_STATUS_LABEL: Record<ReservationStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  seated: "Seated",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const nextId = (arr: { id: number }[]) => Math.max(0, ...arr.map((x) => x.id)) + 1;

export const todayISO = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const dayOf = (iso: string) => iso.slice(0, 10);

export const fmtMoney = (n: number, cur = "RM") =>
  `${cur} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });

export const nextOrderRef = (orders: Order[]) => `#B-${1000 + nextId(orders)}`;

export const autoAdvanceOrder = (o: Order, now: number): Order => {
  if (o.status === "cancelled" || o.status === "completed") return o;
  const age = now - new Date(o.createdAt).getTime();
  if (o.status === "placed" && age > 20000) return { ...o, status: "preparing" };
  if (o.status === "preparing" && age > 45000) return { ...o, status: "ready" };
  if (o.status === "ready" && age > 75000) return { ...o, status: "completed", completedAt: new Date().toISOString() };
  return o;
};

const isoDaysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
};

const isoDaysFromNow = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
};

export function seedData(): AppData {
  const settings: Settings = {
    name: "Café Bloom",
    currency: "RM",
    serviceFeePct: 6,
    dineInTables: 12,
    ownerName: "Maya Chen",
    openingHours: "8:00 AM – 10:00 PM",
  };

  const menu: MenuItem[] = [
    { id: 1, name: "Signature Latte", category: "Coffee", desc: "Double shot espresso, velvety steamed milk.", price: 14, emoji: "☕", dietary: ["vegetarian"], available: true, popular: true },
    { id: 2, name: "Flat White", category: "Coffee", desc: "Ristretto shots under silky microfoam.", price: 15, emoji: "☕", dietary: ["vegetarian"], available: true, popular: false },
    { id: 3, name: "Honey Lavender Latte", category: "Coffee", desc: "Local honey, lavender syrup and oat milk.", price: 17, emoji: "🌸", tag: "Signature", dietary: ["vegetarian"], available: true, popular: true },
    { id: 4, name: "Cold Brew Tonic", category: "Coffee", desc: "Slow-steeped cold brew over sparkling tonic with orange zest.", price: 16, emoji: "🧊", dietary: ["vegan", "halal"], available: true, popular: false },
    { id: 5, name: "Iced Matcha", category: "Cold Drinks", desc: "Ceremonial matcha, oat milk and a touch of vanilla.", price: 17, emoji: "🍵", dietary: ["vegan", "halal"], available: true, popular: true },
    { id: 6, name: "Mango Passion Cooler", category: "Cold Drinks", desc: "Mango, passionfruit and sparkling water.", price: 15, emoji: "🥭", dietary: ["vegan", "halal"], available: true, popular: false },
    { id: 7, name: "Avocado Sourdough Toast", category: "Brunch", desc: "Smashed avocado, feta and chilli flakes on sourdough.", price: 22, emoji: "🥑", dietary: ["vegetarian"], available: true, popular: true },
    { id: 8, name: "Mushroom Truffle Pasta", category: "Brunch", desc: "Creamy truffle mushroom sauce with parmesan.", price: 26, emoji: "🍝", dietary: ["vegetarian"], available: true, popular: false },
    { id: 9, name: "Big Bloom Breakfast", category: "Brunch", desc: "Eggs any style, bacon, sausage, hash browns and toast.", price: 28, emoji: "🍳", dietary: [], available: true, popular: false },
    { id: 10, name: "Butter Croissant", category: "Pastries", desc: "Baked fresh every morning, 24 layers of butter.", price: 9, emoji: "🥐", dietary: ["vegetarian", "halal"], available: true, popular: true },
    { id: 11, name: "Cinnamon Roll", category: "Pastries", desc: "Soft dough, brown sugar and cream cheese glaze.", price: 11, emoji: "🍥", dietary: ["vegetarian"], available: true, popular: false },
    { id: 12, name: "Matcha Basque Cheesecake", category: "Desserts", desc: "Burnt Basque cheesecake with matcha cream.", price: 16, emoji: "🍰", dietary: ["vegetarian"], available: true, popular: true },
    { id: 13, name: "Basque Cheesecake", category: "Desserts", desc: "Caramelised top with a molten centre.", price: 15, emoji: "🍮", dietary: ["vegetarian", "halal"], available: true, popular: false },
    { id: 14, name: "Tiramisu Jar", category: "Desserts", desc: "Espresso-soaked ladyfingers, mascarpone and cocoa.", price: 15, emoji: "🍫", dietary: [], available: false, popular: false },
  ];

  const inventory: InventoryItem[] = [
    { id: 1, name: "Espresso beans", category: "Coffee", stock: 12, unit: "kg", lowAt: 5, cost: 68 },
    { id: 2, name: "Whole milk", category: "Coffee", stock: 24, unit: "L", lowAt: 10, cost: 7 },
    { id: 3, name: "Oat milk", category: "Coffee", stock: 4, unit: "L", lowAt: 8, cost: 11 },
    { id: 4, name: "Sourdough loaves", category: "Brunch", stock: 6, unit: "loaf", lowAt: 4, cost: 12 },
    { id: 5, name: "Free-range eggs", category: "Brunch", stock: 15, unit: "dozen", lowAt: 6, cost: 14 },
    { id: 6, name: "Avocados", category: "Brunch", stock: 9, unit: "pcs", lowAt: 8, cost: 4 },
    { id: 7, name: "Butter", category: "Pastries", stock: 3, unit: "kg", lowAt: 4, cost: 26 },
    { id: 8, name: "Matcha powder", category: "Desserts", stock: 1.5, unit: "kg", lowAt: 2, cost: 95 },
    { id: 9, name: "Local honey", category: "Coffee", stock: 7, unit: "bottle", lowAt: 3, cost: 18 },
    { id: 10, name: "Passionfruit", category: "Cold Drinks", stock: 2, unit: "kg", lowAt: 3, cost: 16 },
  ];

  const staff: Staff[] = [
    { id: 1, name: "Maya Chen", role: "Owner", active: true },
    { id: 2, name: "Arif Rahman", role: "Barista", active: true },
    { id: 3, name: "Siti Aminah", role: "Barista", active: true },
    { id: 4, name: "Wei Jian", role: "Kitchen", active: true },
    { id: 5, name: "Nora Lim", role: "Server", active: false },
  ];

  const reservations: Reservation[] = [
    { id: 1, customer: "Daniel Ong", phone: "+60 16-221 4098", guests: 4, date: todayISO(), time: "7:30 PM", note: "Window seat please", status: "confirmed", createdAt: isoDaysAgo(1) },
    { id: 2, customer: "Grace Lim", phone: "+60 12-887 2210", guests: 2, date: todayISO(), time: "12:30 PM", note: "", status: "seated", createdAt: isoDaysAgo(1) },
    { id: 3, customer: "Amira Zahra", phone: "+60 19-553 1209", guests: 6, date: isoDaysFromNow(1).slice(0, 10), time: "6:00 PM", note: "Birthday celebration", status: "pending", createdAt: isoDaysAgo(0) },
    { id: 4, customer: "Lily Tan", phone: "+60 12-998 7711", guests: 2, date: isoDaysAgo(1).slice(0, 10), time: "8:00 PM", note: "", status: "completed", createdAt: isoDaysAgo(2) },
    { id: 5, customer: "Kenji Wong", phone: "+60 17-332 8845", guests: 3, date: isoDaysAgo(3).slice(0, 10), time: "1:30 PM", note: "High chair needed", status: "cancelled", createdAt: isoDaysAgo(4) },
  ];

  const orders: Order[] = [];
  const mk = (minsAgo: number, type: OrderType, status: OrderStatus, customer: string, lines: OrderLine[], extra?: { phone?: string; note?: string; table?: string }) => {
    const id = orders.length + 1;
    const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
    const serviceFee = type === "dine-in" ? Math.round(subtotal * settings.serviceFeePct) / 100 : 0;
    const createdAt = new Date(Date.now() - minsAgo * 60000).toISOString();
    orders.push({
      id,
      ref: `#B-${1000 + id}`,
      lines,
      subtotal,
      serviceFee,
      total: Math.round((subtotal + serviceFee) * 100) / 100,
      type,
      status,
      customer,
      phone: extra?.phone ?? "+60 12-345 6789",
      note: extra?.note ?? "",
      table: extra?.table,
      createdAt,
      completedAt: status === "completed" ? createdAt : undefined,
    });
  };

  mk(60 * 24 * 6 + 30, "dine-in", "completed", "Lily Tan", [
    { itemId: 1, name: "Signature Latte", price: 14, qty: 2 },
    { itemId: 10, name: "Butter Croissant", price: 9, qty: 2 },
  ], { table: "T4" });
  mk(60 * 24 * 6, "takeaway", "completed", "Aiman Hakim", [
    { itemId: 5, name: "Iced Matcha", price: 17, qty: 1 },
    { itemId: 12, name: "Matcha Basque Cheesecake", price: 16, qty: 1 },
  ]);
  mk(60 * 24 * 5 + 45, "dine-in", "completed", "Priya Nair", [
    { itemId: 9, name: "Big Bloom Breakfast", price: 28, qty: 1 },
    { itemId: 4, name: "Cold Brew Tonic", price: 16, qty: 1 },
  ], { table: "T6" });
  mk(60 * 24 * 5, "takeaway", "completed", "Daniel Ong", [
    { itemId: 3, name: "Honey Lavender Latte", price: 17, qty: 1 },
  ]);
  mk(60 * 24 * 4 + 20, "dine-in", "completed", "Sofia Rahman", [
    { itemId: 8, name: "Mushroom Truffle Pasta", price: 26, qty: 1 },
    { itemId: 7, name: "Avocado Sourdough Toast", price: 22, qty: 1 },
    { itemId: 13, name: "Basque Cheesecake", price: 15, qty: 2 },
  ], { table: "T2" });
  mk(60 * 24 * 4, "takeaway", "completed", "Kenji Wong", [
    { itemId: 2, name: "Flat White", price: 15, qty: 2 },
    { itemId: 11, name: "Cinnamon Roll", price: 11, qty: 2 },
  ]);
  mk(60 * 24 * 3 + 10, "dine-in", "completed", "Amira Zahra", [
    { itemId: 6, name: "Mango Passion Cooler", price: 15, qty: 2 },
  ], { table: "T8" });
  mk(60 * 24 * 2 + 50, "dine-in", "completed", "Lily Tan", [
    { itemId: 12, name: "Matcha Basque Cheesecake", price: 16, qty: 1 },
    { itemId: 1, name: "Signature Latte", price: 14, qty: 1 },
  ], { table: "T5" });
  mk(60 * 24 * 2, "takeaway", "completed", "Farid Iskandar", [
    { itemId: 7, name: "Avocado Sourdough Toast", price: 22, qty: 1 },
  ]);
  mk(60 * 24 + 40, "dine-in", "completed", "Grace Lim", [
    { itemId: 9, name: "Big Bloom Breakfast", price: 28, qty: 1 },
    { itemId: 4, name: "Cold Brew Tonic", price: 16, qty: 1 },
  ], { table: "T3" });
  mk(60 * 24, "takeaway", "completed", "Haziq Danish", [
    { itemId: 10, name: "Butter Croissant", price: 9, qty: 3 },
    { itemId: 2, name: "Flat White", price: 15, qty: 1 },
  ]);
  mk(300, "dine-in", "completed", "Lily Tan", [
    { itemId: 1, name: "Signature Latte", price: 14, qty: 1 },
    { itemId: 10, name: "Butter Croissant", price: 9, qty: 1 },
  ], { table: "T1" });
  mk(150, "dine-in", "completed", "Megan Lee", [
    { itemId: 7, name: "Avocado Sourdough Toast", price: 22, qty: 1 },
    { itemId: 3, name: "Honey Lavender Latte", price: 17, qty: 1 },
  ], { table: "T7" });
  mk(60, "takeaway", "ready", "Aiman Hakim", [
    { itemId: 5, name: "Iced Matcha", price: 17, qty: 2 },
  ]);
  mk(25, "dine-in", "preparing", "Rafiq Emir", [
    { itemId: 8, name: "Mushroom Truffle Pasta", price: 26, qty: 1 },
    { itemId: 6, name: "Mango Passion Cooler", price: 15, qty: 1 },
  ], { table: "T9" });
  mk(8, "takeaway", "placed", "Siti Hawa", [
    { itemId: 12, name: "Matcha Basque Cheesecake", price: 16, qty: 2 },
  ]);

  return { menu, orders, reservations, inventory, staff, settings };
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AppData;
  } catch {
    /* ignore */
  }
  return seedData();
}

export function saveData(d: AppData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  } catch {
    /* ignore */
  }
}

export function resetData(): AppData {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CART_KEY);
  } catch {
    /* ignore */
  }
  return seedData();
}

export function loadSession(): Session {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw) as Session;
  } catch {
    /* ignore */
  }
  return null;
}

export function saveSession(s: Session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function exportCSV(filename: string, rows: (string | number)[][]) {
  const csv =
    "\uFEFF" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}